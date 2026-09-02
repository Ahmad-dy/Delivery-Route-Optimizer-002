import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  Truck,
  Scale,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  FileCheck,
  Info
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useOperationStore } from '../../state/operationStore';
import { ParsedDeliveryListRow, AggregatedDeliveryStop } from '../../core/application/use-cases/import/ImportDeliveryExcelUseCase';

interface ImportViewProps {
  messages: Messages;
}

export const ImportView: React.FC<ImportViewProps> = ({ messages }) => {
  const {
    currentImportResult,
    confirmedSession,
    status,
    isProcessing,
    errorMessage,
    importExcelFile,
    confirmImport,
    cancelImport,
    clearConfirmedSession
  } = useOperationStore();

  const [activeSubTab, setActiveSubTab] = useState<'lists' | 'stops' | 'errors' | 'warnings'>('lists');
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processSelectedFile(file);
      // Reset input value so re-selecting the same file name triggers change
      e.target.value = '';
    }
  };

  const processSelectedFile = (file: File) => {
    // If there is an active unconfirmed import, ask for replacement confirmation
    if (currentImportResult && status === 'READY') {
      setPendingFile(file);
      setShowReplaceModal(true);
      return;
    }

    executeFileImport(file);
  };

  const executeFileImport = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await importExcelFile(buffer, file.name, file.size);
      setActiveSubTab('lists');
    } catch {
      // Error handled by store
    }
  };

  const handleConfirmReplace = () => {
    if (pendingFile) {
      executeFileImport(pendingFile);
      setPendingFile(null);
    }
    setShowReplaceModal(false);
  };

  const handleCancelReplace = () => {
    setPendingFile(null);
    setShowReplaceModal(false);
  };

  const hasBlockingErrors = currentImportResult && currentImportResult.errors.length > 0;
  const isReadyToConfirm = currentImportResult && currentImportResult.status === 'READY' && !hasBlockingErrors;
  const hasOversizedStops = currentImportResult && currentImportResult.summary.oversizedStops > 0;

  // Filtered rows
  const filteredLists = (currentImportResult?.rawRows || []).filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.listNumber.toLowerCase().includes(q) ||
      r.buyerCode.toLowerCase().includes(q) ||
      r.excelBuyerName.toLowerCase().includes(q) ||
      (r.masterBuyerName && r.masterBuyerName.toLowerCase().includes(q))
    );
  });

  const filteredStops = (currentImportResult?.stops || []).filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.stopId.toLowerCase().includes(q) ||
      s.buyerCode.toLowerCase().includes(q) ||
      s.buyerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            <span>{messages.import.title}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {messages.import.subtitle}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {confirmedSession && !currentImportResult && (
            <button
              id="clear-session-btn"
              onClick={clearConfirmedSession}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{messages.import.actions.clearSession}</span>
            </button>
          )}

          <button
            id="browse-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs shadow-blue-600/20 transition flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>{messages.import.selectFile}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
        </div>
      </div>

      {/* Confirmed Active Session Banner */}
      {confirmedSession && !currentImportResult && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>{messages.import.alerts.sessionConfirmed}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-mono">
                  {confirmedSession.fileName}
                </span>
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                {confirmedSession.summary.validLists} {messages.import.validLists} |{' '}
                {confirmedSession.summary.uniqueBuyers} {messages.import.uniqueBuyers} |{' '}
                {confirmedSession.summary.totalWeightKg.toLocaleString()} {messages.common.kg}
              </p>
            </div>
          </div>
          <button
            id="reimport-from-confirmed-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{messages.import.actions.reimport}</span>
          </button>
        </div>
      )}

      {/* File Upload Dropzone (When no import in progress or user wants to upload) */}
      {!currentImportResult && (
        <div
          id="excel-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/80 scale-[1.005]'
              : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isDragOver ? messages.import.dropzoneActive : messages.import.dropzoneTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {messages.import.dropzoneSubtitle}
            </p>

            <div className="mt-5 flex items-center gap-3 text-xs text-slate-400 font-medium bg-slate-100/80 px-3.5 py-1.5 rounded-full border border-slate-200">
              <span>.xlsx</span>
              <span>•</span>
              <span>.xls</span>
              <span>•</span>
              <span>Max 2 MB</span>
              <span>•</span>
              <span>Max 600 Rows</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm font-semibold text-slate-700">{messages.import.processing}</p>
        </div>
      )}

      {/* Import Results & Preview UI */}
      {currentImportResult && (
        <div className="space-y-6">
          {/* File Meta & Summary Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{currentImportResult.fileName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(currentImportResult.fileSize / 1024).toFixed(1)} KB • {currentImportResult.rowsRead}{' '}
                    {messages.import.rowCount}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="cancel-import-btn"
                  onClick={cancelImport}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>{messages.import.actions.cancelImport}</span>
                </button>

                <button
                  id="reimport-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{messages.import.actions.reimport}</span>
                </button>

                <button
                  id="confirm-import-btn"
                  onClick={confirmImport}
                  disabled={!isReadyToConfirm}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                    isReadyToConfirm
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{messages.import.actions.confirmImport}</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">{messages.import.totalLists}</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">
                  {currentImportResult.summary.totalRows}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-xs text-emerald-700 font-medium block">{messages.import.validLists}</span>
                <span className="text-lg font-bold text-emerald-900 mt-1 block">
                  {currentImportResult.summary.validLists}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  currentImportResult.summary.invalidRows > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <span
                  className={`text-xs font-medium block ${
                    currentImportResult.summary.invalidRows > 0 ? 'text-red-700' : 'text-slate-500'
                  }`}
                >
                  {messages.import.invalidRows}
                </span>
                <span
                  className={`text-lg font-bold mt-1 block ${
                    currentImportResult.summary.invalidRows > 0 ? 'text-red-900' : 'text-slate-900'
                  }`}
                >
                  {currentImportResult.summary.invalidRows}
                </span>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-xs text-blue-700 font-medium block">{messages.import.uniqueBuyers}</span>
                <span className="text-lg font-bold text-blue-950 mt-1 block">
                  {currentImportResult.summary.uniqueBuyers}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">{messages.import.totalWeight}</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block truncate">
                  {currentImportResult.summary.totalWeightKg.toLocaleString()} {messages.common.kg}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  hasOversizedStops ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <span
                  className={`text-xs font-medium block ${
                    hasOversizedStops ? 'text-red-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {messages.import.oversizedStops}
                </span>
                <span
                  className={`text-lg font-bold mt-1 block ${
                    hasOversizedStops ? 'text-red-900' : 'text-slate-900'
                  }`}
                >
                  {currentImportResult.summary.oversizedStops}
                </span>
              </div>
            </div>
          </div>

          {/* Red Alert Banner: Blocking Errors */}
          {hasBlockingErrors && (
            <div id="blocking-errors-banner" className="bg-red-50 border-2 border-red-300 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-700 rounded-xl mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-950">
                  {messages.import.alerts.blockingErrorNotice}
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  تم رصد {currentImportResult.errors.length} خطأ يمنع تأكيد الاستيراد. راجع تبويب الأخطاء المانعة أدناه لمعرفة التفاصيل وأرقام الصفوف.
                </p>
              </div>
            </div>
          )}

          {/* Red Alert Banner: Oversized Stops */}
          {hasOversizedStops && (
            <div id="oversized-alert-banner" className="bg-red-50 border border-red-300 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-700 rounded-xl mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-950 flex items-center gap-2">
                  <span>{messages.import.alerts.oversizedAlert}</span>
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  توجد {currentImportResult.summary.oversizedStops} نقطة توصيل تتجاوز الحمولة التشغيلية القصوى للأسطول (
                  {currentImportResult.summary.maxActiveDriverCapacityKg} {messages.common.kg}). لا يتم تقسيم النقطة وفقاً لقواعد المجال.
                </p>
              </div>
            </div>
          )}

          {/* Green Alert Banner: Ready to Confirm */}
          {isReadyToConfirm && (
            <div id="ready-confirm-banner" className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-emerald-950">
                  {messages.import.alerts.readyToConfirm}
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  جميع القوائم مطابقة للمشترين المعتمدين وبإحداثيات جغرافية صحيحة.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="tab-lists"
                onClick={() => setActiveSubTab('lists')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSubTab === 'lists'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>{messages.import.tabs.lists}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeSubTab === 'lists' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {currentImportResult.rawRows.length}
                </span>
              </button>

              <button
                id="tab-stops"
                onClick={() => setActiveSubTab('stops')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSubTab === 'stops'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{messages.import.tabs.stops}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeSubTab === 'stops' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {currentImportResult.stops.length}
                </span>
              </button>

              <button
                id="tab-errors"
                onClick={() => setActiveSubTab('errors')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSubTab === 'errors'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{messages.import.tabs.errors}</span>
                {currentImportResult.errors.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-800 text-white font-bold">
                    {currentImportResult.errors.length}
                  </span>
                )}
              </button>

              <button
                id="tab-warnings"
                onClick={() => setActiveSubTab('warnings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSubTab === 'warnings'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{messages.import.tabs.warnings}</span>
                {currentImportResult.warnings.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-800 text-white font-bold">
                    {currentImportResult.warnings.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder={messages.common.search}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* SubTab 1: Lists Table */}
          {activeSubTab === 'lists' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right rtl:text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-3 w-12 text-center">{messages.import.listsTable.rowNum}</th>
                      <th className="px-3.5 py-3">{messages.import.listsTable.listNumber}</th>
                      <th className="px-3.5 py-3">{messages.import.listsTable.buyerCode}</th>
                      <th className="px-3.5 py-3">{messages.import.listsTable.excelBuyerName}</th>
                      <th className="px-3.5 py-3">{messages.import.listsTable.masterBuyerName}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.listsTable.weight}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.listsTable.status}</th>
                      <th className="px-3.5 py-3">{messages.import.listsTable.notes}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLists.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {messages.import.emptyStates.noData}
                        </td>
                      </tr>
                    ) : (
                      filteredLists.map((row) => {
                        const hasErr = row.errors.length > 0;
                        const hasWarn = row.warnings.length > 0;

                        return (
                          <tr
                            key={`row-${row.rowNumber}`}
                            className={`hover:bg-slate-50/80 transition ${
                              hasErr ? 'bg-red-50/40' : hasWarn ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="px-3.5 py-2.5 text-center font-mono text-slate-400">{row.rowNumber}</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                              {row.listNumber || <span className="text-red-500 font-normal">--</span>}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-semibold text-blue-700">
                              {row.buyerCode || <span className="text-red-500 font-normal">--</span>}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-800">{row.excelBuyerName || '--'}</td>
                            <td className="px-3.5 py-2.5 text-slate-600">
                              {row.masterBuyerName ? (
                                <span className="text-emerald-700 font-medium">{row.masterBuyerName}</span>
                              ) : (
                                <span className="text-slate-400 italic">--</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-900">
                              {row.weightKg > 0 ? (
                                `${row.weightKg.toLocaleString()} كغم`
                              ) : (
                                <span className="text-red-500 font-normal">غير صالح</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              {hasErr ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                                  <XCircle className="h-3 w-3" /> خطأ
                                </span>
                              ) : hasWarn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                  <AlertTriangle className="h-3 w-3" /> تنبيه
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" /> صالح
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              {hasErr && (
                                <div className="text-red-600 font-medium">
                                  {row.errors.map((e, idx) => (
                                    <div key={idx}>{e.message}</div>
                                  ))}
                                </div>
                              )}
                              {hasWarn && (
                                <div className="text-amber-700">
                                  {row.warnings.map((w, idx) => (
                                    <div key={idx}>{w.message}</div>
                                  ))}
                                </div>
                              )}
                              {!hasErr && !hasWarn && <span className="text-slate-400">--</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Stops Table */}
          {activeSubTab === 'stops' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right rtl:text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-3">{messages.import.stopsTable.stopId}</th>
                      <th className="px-3.5 py-3">{messages.import.stopsTable.buyerCode}</th>
                      <th className="px-3.5 py-3">{messages.import.stopsTable.buyerName}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.stopsTable.listCount}</th>
                      <th className="px-3.5 py-3">{messages.import.stopsTable.listsIncluded}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.stopsTable.totalWeight}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.stopsTable.gpsStatus}</th>
                      <th className="px-3.5 py-3 text-center">{messages.import.stopsTable.capacityStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStops.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {messages.import.emptyStates.noData}
                        </td>
                      </tr>
                    ) : (
                      filteredStops.map((stop) => (
                        <tr
                          key={stop.stopId}
                          className={`hover:bg-slate-50/80 transition ${
                            stop.isOversized ? 'bg-red-50/60' : ''
                          }`}
                        >
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-700">{stop.stopId}</td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">{stop.buyerCode}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900">{stop.buyerName}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                              {stop.lists.length}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                            {stop.lists.map(l => l.listNumber).join(', ')}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-slate-900">
                            {stop.totalWeightKg.toLocaleString()} كغم
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {stop.hasValidGps ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700">
                                <XCircle className="h-3 w-3" /> مفقود
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {stop.isOversized ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-xs">
                                <AlertTriangle className="h-3 w-3" /> OVERSIZED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                <Check className="h-3 w-3 text-emerald-600" /> ضمن السعة
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 3: Blocking Errors */}
          {activeSubTab === 'errors' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {currentImportResult.errors.length === 0 ? (
                <div className="text-center py-8 text-emerald-600 flex flex-col items-center">
                  <CheckCircle2 className="h-10 w-10 mb-2" />
                  <p className="text-sm font-bold">{messages.import.emptyStates.noErrors}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentImportResult.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                      <div className="p-1.5 bg-red-100 text-red-700 rounded-lg mt-0.5">
                        <XCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-950 font-mono">
                            {err.errorCode}
                          </span>
                          {err.rowNumber > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-red-200/80 text-red-900 font-medium">
                              الصف #{err.rowNumber}
                            </span>
                          )}
                          <span className="text-xs text-red-700 font-mono">[{err.field}]</span>
                        </div>
                        <p className="text-xs text-red-900 mt-1 font-medium leading-relaxed">
                          {err.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 4: Warnings & Alerts */}
          {activeSubTab === 'warnings' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {currentImportResult.warnings.length === 0 ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                  <Check className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">{messages.import.emptyStates.noWarnings}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentImportResult.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                        warn.warningCode === 'OVERSIZED_STOP'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg mt-0.5 ${
                          warn.warningCode === 'OVERSIZED_STOP'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono">{warn.warningCode}</span>
                          {warn.rowNumber && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-200/80 font-medium">
                              الصف #{warn.rowNumber}
                            </span>
                          )}
                          {warn.buyerCode && (
                            <span className="text-xs font-mono font-semibold">[{warn.buyerCode}]</span>
                          )}
                        </div>
                        <p className="text-xs mt-1 font-medium leading-relaxed">{warn.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Replace Confirmation Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {messages.import.actions.reimport}
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {messages.import.actions.reimportConfirm}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                id="cancel-replace-btn"
                onClick={handleCancelReplace}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                {messages.common.cancel}
              </button>
              <button
                id="confirm-replace-btn"
                onClick={handleConfirmReplace}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                {messages.import.actions.reimport}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
