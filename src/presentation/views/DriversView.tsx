import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useDriverStore } from '../../state/driverStore';
import { Driver, DriverProps } from '../../core/domain/entities/Driver';
import { CapacityDomainService } from '../../core/domain/services/CapacityDomainService';

interface DriversViewProps {
  messages: Messages;
}

export const DriversView: React.FC<DriversViewProps> = ({ messages }) => {
  const {
    drivers,
    isLoading,
    errorMessage,
    searchQuery,
    setSearchQuery,
    createDriver,
    updateDriver,
    deleteDriver,
    toggleDriverActive,
    clearError
  } = useDriverStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State (4 essential fields)
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [maximumLoadKg, setMaximumLoadKg] = useState('');
  const [active, setActive] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.driverId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parsedNominal = parseFloat(maximumLoadKg) || 0;
  const computedMaxAllowed = Math.round(parsedNominal * 1.10 * 100) / 100;

  const openCreateModal = () => {
    setEditingDriver(null);
    setDriverId(`DRV-${Date.now().toString().slice(-4)}`);
    setDriverName('');
    setMaximumLoadKg('1500');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverId(driver.driverId);
    setDriverName(driver.driverName);
    setMaximumLoadKg(driver.maximumLoadKg.toString());
    setActive(driver.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nominalNum = parseFloat(maximumLoadKg);

    if (!driverId.trim()) {
      setFormError(messages.validation.driverIdRequired);
      return;
    }
    if (!driverName.trim()) {
      setFormError(messages.validation.driverNameRequired);
      return;
    }
    if (Number.isNaN(nominalNum) || nominalNum <= 0) {
      setFormError(messages.validation.invalidDriverCapacity);
      return;
    }
    if (nominalNum > 100000) {
      setFormError(messages.validation.capacityTooLarge);
      return;
    }

    const payload: DriverProps = {
      driverId: driverId.trim(),
      driverName: driverName.trim(),
      maximumLoadKg: nominalNum,
      active
    };

    try {
      if (editingDriver) {
        await updateDriver(payload);
        setSuccessToast(messages.drivers.updatedSuccess);
      } else {
        await createDriver(payload);
        setSuccessToast(messages.drivers.addedSuccess);
      }
      closeModal();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : messages.errors.general);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDriver(id);
      setDeleteConfirmId(null);
      setSuccessToast(messages.drivers.deletedSuccess);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch {
      // Handled in store
    }
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      await toggleDriverActive(driver.driverId, !driver.active);
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />
            <span>{messages.drivers.title}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">{messages.drivers.subtitle}</p>
        </div>

        <button
          id="add-driver-btn"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>{messages.drivers.addNew}</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute right-3.5 rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="search-drivers-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={messages.common.search}
          className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
        />
      </div>

      {/* Drivers List Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading && drivers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {messages.common.loading}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">{messages.drivers.emptyList}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{messages.drivers.emptyListSub}</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{messages.drivers.addNew}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{messages.drivers.driverId}</th>
                  <th className="px-6 py-3.5">{messages.drivers.driverName}</th>
                  <th className="px-6 py-3.5">{messages.drivers.nominalCapacity}</th>
                  <th className="px-6 py-3.5">{messages.drivers.maxAllowedCapacity}</th>
                  <th className="px-6 py-3.5 text-center">{messages.common.status}</th>
                  <th className="px-6 py-3.5 text-center">{messages.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDrivers.map((driver) => {
                  const maxAllowed = CapacityDomainService.getMaximumAllowedCapacity(driver);
                  return (
                    <tr
                      key={driver.driverId}
                      className={`hover:bg-slate-50/70 transition ${!driver.active ? 'opacity-60 bg-slate-50/40' : ''}`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-semibold">
                        {driver.driverId}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {driver.driverName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {driver.maximumLoadKg.toLocaleString()}
                        </span>{' '}
                        <span className="text-xs text-slate-500">{messages.common.kg}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-emerald-700">
                          {maxAllowed.toLocaleString()}
                        </span>{' '}
                        <span className="text-xs text-emerald-600">{messages.common.kg}</span>
                        <span className="text-[10px] ml-1 rtl:ml-0 rtl:mr-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                          +10%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          id={`toggle-driver-${driver.driverId}`}
                          onClick={() => handleToggleActive(driver)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition"
                          title={driver.active ? messages.drivers.statusActive : messages.drivers.statusInactive}
                        >
                          {driver.active ? (
                            <>
                              <ToggleRight className="h-5 w-5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">{messages.common.active}</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                              <span className="text-slate-500">{messages.common.inactive}</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`edit-driver-${driver.driverId}`}
                            onClick={() => openEditModal(driver)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title={messages.common.edit}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            id={`delete-driver-${driver.driverId}`}
                            onClick={() => setDeleteConfirmId(driver.driverId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                            title={messages.common.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{messages.common.confirmDelete}</h3>
            <p className="text-sm text-slate-600">{messages.drivers.deleteConfirm}</p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-800">
              Driver ID: {deleteConfirmId}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                {messages.common.cancel}
              </button>
              <button
                id="confirm-delete-driver-btn"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                {messages.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDriver ? messages.drivers.editDriver : messages.drivers.addNew}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Driver ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {messages.drivers.driverId} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="driver-id-input"
                    type="text"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    disabled={Boolean(editingDriver)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {messages.drivers.driverName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="driver-name-input"
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. علي كريم الجبوري"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Nominal Capacity & Live 110% Calculation */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {messages.drivers.nominalCapacity} ({messages.common.kg}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="driver-capacity-input"
                    type="number"
                    value={maximumLoadKg}
                    onChange={(e) => setMaximumLoadKg(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                  <span className="text-slate-600 font-medium">{messages.drivers.maxAllowedCapacity}:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {computedMaxAllowed.toLocaleString()} {messages.common.kg}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {messages.drivers.capacityNotice}
                </p>
              </div>

              {/* Active Participation Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="driver-active-checkbox"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="driver-active-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  {messages.drivers.statusActive}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  {messages.common.cancel}
                </button>
                <button
                  id="save-driver-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
                >
                  {messages.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

