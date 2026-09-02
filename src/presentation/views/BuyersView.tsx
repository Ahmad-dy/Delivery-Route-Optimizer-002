import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useBuyerStore } from '../../state/buyerStore';
import { Buyer, BuyerProps } from '../../core/domain/entities/Buyer';

interface BuyersViewProps {
  messages: Messages;
}

export const BuyersView: React.FC<BuyersViewProps> = ({ messages }) => {
  const {
    buyers,
    isLoading,
    errorMessage,
    searchQuery,
    setSearchQuery,
    createBuyer,
    updateBuyer,
    deleteBuyer,
    clearError
  } = useBuyerStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);

  // Form State
  const [buyerCode, setBuyerCode] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredBuyers = buyers.filter(
    (b) =>
      b.buyerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingBuyer(null);
    setBuyerCode('');
    setBuyerName('');
    setLatitude('');
    setLongitude('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (buyer: Buyer) => {
    setEditingBuyer(buyer);
    setBuyerCode(buyer.buyerCode);
    setBuyerName(buyer.buyerName);
    setLatitude(buyer.latitude.toString());
    setLongitude(buyer.longitude.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBuyer(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (!buyerCode.trim()) {
      setFormError(messages.validation.buyerCodeRequired);
      return;
    }
    if (!buyerName.trim()) {
      setFormError(messages.validation.buyerNameRequired);
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

    const payload: BuyerProps = {
      buyerCode: buyerCode.trim(),
      buyerName: buyerName.trim(),
      latitude: latNum,
      longitude: lngNum
    };

    try {
      if (editingBuyer) {
        await updateBuyer(payload);
        setSuccessToast(messages.buyers.updatedSuccess);
      } else {
        await createBuyer(payload);
        setSuccessToast(messages.buyers.addedSuccess);
      }
      closeModal();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : messages.errors.general);
    }
  };

  const handleDelete = async (code: string) => {
    try {
      await deleteBuyer(code);
      setDeleteConfirmCode(null);
      setSuccessToast(messages.buyers.deletedSuccess);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span>{messages.buyers.title}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">{messages.buyers.subtitle}</p>
        </div>

        <button
          id="add-buyer-btn"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>{messages.buyers.addNew}</span>
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
          id="search-buyers-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={messages.common.search}
          className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
        />
      </div>

      {/* Buyers Table / List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading && buyers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {messages.common.loading}
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">{messages.buyers.emptyList}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{messages.buyers.emptyListSub}</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{messages.buyers.addNew}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{messages.buyers.buyerCode}</th>
                  <th className="px-6 py-3.5">{messages.buyers.buyerName}</th>
                  <th className="px-6 py-3.5">{messages.buyers.latitude}</th>
                  <th className="px-6 py-3.5">{messages.buyers.longitude}</th>
                  <th className="px-6 py-3.5 text-center">{messages.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredBuyers.map((buyer) => (
                  <tr key={buyer.buyerCode} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono text-xs text-blue-700 font-semibold">
                      {buyer.buyerCode}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{buyer.buyerName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{buyer.latitude}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{buyer.longitude}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          id={`edit-buyer-${buyer.buyerCode}`}
                          onClick={() => openEditModal(buyer)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title={messages.common.edit}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          id={`delete-buyer-${buyer.buyerCode}`}
                          onClick={() => setDeleteConfirmCode(buyer.buyerCode)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                          title={messages.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{messages.common.confirmDelete}</h3>
            <p className="text-sm text-slate-600">{messages.buyers.deleteConfirm}</p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-800">
              Buyer Code: {deleteConfirmCode}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmCode(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                {messages.common.cancel}
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => handleDelete(deleteConfirmCode)}
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
                {editingBuyer ? messages.buyers.editBuyer : messages.buyers.addNew}
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
              {/* Buyer Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {messages.buyers.buyerCode} <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-code-input"
                  type="text"
                  value={buyerCode}
                  onChange={(e) => setBuyerCode(e.target.value)}
                  disabled={Boolean(editingBuyer)}
                  placeholder="e.g. B-101"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Buyer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {messages.buyers.buyerName} <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-name-input"
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. أسواق النور المركزية"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {messages.buyers.latitude} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="buyer-lat-input"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="33.3152"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {messages.buyers.longitude} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="buyer-lng-input"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="44.3661"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
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
                  id="save-buyer-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
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
