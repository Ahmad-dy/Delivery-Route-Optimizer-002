import * as XLSX from 'xlsx';
import { IExcelParser, RawExcelSheet } from '../../application/ports/IExcelParser';
import { ValidationError } from '../../domain/errors/DomainErrors';
import type { ExcelWorkerRequest, ExcelWorkerResponse, ExcelWorkerErrorResponse } from './excel.worker';

export class XlsxExcelParserAdapter implements IExcelParser {
  public static readonly MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  public static readonly MAX_ROW_LIMIT = 600;

  public async parse(fileBuffer: ArrayBuffer, fileName: string, fileSize: number): Promise<RawExcelSheet> {
    // 1. Validate File Extension
    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      throw new ValidationError(
        `Unsupported file type '${fileName}'. Please upload an .xlsx or .xls file.`,
        'errors.invalidFile',
        { fileName }
      );
    }

    // 2. Validate File Size
    if (fileSize > XlsxExcelParserAdapter.MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 2 MB.`,
        'errors.fileTooLarge',
        { fileSize, maxAllowedBytes: XlsxExcelParserAdapter.MAX_FILE_SIZE_BYTES }
      );
    }

    // 3. If in browser environment supporting Web Workers, execute in non-blocking Worker
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      return this.parseInWorker(fileBuffer, fileName, fileSize);
    }

    // 4. Fallback to direct synchronous parsing (for unit tests and SSR/Node)
    return this.parseDirect(fileBuffer, fileName, fileSize);
  }

  private parseInWorker(fileBuffer: ArrayBuffer, fileName: string, fileSize: number): Promise<RawExcelSheet> {
    return new Promise<RawExcelSheet>((resolve, reject) => {
      let worker: Worker | null = null;
      try {
        worker = new Worker(new URL('./excel.worker.ts', import.meta.url), { type: 'module' });
      } catch (workerInitErr) {
        console.warn('Web Worker initialization failed, falling back to direct parse:', workerInitErr);
        this.parseDirect(fileBuffer, fileName, fileSize).then(resolve).catch(reject);
        return;
      }

      const cleanup = () => {
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };

      worker.onmessage = (e: MessageEvent<ExcelWorkerResponse>) => {
        cleanup();
        const data = e.data as ExcelWorkerResponse;
        if (data.success === true) {
          resolve({
            fileName: data.result.fileName,
            fileSize: data.result.fileSize,
            headers: Object.freeze(data.result.headers),
            rows: Object.freeze(data.result.rows),
            totalRowCount: data.result.totalRowCount
          });
        } else {
          const errData = data as ExcelWorkerErrorResponse;
          reject(new ValidationError(errData.error, errData.messageKey || 'errors.invalidFile', errData.details));
        }
      };

      worker.onerror = (err) => {
        cleanup();
        reject(new ValidationError(
          `Excel worker parsing error: ${err.message || 'Worker failure'}`,
          'errors.invalidFile',
          { fileName }
        ));
      };

      const request: ExcelWorkerRequest = {
        fileBuffer,
        fileName,
        fileSize,
        maxFileSize: XlsxExcelParserAdapter.MAX_FILE_SIZE_BYTES,
        maxRowLimit: XlsxExcelParserAdapter.MAX_ROW_LIMIT
      };

      try {
        worker.postMessage(request);
      } catch (postErr) {
        cleanup();
        reject(new ValidationError(
          `Failed to dispatch file to worker: ${postErr instanceof Error ? postErr.message : String(postErr)}`,
          'errors.invalidFile',
          { fileName }
        ));
      }
    });
  }

  private async parseDirect(fileBuffer: ArrayBuffer, fileName: string, fileSize: number): Promise<RawExcelSheet> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, {
        type: 'array',
        cellDates: false,
        raw: true
      });
    } catch (err) {
      throw new ValidationError(
        `Failed to parse Excel workbook: ${err instanceof Error ? err.message : String(err)}`,
        'errors.invalidFile',
        { fileName }
      );
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new ValidationError(
        'Excel workbook is empty and contains no sheets.',
        'errors.invalidFile',
        { fileName }
      );
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new ValidationError(
        'Worksheet data could not be read.',
        'errors.invalidFile',
        { fileName }
      );
    }

    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as unknown[][];

    if (!rawMatrix || rawMatrix.length === 0) {
      throw new ValidationError(
        'The selected Excel sheet contains no rows or header information.',
        'errors.invalidFile',
        { fileName }
      );
    }

    const rawHeaderRow = rawMatrix[0] || [];
    const headers = rawHeaderRow
      .map(h => (h !== undefined && h !== null ? String(h).trim() : ''))
      .filter(h => h.length > 0);

    if (headers.length === 0) {
      throw new ValidationError(
        'The Excel sheet header row is empty.',
        'errors.importHeaderError',
        { fileName }
      );
    }

    const dataMatrix = rawMatrix.slice(1);
    const rows: { rowNumber: number; raw: Record<string, unknown> }[] = [];

    for (let i = 0; i < dataMatrix.length; i++) {
      const rowArray = dataMatrix[i];
      const excelRowNumber = i + 2;

      const isBlank = !rowArray || rowArray.every(cell => {
        if (cell === undefined || cell === null) return true;
        if (typeof cell === 'string' && cell.trim() === '') return true;
        return false;
      });

      if (isBlank) {
        continue;
      }

      const rowObject: Record<string, unknown> = {};
      for (let c = 0; c < headers.length; c++) {
        const headerName = headers[c];
        rowObject[headerName] = rowArray[c] !== undefined ? rowArray[c] : '';
      }

      rows.push({
        rowNumber: excelRowNumber,
        raw: rowObject
      });
    }

    if (rows.length > XlsxExcelParserAdapter.MAX_ROW_LIMIT) {
      throw new ValidationError(
        `File contains ${rows.length} rows, which exceeds the maximum limit of ${XlsxExcelParserAdapter.MAX_ROW_LIMIT} rows.`,
        'errors.rowLimitExceeded',
        { rowCount: rows.length, maxAllowedRows: XlsxExcelParserAdapter.MAX_ROW_LIMIT }
      );
    }

    return {
      fileName,
      fileSize,
      headers: Object.freeze(headers),
      rows: Object.freeze(rows),
      totalRowCount: rows.length
    };
  }
}
