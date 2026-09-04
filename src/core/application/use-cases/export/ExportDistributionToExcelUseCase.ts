import * as XLSX from 'xlsx';
import { ApprovedDistribution } from '../../../domain/entities/ApprovedDistribution';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { IAuditRepository } from '../../ports/IAuditRepository';
import { AuditEvent } from '../../../domain/entities/AuditEvent';
import { ExportFailedError } from '../../../domain/errors/DomainErrors';

export interface ExportExcelRequest {
  readonly distribution: ApprovedDistribution;
  readonly userId?: string;
  readonly userEmail?: string;
}

export interface ExportExcelResult {
  readonly filename: string;
  readonly buffer: Uint8Array;
}

interface StopExportRow {
  readonly 'السائق (Driver)': string;
  readonly 'التسلسل (Sequence)': number;
  readonly 'رمز العميل (Buyer Code)': string;
  readonly 'اسم العميل (Buyer Name)': string;
  readonly 'أرقام القوائم (List Numbers)': string;
  readonly 'الوزن (Weight kg)': string;
  readonly 'خط العرض (Latitude)': number;
  readonly 'خط الطول (Longitude)': number;
  readonly 'المسافة من المحطة السابقة': string;
  readonly 'الوقت من المحطة السابقة': string;
}

interface UnassignedExportRow {
  readonly 'رمز العميل (Buyer Code)': string;
  readonly 'اسم العميل (Buyer Name)': string;
  readonly 'أرقام القوائم (List Numbers)': string;
  readonly 'الوزن (Weight kg)': string;
  readonly 'سبب عدم التعيين (Reason)': string;
}

function formatStopListNumbers(stop: DeliveryStop): string {
  if (Array.isArray(stop.lists) && stop.lists.length > 0) {
    return stop.lists
      .map(l => (typeof l === 'string' ? l : l.listNumber))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export class ExportDistributionToExcelUseCase {
  constructor(private readonly auditRepository?: IAuditRepository) {}

  public async execute(request: ExportExcelRequest): Promise<ExportExcelResult> {
    const { distribution, userId, userEmail } = request;

    try {
      const workbook = XLSX.utils.book_new();

      // ----------------------------------------------------
      // Sheet 1 — Summary
      // ----------------------------------------------------
      const totalDistanceKm = Math.round((distribution.metrics.finalDistanceMeters / 1000) * 100) / 100;
      const totalDurationMin = Math.round((distribution.metrics.totalDurationSeconds / 60) * 10) / 10;
      const totalWeightKg = distribution.routes.reduce((sum, r) => sum + r.totalWeightKg, 0);

      const summaryData = [
        { Field: 'معرف التوزيع (Distribution ID)', Value: distribution.distributionId },
        { Field: 'رقم المراجعة (Revision)', Value: distribution.revision },
        { Field: 'تاريخ الإنشاء (Created At)', Value: distribution.createdAt },
        { Field: 'تاريخ ووقت الاعتماد (Approved At)', Value: distribution.approvedAt },
        { Field: 'معتمد من قبل (Approved By)', Value: distribution.approvedBy },
        {
          Field: 'المستودع الرئيسي (Depot)',
          Value: `${distribution.depot.name || 'المستودع المركزي'} (${distribution.depot.latitude}, ${distribution.depot.longitude})`
        },
        { Field: 'الوزن الإجمالي المحمّل (Total Delivered Weight)', Value: `${Math.round(totalWeightKg * 100) / 100} kg` },
        { Field: 'إجمالي المسافة المقطوعة (Total Distance)', Value: `${totalDistanceKm} km (${distribution.metrics.finalDistanceMeters} m)` },
        { Field: 'إجمالي زمن القيادة (Total Driving Duration)', Value: `${totalDurationMin} min (${distribution.metrics.totalDurationSeconds} s)` },
        { Field: 'عدد السائقين النشطين (Drivers Used)', Value: distribution.routes.length },
        { Field: 'عدد المحطات الموزعة (Stops Scheduled)', Value: distribution.stops.length },
        { Field: 'عدد المحطات غير المسندة (Unassigned Stops)', Value: distribution.unassigned.length },
        { Field: 'مؤشر كفاءة التوزيع (Objective Score)', Value: distribution.optimizationScore }
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData, { header: ['Field', 'Value'] });
      // Set column widths
      summaryWs['!cols'] = [{ wch: 40 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

      // ----------------------------------------------------
      // Sheet 2 — Routes
      // ----------------------------------------------------
      const routesData = distribution.routes.map(r => {
        const driverMeta = distribution.drivers.find(d => d.driverId === r.driverId);
        const driverName = driverMeta?.driverName || r.driverId;
        const capacityKg = driverMeta?.maximumLoadKg ?? 0;
        const operationalCapacityKg = Math.round(capacityKg * 1.1 * 100) / 100; // 110% hard capacity limit

        return {
          'السائق (Driver)': driverName,
          'معرف السائق (Driver ID)': r.driverId,
          'السعة الاسمية (Capacity kg)': `${capacityKg} kg`,
          'السعة القصوى (Operational Capacity 110%)': `${operationalCapacityKg} kg`,
          'الوزن المحمّل (Assigned Weight kg)': `${r.totalWeightKg} kg`,
          'نسبة الإشغال (Utilization %)': `${r.utilizationPercent}%`,
          'عدد المحطات (Stops Count)': r.orderedStops.length,
          'المسافة (Distance)': `${Math.round((r.totalDistanceMeters / 1000) * 100) / 100} km`,
          'المدة (Duration)': `${Math.round((r.totalDurationSeconds / 60) * 10) / 10} min`
        };
      });

      const routesWs = XLSX.utils.json_to_sheet(routesData);
      routesWs['!cols'] = [
        { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 25 },
        { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(workbook, routesWs, 'Routes');

      // ----------------------------------------------------
      // Sheet 3 — Stops
      // ----------------------------------------------------
      const stopsData: StopExportRow[] = [];

      for (const route of distribution.routes) {
        const driverMeta = distribution.drivers.find(d => d.driverId === route.driverId);
        const driverName = driverMeta?.driverName || route.driverId;

        route.orderedStops.forEach((stop, index) => {
          const listNumbers = formatStopListNumbers(stop);
          const stopWeight = stop.totalWeightKg;
          const leg = route.legs?.[index];
          const distFromPrev = leg ? `${Math.round((leg.distanceMeters / 1000) * 100) / 100} km` : '-';
          const durFromPrev = leg ? `${Math.round((leg.durationSeconds / 60) * 10) / 10} min` : '-';

          stopsData.push({
            'السائق (Driver)': driverName,
            'التسلسل (Sequence)': index + 1,
            'رمز العميل (Buyer Code)': stop.buyerCode,
            'اسم العميل (Buyer Name)': stop.buyerName,
            'أرقام القوائم (List Numbers)': listNumbers,
            'الوزن (Weight kg)': `${stopWeight} kg`,
            'خط العرض (Latitude)': stop.latitude,
            'خط الطول (Longitude)': stop.longitude,
            'المسافة من المحطة السابقة': distFromPrev,
            'الوقت من المحطة السابقة': durFromPrev
          });
        });
      }

      const stopsWs = XLSX.utils.json_to_sheet(stopsData);
      stopsWs['!cols'] = [
        { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 30 },
        { wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(workbook, stopsWs, 'Stops');

      // ----------------------------------------------------
      // Sheet 4 — Unassigned
      // ----------------------------------------------------
      const unassignedData: UnassignedExportRow[] = distribution.unassigned.map(u => {
        const listNumbers = formatStopListNumbers(u);
        const unassignedWeight = u.totalWeightKg;
        return {
          'رمز العميل (Buyer Code)': u.buyerCode,
          'اسم العميل (Buyer Name)': u.buyerName,
          'أرقام القوائم (List Numbers)': listNumbers,
          'الوزن (Weight kg)': `${unassignedWeight} kg`,
          'سبب عدم التعيين (Reason)': 'تجاوز سعة أسطول السائقين النشطين (Fleet Capacity Exceeded)'
        };
      });

      const unassignedWs = XLSX.utils.json_to_sheet(unassignedData);
      unassignedWs['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 32 }, { wch: 16 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(workbook, unassignedWs, 'Unassigned');

      // Generate binary workbook output
      const rawBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const buffer = new Uint8Array(rawBuffer);

      // Deterministic Filename format: distribution-revision-{revision}-{YYYY-MM-DD}.xlsx
      const datePart = distribution.approvedAt.split('T')[0];
      const filename = `distribution-revision-${distribution.revision}-${datePart}.xlsx`;

      // Record Audit Event
      if (this.auditRepository && userId) {
        try {
          const auditEvent = AuditEvent.createNew(
            'DISTRIBUTION_EXPORTED_EXCEL',
            userId,
            userEmail,
            distribution.distributionId,
            distribution.revision,
            {
              filename,
              format: 'excel',
              routesCount: distribution.routes.length,
              stopsCount: stopsData.length,
              unassignedCount: unassignedData.length
            }
          );
          await this.auditRepository.logEvent(auditEvent);
        } catch (auditErr) {
          console.warn('Audit log failed for Excel export:', auditErr);
        }
      }

      return { filename, buffer };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error during Excel workbook construction';
      throw new ExportFailedError('excel', message);
    }
  }
}
