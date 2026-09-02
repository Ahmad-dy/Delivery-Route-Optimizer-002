export interface RawRowData {
  readonly [key: string]: unknown;
}

export interface RawExcelSheet {
  readonly fileName: string;
  readonly fileSize: number;
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly rowNumber: number; // 1-indexed (Excel row number)
    readonly raw: RawRowData;
  }[];
  readonly totalRowCount: number;
}

export interface IExcelParser {
  /**
   * Parses an Excel buffer (.xlsx, .xls) into normalized raw rows and header names.
   * Client-side only. Does not access network or Firebase.
   */
  parse(fileBuffer: ArrayBuffer, fileName: string, fileSize: number): Promise<RawExcelSheet>;
}
