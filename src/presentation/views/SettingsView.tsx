import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useSettingsStore } from '../../state/settingsStore';

interface SettingsViewProps {
  messages: Messages;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ messages }) => {
  const {
    settings,
    isSaving,
    saveSuccess,
    errorMessage,
    updateSettings,
    clearError,
    resetSaveSuccess
  } = useSettingsStore();

  const [depotName, setDepotName] = useState(settings.depot.name);
  const [depotLat, setDepotLat] = useState(settings.depot.latitude.toString());
  const [depotLng, setDepotLng] = useState(settings.depot.longitude.toString());
  const [depotAddress, setDepotAddress] = useState(settings.depot.address || '');
  const [companyName, setCompanyName] = useState(settings.companyName);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setDepotName(settings.depot.name);
    setDepotLat(settings.depot.latitude.toString());
    setDepotLng(settings.depot.longitude.toString());
    setDepotAddress(settings.depot.address || '');
    setCompanyName(settings.companyName);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    resetSaveSuccess();

    const latNum = parseFloat(depotLat);
    const lngNum = parseFloat(depotLng);

    if (!depotName.trim()) {
      setFormError('اسم المستودع مطلوب');
      return;
    }
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      setFormError(messages.validation.invalidLatitude);
      return;
    }
    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setFormError(messages.validation.invalidLongitude);
      return;
    }

    try {
      await updateSettings({
        depot: {
          name: depotName.trim(),
          latitude: latNum,
          longitude: lngNum,
          address: depotAddress.trim() || undefined
        },
        optimizationConfig: settings.optimizationConfig.toJSON(),
        companyName: companyName.trim()
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : messages.errors.general);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-slate-700" />
          <span>{messages.settings.title}</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">{messages.settings.subtitle}</p>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{messages.settings.savedSuccess}</span>
        </div>
      )}

      {/* Error Notification */}
      {(errorMessage || formError) && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{formError || errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Central Depot Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{messages.settings.depotTitle}</h3>
              <p className="text-xs text-slate-500">{messages.settings.depotSubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {messages.settings.depotName} <span className="text-red-500">*</span>
              </label>
              <input
                id="depot-name-input"
                type="text"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {messages.settings.depotLatitude} <span className="text-red-500">*</span>
              </label>
              <input
                id="depot-lat-input"
                type="number"
                step="any"
                value={depotLat}
                onChange={(e) => setDepotLat(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {messages.settings.depotLongitude} <span className="text-red-500">*</span>
              </label>
              <input
                id="depot-lng-input"
                type="number"
                step="any"
                value={depotLng}
                onChange={(e) => setDepotLng(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {messages.settings.depotAddress}
              </label>
              <input
                id="depot-address-input"
                type="text"
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
                placeholder="بغداد - الكرخ - حي العامل"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Optimization 70/30 Parameters Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {messages.settings.optimizationTitle}
              </h3>
              <p className="text-xs text-slate-500">{messages.settings.optimizationSubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">
                {messages.settings.distanceWeight}
              </span>
              <span className="text-xl font-bold text-blue-700 font-mono">0.70</span>
              <span className="text-xs text-slate-400 block mt-1">(70% تقليل المسافة الكلية)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">
                {messages.settings.loadBalanceWeight}
              </span>
              <span className="text-xl font-bold text-indigo-700 font-mono">0.30</span>
              <span className="text-xs text-slate-400 block mt-1">(30% موازنة الحمولات)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">
                {messages.settings.capacityTolerance}
              </span>
              <span className="text-xl font-bold text-emerald-700 font-mono">10%</span>
              <span className="text-xs text-slate-400 block mt-1">(سقف أقصى 110% لكل مركبة)</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            id="save-settings-btn"
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? messages.common.saving : messages.common.save}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
