import React from 'react';
import {
  Users,
  Truck,
  Weight,
  MapPin,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowUpRight,
  FileSpreadsheet,
  Upload,
  Route,
  ClipboardCheck,
  History as HistoryIcon,
  BarChart3
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useBuyerStore } from '../../state/buyerStore';
import { useDriverStore } from '../../state/driverStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useOperationStore } from '../../state/operationStore';
import { CapacityDomainService } from '../../core/domain/services/CapacityDomainService';
import { NavTab } from '../components/Navbar';

interface DashboardViewProps {
  messages: Messages;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ messages, onNavigate }) => {
  const { buyers } = useBuyerStore();
  const { drivers } = useDriverStore();
  const { settings } = useSettingsStore();
  const { confirmedSession } = useOperationStore();

  const activeDrivers = drivers.filter((d) => d.active);
  const nominalFleetCapacity = CapacityDomainService.calculateFleetNominalCapacity(drivers);
  const maxFleetCapacity = CapacityDomainService.calculateFleetMaxAllowedCapacity(drivers);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-blue-900/40 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{messages.dashboard.stage2NoticeTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {messages.dashboard.welcome}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {messages.dashboard.stage2NoticeBody}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              id="dash-import-cta-btn"
              onClick={() => onNavigate('import')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/40 transition flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>{messages.import.title}</span>
            </button>
            <button
              id="dash-routing-cta-btn"
              onClick={() => onNavigate('routing')}
              className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-blue-600/50 shadow-md shadow-blue-950/40 transition flex items-center gap-2"
            >
              <Route className="h-4 w-4 text-blue-300" />
              <span>{messages.routing.title}</span>
            </button>
            <button
              id="dash-optimization-cta-btn"
              onClick={() => onNavigate('optimization')}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-900/40 transition flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-purple-200" />
              <span>{messages.navigation.optimization}</span>
            </button>
            <button
              id="dash-distribution-cta-btn"
              onClick={() => onNavigate('distribution')}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/40 transition flex items-center gap-2"
            >
              <ClipboardCheck className="h-4 w-4 text-emerald-200" />
              <span>{messages.navigation.distribution}</span>
            </button>
            <button
              id="dash-history-cta-btn"
              onClick={() => onNavigate('history')}
              className="px-4 py-2.5 bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-bold rounded-xl border border-blue-500/40 shadow-md transition flex items-center gap-2"
            >
              <HistoryIcon className="h-4 w-4 text-blue-200" />
              <span>{messages.navigation.history}</span>
            </button>
            <button
              id="dash-reports-cta-btn"
              onClick={() => onNavigate('reports')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4 text-indigo-200" />
              <span>{messages.navigation.reports}</span>
            </button>
            <button
              id="dash-buyers-cta-btn"
              onClick={() => onNavigate('buyers')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-blue-400" />
              <span>{messages.buyers.title}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Operational Session Status Banner (If Confirmed) */}
      {confirmedSession && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>جلسة استيراد مؤكدة ونشطة في الذاكرة</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-mono">
                  {confirmedSession.fileName}
                </span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {confirmedSession.summary.validLists} قوائم شحن | {confirmedSession.summary.uniqueBuyers} نقاط توصيل (Stops) |{' '}
                {confirmedSession.summary.totalWeightKg.toLocaleString()} كغم
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('import')}
            className="px-4 py-2 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl transition"
          >
            عرض التفاصيل
          </button>
        </div>
      )}

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Registered Buyers Card */}
        <div
          id="stat-card-buyers"
          onClick={() => onNavigate('buyers')}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {messages.dashboard.quickStats.registeredBuyers}
            </span>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{buyers.length}</span>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <span>{messages.common.actions}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Active Drivers Card */}
        <div
          id="stat-card-drivers"
          onClick={() => onNavigate('drivers')}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {messages.dashboard.quickStats.activeDrivers}
            </span>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold text-slate-900">{activeDrivers.length}</span>
              <span className="text-xs text-slate-400 font-medium mr-2 rtl:mr-0 rtl:ml-2">
                / {drivers.length}
              </span>
            </div>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span>{messages.common.actions}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Fleet Nominal Capacity */}
        <div
          id="stat-card-nominal-capacity"
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {messages.dashboard.quickStats.fleetNominalCapacity}
            </span>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Weight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {nominalFleetCapacity.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">{messages.common.kg}</span>
          </div>
        </div>

        {/* Fleet Maximum Capacity (110%) */}
        <div
          id="stat-card-max-capacity"
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {messages.dashboard.quickStats.fleetMaxCapacity}
            </span>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-900">
              {maxFleetCapacity.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-indigo-600">{messages.common.kg} (+10%)</span>
          </div>
        </div>
      </div>

      {/* Central Depot & Architecture Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Depot Card */}
        <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-slate-900">{messages.settings.depotTitle}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">{messages.settings.depotSubtitle}</p>
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">{messages.settings.depotName}:</span>
                <span className="font-medium text-slate-900">{settings.depot.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">{messages.settings.depotLatitude}:</span>
                <span className="font-mono text-xs text-slate-800">{settings.depot.latitude}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">{messages.settings.depotLongitude}:</span>
                <span className="font-mono text-xs text-slate-800">{settings.depot.longitude}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="mt-4 w-full py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            {messages.settings.title}
          </button>
        </div>

        {/* Architectural Pillars Card */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-1">المعايير التشغيلية المعتمدة (Stage 3 Ready)</h3>
          <p className="text-xs text-slate-500 mb-5">
            البنية المعيارية الصارمة تضمن أعلى درجات الدقة والامتثال لقيود التشغيل الواقعية.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">استيراد ومعالجة ملفات Excel الذكي</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مطابقة مرنة للعناوين (عربي وإنجليزي)، وفحص حدود الحجم (2MB) والصفوف (600).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">نقطة توقف فيزيائية موحدة (Stop Atomicity)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  تجميع كافة قوائم الشحن للمشتري في Stop واحد غير قابل للتجزئة بين عدة سائقين.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">التحقق اللحظي من المشترين مع Caching</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مطابقة سريعة للأكواد مع قاعدة بيانات المشترين الرسمية دون استهلاك قراءات مكررة.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">تقييم الحمولة الفردية (110%)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  رصد النقاط المتضخمة (Oversized) مع تنبيه بصري أحمر فوري دون تقسيم النقطة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
