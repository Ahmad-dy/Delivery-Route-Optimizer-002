import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { XlsxExcelParserAdapter } from '../../core/infrastructure/adapters/XlsxExcelParserAdapter';
import { ValidationError } from '../../core/domain/errors/DomainErrors';

function createMockWorkbookBuffer(headers: string[], rows: (string | number)[][], format: 'xlsx' | 'xls' = 'xlsx'): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, {
    bookType: format,
    type: 'array'
  });
  return buffer;
}

describe('XlsxExcelParserAdapter', () => {
  const parser = new XlsxExcelParserAdapter();

  it('should successfully parse valid XLSX files', async () => {
    const headers = ['رقم القائمة', 'كود الزبون', 'اسم الزبون', 'الوزن (كغم)'];
    const rows = [
      ['L-001', 'B-101', 'محل الهدى', 150],
      ['L-002', 'B-102', 'سوبرماركت دجلة', 280]
    ];
    const buffer = createMockWorkbookBuffer(headers, rows, 'xlsx');

    const result = await parser.parse(buffer, 'deliveries.xlsx', buffer.byteLength);

    expect(result.fileName).toBe('deliveries.xlsx');
    expect(result.headers).toEqual(headers);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRowCount).toBe(2);
    expect(result.rows[0].raw['رقم القائمة']).toBe('L-001');
    expect(result.rows[0].raw['كود الزبون']).toBe('B-101');
    expect(result.rows[0].raw['الوزن (كغم)']).toBe(150);
  });

  it('should successfully parse valid XLS legacy files', async () => {
    const headers = ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'];
    const rows = [
      ['L-101', 'B-001', 'Store Alpha', 85]
    ];
    const buffer = createMockWorkbookBuffer(headers, rows, 'xls');

    const result = await parser.parse(buffer, 'legacy.xls', buffer.byteLength);

    expect(result.fileName).toBe('legacy.xls');
    expect(result.headers).toEqual(headers);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].raw['List Number']).toBe('L-101');
  });

  it('should reject unsupported file extensions (.csv, .pdf)', async () => {
    const buffer = new ArrayBuffer(50);
    await expect(parser.parse(buffer, 'data.csv', 50)).rejects.toThrow(ValidationError);
    await expect(parser.parse(buffer, 'doc.pdf', 50)).rejects.toThrow(ValidationError);
  });

  it('should reject files exceeding 2 MB file size limit', async () => {
    const excessSize = 2 * 1024 * 1024 + 1024; // > 2 MB
    const buffer = new ArrayBuffer(100);

    await expect(parser.parse(buffer, 'large.xlsx', excessSize)).rejects.toThrow(ValidationError);
  });

  it('should reject files exceeding 600 data rows limit', async () => {
    const headers = ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'];
    const rows: (string | number)[][] = [];
    for (let i = 1; i <= 605; i++) {
      rows.push([`L-${i}`, `B-${i}`, `Store ${i}`, 10]);
    }
    const buffer = createMockWorkbookBuffer(headers, rows, 'xlsx');

    await expect(parser.parse(buffer, 'over_limit.xlsx', buffer.byteLength)).rejects.toThrow(ValidationError);
  });

  it('should ignore completely blank rows in excel files', async () => {
    const headers = ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'];
    const rows: (string | number)[][] = [
      ['L-001', 'B-001', 'Shop 1', 50],
      ['', '', '', ''], // Blank row
      ['L-002', 'B-002', 'Shop 2', 75]
    ];
    const buffer = createMockWorkbookBuffer(headers, rows, 'xlsx');

    const result = await parser.parse(buffer, 'with_blanks.xlsx', buffer.byteLength);

    expect(result.rows).toHaveLength(2);
    expect(result.totalRowCount).toBe(2);
  });
});
