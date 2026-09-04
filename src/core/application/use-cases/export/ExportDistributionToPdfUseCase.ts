import { ApprovedDistribution } from '../../../domain/entities/ApprovedDistribution';
import { IAuditRepository } from '../../ports/IAuditRepository';
import { AuditEvent } from '../../../domain/entities/AuditEvent';
import { ExportFailedError } from '../../../domain/errors/DomainErrors';

export interface ExportPdfRequest {
  readonly distribution: ApprovedDistribution;
  readonly userId?: string;
  readonly userEmail?: string;
}

export interface ExportPdfResult {
  readonly filename: string;
  readonly htmlContent: string;
  readonly print: () => void;
}

export class ExportDistributionToPdfUseCase {
  constructor(private readonly auditRepository?: IAuditRepository) {}

  public async execute(request: ExportPdfRequest): Promise<ExportPdfResult> {
    const { distribution, userId, userEmail } = request;

    try {
      const datePart = distribution.approvedAt.split('T')[0];
      const filename = `distribution-revision-${distribution.revision}-${datePart}.pdf`;

      const totalDistanceKm = Math.round((distribution.metrics.finalDistanceMeters / 1000) * 100) / 100;
      const totalDurationMin = Math.round((distribution.metrics.totalDurationSeconds / 60) * 10) / 10;
      const totalWeightKg = Math.round(
        distribution.routes.reduce((sum, r) => sum + r.totalWeightKg, 0) * 100
      ) / 100;

      const formattedApprovedDate = new Date(distribution.approvedAt).toLocaleString('ar-SA', {
        dateStyle: 'full',
        timeStyle: 'medium'
      });

      // Build pure clean HTML document formatted for A4 RTL printing with Header/Footer
      const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير اعتماد التوزيع - مراجعة ${distribution.revision}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
      @bottom-center {
        content: "صفحة " counter(page) " من " counter(pages);
        font-family: 'Cairo', sans-serif;
        font-size: 9pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    body {
      background-color: #ffffff;
      color: #0f172a;
      font-size: 10pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      direction: rtl;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .header-bar {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 18pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }

    .header-sub {
      font-size: 9pt;
      color: #64748b;
      margin-top: 4px;
    }

    .badge-revision {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11pt;
      font-weight: 700;
    }

    .section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1e3a8a;
      border-right: 4px solid #2563eb;
      padding-right: 8px;
      margin: 16px 0 10px 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .summary-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
    }

    .summary-label {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 2px;
    }

    .summary-value {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9pt;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: right;
    }

    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .footer-note {
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- PAGE 1: EXECUTIVE SUMMARY -->
  <div class="header-bar">
    <div>
      <h1 class="header-title">تقرير اعتماد خطة التوزيع (Executive Summary)</h1>
      <div class="header-sub">منظومة تحسين مسارات التوصيل والتوزيع الذكي • Delivery Route Optimizer</div>
    </div>
    <div class="badge-revision">مراجعة معتمدة #${distribution.revision}</div>
  </div>

  <div class="section-title">بيانات الاعتماد والملخص العام</div>
  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-label">معرف التوزيع الفريد</div>
      <div class="summary-value" style="font-family: monospace; font-size: 9pt;">${distribution.distributionId}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">تاريخ ووقت الاعتماد</div>
      <div class="summary-value">${formattedApprovedDate}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">معتمد من قبل</div>
      <div class="summary-value">${distribution.approvedBy}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">المستودع الرئيسي (Depot)</div>
      <div class="summary-value">${distribution.depot.name || 'المستودع المركزي'}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">إجمالي الوزن المحمّل</div>
      <div class="summary-value">${totalWeightKg} كجم</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">إجمالي مسافة الرحلات</div>
      <div class="summary-value">${totalDistanceKm} كم (${distribution.metrics.finalDistanceMeters.toLocaleString('ar-SA')} متر)</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">إجمالي زمن القيادة المتوقع</div>
      <div class="summary-value">${totalDurationMin} دقيقة (${distribution.metrics.totalDurationSeconds} ثانية)</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">عدد السائقين النشطين المشاركين</div>
      <div class="summary-value">${distribution.routes.length} سائقين</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">عدد المحطات الموزعة المسندة</div>
      <div class="summary-value">${distribution.stops.length} محطة</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">عدد المحطات غير المسندة</div>
      <div class="summary-value" style="color: ${distribution.unassigned.length > 0 ? '#b91c1c' : '#15803d'};">
        ${distribution.unassigned.length} محطة
      </div>
    </div>
    <div class="summary-item" style="grid-column: span 2;">
      <div class="summary-label">مؤشر كفاءة التحسين الإجمالي (Composite Objective Score)</div>
      <div class="summary-value">${distribution.optimizationScore} (المسافة: 70% • اتزان الحمولة: 30%)</div>
    </div>
  </div>

  <div class="section-title">ملخص أسطول السائقين والمسارات</div>
  <table>
    <thead>
      <tr>
        <th>السائق</th>
        <th>السعة القصوى (110%)</th>
        <th>الوزن المسند</th>
        <th>نسبة الإشغال</th>
        <th>المحطات</th>
        <th>المسافة الكلية</th>
        <th>زمن القيادة</th>
      </tr>
    </thead>
    <tbody>
      ${distribution.routes.map(r => {
        const driverMeta = distribution.drivers.find(d => d.driverId === r.driverId);
        const name = driverMeta?.driverName || r.driverId;
        const cap = driverMeta?.maximumLoadKg || 0;
        const opCap = Math.round(cap * 1.1 * 100) / 100;
        return `
        <tr>
          <td><strong>${name}</strong></td>
          <td>${opCap} كجم</td>
          <td>${r.totalWeightKg} كجم</td>
          <td><span style="color: ${r.utilizationPercent > 100 ? '#b91c1c' : '#047857'}; font-weight: bold;">${r.utilizationPercent}%</span></td>
          <td>${r.orderedStops.length}</td>
          <td>${Math.round((r.totalDistanceMeters / 1000) * 100) / 100} كم</td>
          <td>${Math.round((r.totalDurationSeconds / 60) * 10) / 10} دقيقة</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer-note">
    <span>نظام تحسين مسارات التوزيع • تقرير معتمد نهائي وغير قابل للتعديل</span>
    <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</span>
  </div>

  <div class="page-break"></div>

  <!-- SUBSEQUENT PAGES: DETAILED STOPS PER DRIVER -->
  ${distribution.routes.map((r, rIdx) => {
    const driverMeta = distribution.drivers.find(d => d.driverId === r.driverId);
    const driverName = driverMeta?.driverName || r.driverId;

    return `
    <div style="margin-bottom: 25px;">
      <div class="header-bar">
        <div>
          <h2 class="header-title" style="font-size: 15pt;">مسار السائق: ${driverName}</h2>
          <div class="header-sub">
            الوزن: ${r.totalWeightKg} كجم • نسبة الإشغال: ${r.utilizationPercent}% • المسافة: ${Math.round((r.totalDistanceMeters / 1000) * 100) / 100} كم • الزمن: ${Math.round((r.totalDurationSeconds / 60) * 10) / 10} دقيقة
          </div>
        </div>
        <div class="badge-revision">مسار #${rIdx + 1}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">التسلسل</th>
            <th style="width: 90px;">رمز العميل</th>
            <th>اسم العميل</th>
            <th>أرقام القوائم والشحنات</th>
            <th style="width: 80px;">الوزن</th>
            <th style="width: 90px;">المسافة من السابقة</th>
            <th style="width: 80px;">الزمن المتوقع</th>
          </tr>
        </thead>
        <tbody>
          ${r.orderedStops.map((stop, sIdx) => {
            const leg = r.legs?.[sIdx];
            const dist = leg ? `${Math.round((leg.distanceMeters / 1000) * 100) / 100} كم` : '-';
            const dur = leg ? `${Math.round((leg.durationSeconds / 60) * 10) / 10} دقيقة` : '-';
            const listStr = Array.isArray(stop.lists) && stop.lists.length > 0
              ? stop.lists.map(l => (typeof l === 'string' ? l : l.listNumber)).filter(Boolean).join(', ')
              : '';
            const stopWeight = stop.totalWeightKg;
            return `
            <tr>
              <td style="text-align: center; font-weight: bold;">${sIdx + 1}</td>
              <td style="font-family: monospace;">${stop.buyerCode}</td>
              <td>${stop.buyerName}</td>
              <td><span style="font-family: monospace; font-size: 8.5pt;">${listStr}</span></td>
              <td>${stopWeight} كجم</td>
              <td>${dist}</td>
              <td>${dur}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${rIdx < distribution.routes.length - 1 ? '<div class="page-break"></div>' : ''}
    </div>
    `;
  }).join('')}

</body>
</html>
      `;

      // Function to trigger native print / PDF save
      const print = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          // Give browser time to load fonts before triggering print
          setTimeout(() => {
            printWindow.print();
          }, 300);
        }
      };

      // Record Audit Event
      if (this.auditRepository && userId) {
        try {
          const auditEvent = AuditEvent.createNew(
            'DISTRIBUTION_EXPORTED_PDF',
            userId,
            userEmail,
            distribution.distributionId,
            distribution.revision,
            {
              filename,
              format: 'pdf',
              routesCount: distribution.routes.length,
              stopsCount: distribution.stops.length
            }
          );
          await this.auditRepository.logEvent(auditEvent);
        } catch (auditErr) {
          console.warn('Audit log failed for PDF export:', auditErr);
        }
      }

      return { filename, htmlContent, print };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error during PDF document preparation';
      throw new ExportFailedError('pdf', message);
    }
  }
}
