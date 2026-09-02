import { IExcelParser } from '../../ports/IExcelParser';
import { IBuyerLookupService } from '../../ports/IBuyerLookupService';
import { DriverRepository } from '../../ports/DriverRepository';
import { ExcelHeaderMatcher } from '../../../domain/services/ExcelHeaderMatcher';
import { StopAggregationService } from '../../../domain/services/StopAggregationService';
import { CapacityValidationService } from '../../../domain/services/CapacityValidationService';
import { DeliveryList } from '../../../domain/entities/DeliveryList';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Buyer } from '../../../domain/entities/Buyer';
import { Driver } from '../../../domain/entities/Driver';

export interface ImportRowError {
  readonly rowNumber: number;
  readonly field: 'listNumber' | 'buyerCode' | 'buyerName' | 'weight' | 'file' | 'header' | 'gps' | 'general';
  readonly value?: string | number | null;
  readonly errorCode: string;
  readonly messageKey: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ImportRowWarning {
  readonly rowNumber?: number;
  readonly stopId?: string;
  readonly buyerCode?: string;
  readonly warningCode: 'BUYER_NAME_MISMATCH' | 'NO_ACTIVE_DRIVERS' | 'OVERSIZED_STOP' | 'GENERAL_WARNING';
  readonly messageKey: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ImportSummary {
  readonly totalRows: number;
  readonly validLists: number;
  readonly invalidRows: number;
  readonly uniqueBuyers: number;
  readonly totalWeightKg: number;
  readonly oversizedStops: number;
  readonly missingBuyers: number;
  readonly nameMismatchWarnings: number;
  readonly maxActiveDriverCapacityKg: number;
}

export interface ParsedDeliveryListRow {
  readonly rowNumber: number;
  readonly listNumber: string;
  readonly buyerCode: string;
  readonly excelBuyerName: string;
  readonly masterBuyerName?: string;
  readonly weightKg: number;
  readonly isValid: boolean;
  readonly errors: readonly ImportRowError[];
  readonly warnings: readonly ImportRowWarning[];
}

export interface AggregatedDeliveryStop {
  readonly stopId: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lists: readonly DeliveryList[];
  readonly totalWeightKg: number;
  readonly isOversized: boolean;
  readonly hasValidGps: boolean;
  readonly warnings: readonly ImportRowWarning[];
}

export interface ExcelImportResult {
  readonly status: 'READY' | 'BLOCKING_ERRORS' | 'FAILED';
  readonly fileName: string;
  readonly fileSize: number;
  readonly rowsRead: number;
  readonly validRows: number;
  readonly invalidRows: number;
  readonly rawRows: readonly ParsedDeliveryListRow[];
  readonly lists: readonly DeliveryList[];
  readonly stops: readonly AggregatedDeliveryStop[];
  readonly errors: readonly ImportRowError[];
  readonly warnings: readonly ImportRowWarning[];
  readonly summary: ImportSummary;
}

export class ImportDeliveryExcelUseCase {
  private readonly excelParser: IExcelParser;
  private readonly buyerLookupService: IBuyerLookupService;
  private readonly driverRepo: DriverRepository;

  constructor(
    excelParser: IExcelParser,
    buyerLookupService: IBuyerLookupService,
    driverRepo: DriverRepository
  ) {
    this.excelParser = excelParser;
    this.buyerLookupService = buyerLookupService;
    this.driverRepo = driverRepo;
  }

  public async execute(fileBuffer: ArrayBuffer, fileName: string, fileSize: number): Promise<ExcelImportResult> {
    const allErrors: ImportRowError[] = [];
    const allWarnings: ImportRowWarning[] = [];

    // Step 1: Parse Raw Excel Worksheet
    let parsedSheet;
    try {
      parsedSheet = await this.excelParser.parse(fileBuffer, fileName, fileSize);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLarge = msg.includes('limit') || msg.includes('exceeds');
      const errorCode = isLarge ? (msg.includes('rows') ? 'ROW_LIMIT_EXCEEDED' : 'FILE_TOO_LARGE') : 'INVALID_FILE';
      const messageKey = isLarge ? (msg.includes('rows') ? 'errors.rowLimitExceeded' : 'errors.fileTooLarge') : 'errors.invalidFile';

      allErrors.push({
        rowNumber: 0,
        field: 'file',
        errorCode,
        messageKey,
        message: msg
      });

      return {
        status: 'FAILED',
        fileName,
        fileSize,
        rowsRead: 0,
        validRows: 0,
        invalidRows: 0,
        rawRows: [],
        lists: [],
        stops: [],
        errors: Object.freeze(allErrors),
        warnings: Object.freeze(allWarnings),
        summary: {
          totalRows: 0,
          validLists: 0,
          invalidRows: 0,
          uniqueBuyers: 0,
          totalWeightKg: 0,
          oversizedStops: 0,
          missingBuyers: 0,
          nameMismatchWarnings: 0,
          maxActiveDriverCapacityKg: 0
        }
      };
    }

    // Step 2: Match & Validate Required Headers
    const headerMatch = ExcelHeaderMatcher.matchHeaders(parsedSheet.headers);
    if (!headerMatch.matched) {
      allErrors.push({
        rowNumber: 1,
        field: 'header',
        errorCode: 'IMPORT_HEADER_ERROR',
        messageKey: 'errors.importHeaderError',
        message: `Missing required Excel column(s): ${headerMatch.missingHeaders.join(', ')}. Required: List Number, Buyer Code, Buyer Name, Weight.`,
        details: { missingHeaders: headerMatch.missingHeaders, availableHeaders: parsedSheet.headers }
      });

      return {
        status: 'BLOCKING_ERRORS',
        fileName,
        fileSize,
        rowsRead: parsedSheet.totalRowCount,
        validRows: 0,
        invalidRows: parsedSheet.totalRowCount,
        rawRows: [],
        lists: [],
        stops: [],
        errors: Object.freeze(allErrors),
        warnings: Object.freeze(allWarnings),
        summary: {
          totalRows: parsedSheet.totalRowCount,
          validLists: 0,
          invalidRows: parsedSheet.totalRowCount,
          uniqueBuyers: 0,
          totalWeightKg: 0,
          oversizedStops: 0,
          missingBuyers: 0,
          nameMismatchWarnings: 0,
          maxActiveDriverCapacityKg: 0
        }
      };
    }

    const { listNumberHeader, buyerCodeHeader, buyerNameHeader, weightHeader } = headerMatch.matched;

    // Step 3: First Pass - Extract row fields and detect syntax / type errors
    interface IntermediateRow {
      rowNumber: number;
      rawListNumber: string;
      rawBuyerCode: string;
      rawBuyerName: string;
      rawWeight: unknown;
      parsedWeightKg: number | null;
      errors: ImportRowError[];
    }

    const intermediateRows: IntermediateRow[] = [];
    const listNumberOccurrences = new Map<string, number[]>();

    for (const rowItem of parsedSheet.rows) {
      const rowNum = rowItem.rowNumber;
      const raw = rowItem.raw;
      const rowErrors: ImportRowError[] = [];

      // Extract raw values
      const rawListNumber = raw[listNumberHeader] !== undefined ? String(raw[listNumberHeader]).trim() : '';
      const rawBuyerCode = raw[buyerCodeHeader] !== undefined ? String(raw[buyerCodeHeader]).trim() : '';
      const rawBuyerName = raw[buyerNameHeader] !== undefined ? String(raw[buyerNameHeader]).trim() : '';
      const rawWeight = raw[weightHeader];

      // Validate List Number Presence
      if (!rawListNumber) {
        rowErrors.push({
          rowNumber: rowNum,
          field: 'listNumber',
          value: '',
          errorCode: 'MISSING_LIST_NUMBER',
          messageKey: 'errors.missingListNumber',
          message: `Row #${rowNum}: Delivery List Number is missing or empty.`
        });
      } else {
        const existing = listNumberOccurrences.get(rawListNumber);
        if (existing) {
          existing.push(rowNum);
        } else {
          listNumberOccurrences.set(rawListNumber, [rowNum]);
        }
      }

      // Validate Buyer Code Presence
      if (!rawBuyerCode) {
        rowErrors.push({
          rowNumber: rowNum,
          field: 'buyerCode',
          value: '',
          errorCode: 'MISSING_BUYER_CODE',
          messageKey: 'errors.missingBuyerCode',
          message: `Row #${rowNum}: Buyer Code is missing or empty.`
        });
      }

      // Validate Buyer Name Presence
      if (!rawBuyerName) {
        rowErrors.push({
          rowNumber: rowNum,
          field: 'buyerName',
          value: '',
          errorCode: 'MISSING_BUYER_NAME',
          messageKey: 'validation.buyerNameRequired',
          message: `Row #${rowNum}: Buyer Name is missing or empty.`
        });
      }

      // Parse & Validate Weight
      const parsedWeight = this.parseWeight(rawWeight);
      if (parsedWeight === null || parsedWeight <= 0) {
        rowErrors.push({
          rowNumber: rowNum,
          field: 'weight',
          value: rawWeight !== undefined && rawWeight !== null ? String(rawWeight) : '',
          errorCode: 'INVALID_WEIGHT',
          messageKey: 'errors.invalidWeight',
          message: `Row #${rowNum}: Weight must be a positive number greater than 0 kg. Received: '${rawWeight}'`
        });
      }

      intermediateRows.push({
        rowNumber: rowNum,
        rawListNumber,
        rawBuyerCode,
        rawBuyerName,
        rawWeight,
        parsedWeightKg: parsedWeight,
        errors: rowErrors
      });
    }

    // Step 4: Validate List Number Uniqueness
    for (const [listNumber, rows] of listNumberOccurrences.entries()) {
      if (rows.length > 1) {
        const rowsStr = rows.join(' و ');
        const rowsEngStr = rows.join(', ');
        for (const rowNum of rows) {
          const rowObj = intermediateRows.find(r => r.rowNumber === rowNum);
          if (rowObj) {
            rowObj.errors.push({
              rowNumber: rowNum,
              field: 'listNumber',
              value: listNumber,
              errorCode: 'DUPLICATE_LIST_NUMBER',
              messageKey: 'errors.duplicateListNumberWithRows',
              message: `رقم القائمة ${listNumber} مكرر في الصفوف ${rowsStr}. (List #${listNumber} duplicated in rows ${rowsEngStr})`,
              details: { listNumber, rows }
            });
          }
        }
      }
    }

    // Step 5: Extract unique valid buyer codes and query Firebase Buyer master data
    const buyerCodesToLookup = Array.from(
      new Set(
        intermediateRows
          .filter(r => r.rawBuyerCode.length > 0)
          .map(r => r.rawBuyerCode)
      )
    );

    let lookupMap: ReadonlyMap<string, Buyer> = new Map();
    let isFirebaseUnavailable = false;

    try {
      const lookupResult = await this.buyerLookupService.lookupBuyers(buyerCodesToLookup);
      lookupMap = lookupResult.buyers;
    } catch (err) {
      isFirebaseUnavailable = true;
      allErrors.push({
        rowNumber: 0,
        field: 'general',
        errorCode: 'FIREBASE_UNAVAILABLE',
        messageKey: 'errors.firebaseUnavailable',
        message: 'Could not connect to Firebase database to verify registered buyers.'
      });
    }

    // Step 6: Second Pass - Buyer matching, GPS verification & Name discrepancy checks
    const parsedRows: ParsedDeliveryListRow[] = [];
    const validDeliveryLists: DeliveryList[] = [];
    let missingBuyersCount = 0;
    let nameMismatchCount = 0;

    for (const row of intermediateRows) {
      const rowErrors = [...row.errors];
      const rowWarnings: ImportRowWarning[] = [];
      let masterBuyerName: string | undefined = undefined;

      if (!isFirebaseUnavailable && row.rawBuyerCode) {
        const matchedBuyer = lookupMap.get(row.rawBuyerCode);

        if (!matchedBuyer) {
          missingBuyersCount++;
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'buyerCode',
            value: row.rawBuyerCode,
            errorCode: 'BUYER_NOT_FOUND',
            messageKey: 'errors.buyerNotFound',
            message: `كود المشتري ${row.rawBuyerCode} غير موجود في قاعدة بيانات المشترين. (Buyer code ${row.rawBuyerCode} not found in database)`
          });
        } else {
          masterBuyerName = matchedBuyer.buyerName;

          // Validate Buyer GPS Coordinates
          const lat = matchedBuyer.latitude;
          const lng = matchedBuyer.longitude;
          const isValidGps =
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180 &&
            !(lat === 0 && lng === 0);

          if (!isValidGps) {
            rowErrors.push({
              rowNumber: row.rowNumber,
              field: 'gps',
              value: `${lat}, ${lng}`,
              errorCode: 'MISSING_BUYER_LOCATION',
              messageKey: 'errors.missingBuyerLocation',
              message: `المشتري ${row.rawBuyerCode} لا يمتلك إحداثيات GPS صالحة في قاعدة البيانات. (Buyer ${row.rawBuyerCode} has missing/invalid GPS)`
            });
          }

          // Check for Buyer Name Mismatch (Warning Only, does NOT block confirmation)
          const normExcelName = row.rawBuyerName.trim().toLowerCase();
          const normMasterName = matchedBuyer.buyerName.trim().toLowerCase();

          if (normExcelName !== normMasterName) {
            nameMismatchCount++;
            const warning: ImportRowWarning = {
              rowNumber: row.rowNumber,
              buyerCode: row.rawBuyerCode,
              warningCode: 'BUYER_NAME_MISMATCH',
              messageKey: 'warnings.buyerNameMismatch',
              message: `اسم المشتري في الملف (${row.rawBuyerName}) يختلف عن الاسم المسجل رسمياً (${matchedBuyer.buyerName}).`,
              details: { excelName: row.rawBuyerName, masterName: matchedBuyer.buyerName }
            };
            rowWarnings.push(warning);
            allWarnings.push(warning);
          }
        }
      }

      // Collect row errors
      for (const err of rowErrors) {
        allErrors.push(err);
      }

      const isValid = rowErrors.length === 0;

      if (isValid && row.parsedWeightKg !== null && row.parsedWeightKg > 0) {
        try {
          const listEntity = new DeliveryList(
            row.rawListNumber,
            row.rawBuyerCode,
            masterBuyerName || row.rawBuyerName,
            row.parsedWeightKg
          );
          validDeliveryLists.push(listEntity);
        } catch (entityErr) {
          // Invariant failure
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'general',
            errorCode: 'VALIDATION_ERROR',
            messageKey: 'errors.validation',
            message: entityErr instanceof Error ? entityErr.message : String(entityErr)
          });
        }
      }

      parsedRows.push({
        rowNumber: row.rowNumber,
        listNumber: row.rawListNumber,
        buyerCode: row.rawBuyerCode,
        excelBuyerName: row.rawBuyerName,
        masterBuyerName,
        weightKg: row.parsedWeightKg || 0,
        isValid: rowErrors.length === 0,
        errors: Object.freeze(rowErrors),
        warnings: Object.freeze(rowWarnings)
      });
    }

    // Step 7: Aggregate Valid Lists into Atomic Physical Delivery Stops
    const rawStops = StopAggregationService.aggregate(validDeliveryLists, lookupMap);

    // Step 8: Evaluate Capacity Feasibility against Active Fleet Drivers (+10% operational buffer)
    let allDrivers: readonly Driver[] = [];
    try {
      allDrivers = await this.driverRepo.getAll();
    } catch {
      allDrivers = [];
    }

    const fleetEvaluation = CapacityValidationService.evaluateFleetCapacity(allDrivers);

    if (!fleetEvaluation.hasActiveDrivers) {
      allWarnings.push({
        warningCode: 'NO_ACTIVE_DRIVERS',
        messageKey: 'warnings.noActiveDrivers',
        message: 'لا يوجد سائقون نشطون حالياً في الأسطول لتقييم الحمولات القصوى.'
      });
    }

    const aggregatedStops: AggregatedDeliveryStop[] = [];
    let oversizedStopsCount = 0;

    for (const stop of rawStops) {
      const stopWarnings: ImportRowWarning[] = [];
      const isOversized = fleetEvaluation.hasActiveDrivers
        ? CapacityValidationService.isStopOversized(stop.totalWeightKg, fleetEvaluation.maxActiveDriverCapacityKg)
        : false;

      if (isOversized) {
        oversizedStopsCount++;
        const oversizedWarning: ImportRowWarning = {
          stopId: stop.stopId,
          buyerCode: stop.buyerCode,
          warningCode: 'OVERSIZED_STOP',
          messageKey: 'warnings.oversizedStop',
          message: `حمولة النقطة (${stop.totalWeightKg} كغم) تتجاوز الحد الأقصى لأي سائق نشط (${fleetEvaluation.maxActiveDriverCapacityKg} كغم).`,
          details: {
            totalWeightKg: stop.totalWeightKg,
            maxAllowedCapacityKg: fleetEvaluation.maxActiveDriverCapacityKg
          }
        };
        stopWarnings.push(oversizedWarning);
        allWarnings.push(oversizedWarning);
      }

      aggregatedStops.push({
        stopId: stop.stopId,
        buyerCode: stop.buyerCode,
        buyerName: stop.buyerName,
        latitude: stop.latitude,
        longitude: stop.longitude,
        lists: stop.lists,
        totalWeightKg: stop.totalWeightKg,
        isOversized,
        hasValidGps: stop.hasValidGps,
        warnings: Object.freeze(stopWarnings)
      });
    }

    const validRowsCount = parsedRows.filter(r => r.isValid).length;
    const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;
    const totalWeightKg = validDeliveryLists.reduce((acc, l) => acc + l.weightKg, 0);

    const summary: ImportSummary = {
      totalRows: parsedRows.length,
      validLists: validDeliveryLists.length,
      invalidRows: invalidRowsCount,
      uniqueBuyers: aggregatedStops.length,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      oversizedStops: oversizedStopsCount,
      missingBuyers: missingBuyersCount,
      nameMismatchWarnings: nameMismatchCount,
      maxActiveDriverCapacityKg: fleetEvaluation.maxActiveDriverCapacityKg
    };

    const status = allErrors.length > 0 ? 'BLOCKING_ERRORS' : 'READY';

    return {
      status,
      fileName,
      fileSize,
      rowsRead: parsedRows.length,
      validRows: validRowsCount,
      invalidRows: invalidRowsCount,
      rawRows: Object.freeze(parsedRows),
      lists: Object.freeze(validDeliveryLists),
      stops: Object.freeze(aggregatedStops),
      errors: Object.freeze(allErrors),
      warnings: Object.freeze(allWarnings),
      summary
    };
  }

  /**
   * Robust numeric weight parser supporting thousands commas, strings, and standard decimals.
   */
  private parseWeight(val: unknown): number | null {
    if (val === undefined || val === null || val === '') return null;

    if (typeof val === 'number') {
      if (Number.isNaN(val) || !Number.isFinite(val)) return null;
      return Math.round(val * 100) / 100;
    }

    if (typeof val === 'string') {
      const cleaned = val.trim().replace(/,/g, '');
      const num = Number(cleaned);
      if (Number.isNaN(num) || !Number.isFinite(num)) return null;
      return Math.round(num * 100) / 100;
    }

    return null;
  }
}
