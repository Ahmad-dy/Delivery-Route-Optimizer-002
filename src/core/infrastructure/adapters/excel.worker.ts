import * as XLSX from 'xlsx';

export interface ExcelWorkerRequest {
  readonly fileBuffer: ArrayBuffer;
  readonly fileName: string;
  readonly fileSize: number;
  readonly maxFileSize: number;
  readonly maxRowLimit: number;
}

export interface ExcelWorkerSuccessResponse {
  readonly success: true;
  readonly result: {
    readonly fileName: string;
    readonly fileSize: number;
    readonly headers: readonly string[];
    readonly rows: readonly { readonly rowNumber: number; readonly raw: Record<string, unknown> }[];
    readonly totalRowCount: number;
  };
}

export interface ExcelWorkerErrorResponse {
  readonly success: false;
  readonly error: string;
  readonly messageKey?: string;
  readonly details?: Record<string, unknown>;
}

export type ExcelWorkerResponse = ExcelWorkerSuccessResponse | ExcelWorkerErrorResponse;

self.onmessage = (e: MessageEvent<ExcelWorkerRequest>) => {
  const { fileBuffer, fileName, fileSize, maxFileSize, maxRowLimit } = e.data;

  try {
    // 1. Validate File Size
    if (fileSize > maxFileSize) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 2 MB.`,
        messageKey: 'errors.fileTooLarge',
        details: { fileSize, maxAllowedBytes: maxFileSize }
      };
      self.postMessage(response);
      return;
    }

    // 2. Parse Workbook with XLSX
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, {
        type: 'array',
        cellDates: false,
        raw: true
      });
    } catch (err) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: `Failed to parse Excel workbook: ${err instanceof Error ? err.message : String(err)}`,
        messageKey: 'errors.invalidFile',
        details: { fileName }
      };
      self.postMessage(response);
      return;
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: 'Excel workbook is empty and contains no sheets.',
        messageKey: 'errors.invalidFile',
        details: { fileName }
      };
      self.postMessage(response);
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: 'Worksheet data could not be read.',
        messageKey: 'errors.invalidFile',
        details: { fileName }
      };
      self.postMessage(response);
      return;
    }

    // 3. Convert sheet to JSON rows as array of arrays
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as unknown[][];

    if (!rawMatrix || rawMatrix.length === 0) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: 'The selected Excel sheet contains no rows or header information.',
        messageKey: 'errors.invalidFile',
        details: { fileName }
      };
      self.postMessage(response);
      return;
    }

    // First row is headers
    const rawHeaderRow = rawMatrix[0] || [];
    const headers = rawHeaderRow
      .map(h => (h !== undefined && h !== null ? String(h).trim() : ''))
      .filter(h => h.length > 0);

    if (headers.length === 0) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: 'The Excel sheet header row is empty.',
        messageKey: 'errors.importHeaderError',
        details: { fileName }
      };
      self.postMessage(response);
      return;
    }

    // Process data rows
    const dataMatrix = rawMatrix.slice(1);
    const rows: { rowNumber: number; raw: Record<string, unknown> }[] = [];

    for (let i = 0; i < dataMatrix.length; i++) {
      const rowArray = dataMatrix[i];
      const excelRowNumber = i + 2; // Row 1 is header, data starts at row 2

      // Check if row is completely empty
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

    // 4. Validate Row Limit (Max 600 rows)
    if (rows.length > maxRowLimit) {
      const response: ExcelWorkerErrorResponse = {
        success: false,
        error: `File contains ${rows.length} rows, which exceeds the maximum limit of ${maxRowLimit} rows.`,
        messageKey: 'errors.rowLimitExceeded',
        details: { rowCount: rows.length, maxAllowedRows: maxRowLimit }
      };
      self.postMessage(response);
      return;
    }

    const response: ExcelWorkerSuccessResponse = {
      success: true,
      result: {
        fileName,
        fileSize,
        headers,
        rows,
        totalRowCount: rows.length
      }
    };
    self.postMessage(response);
  } catch (err) {
    const response: ExcelWorkerErrorResponse = {
      success: false,
      error: `Unexpected error in Excel worker: ${err instanceof Error ? err.message : String(err)}`,
      messageKey: 'errors.invalidFile',
      details: { fileName }
    };
    self.postMessage(response);
  }
};
