import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import {
  Wallet,
  Plus,
  RefreshCw,
  MapPin,
  DollarSign,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Unlock,
  Lock,
  Search,
} from 'lucide-react';

const EMPTY_DRAWER_FORM = {
  drawer_name: '',
  location: '',
};

const EMPTY_TRANSACTION_FORM = {
  transaction_type: 'cash_in',
  amount: '',
  description: '',
};

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const isOpen = status === 'open';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isOpen ? (
        <Unlock className="w-3 h-3 mr-1" />
      ) : (
        <Lock className="w-3 h-3 mr-1" />
      )}
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function CashDrawer() {
  const [drawers, setDrawers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDrawer, setSelectedDrawer] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // New / Edit drawer modal
  const [drawerModalOpen, setDrawerModalOpen] = useState(false);
  const [drawerForm, setDrawerForm] = useState({ ...EMPTY_DRAWER_FORM });
  const [editingDrawer, setEditingDrawer] = useState(null);
  const [savingDrawer, setSavingDrawer] = useState(false);

  // Open drawer modal
  const [openDrawerModalOpen, setOpenDrawerModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingDrawer, setOpeningDrawer] = useState(false);

  // Transaction modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({ ...EMPTY_TRANSACTION_FORM });
  const [savingTx, setSavingTx] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [drawerToDelete, setDrawerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch drawers
  const fetchDrawers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cash-drawer');
      setDrawers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch drawers error:', err);
      toast.error('Failed to load cash drawers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawers();
  }, []);

  // Card click -> detail
  const handleCardClick = async (drawer) => {
    try {
      const { data } = await api.get(`/cash-drawer/${drawer.id}`);
      setSelectedDrawer(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch drawer detail error:', err);
      toast.error('Failed to load drawer details');
    }
  };

  // --- Create / Edit Drawer ---
  const openNewDrawerModal = () => {
    setEditingDrawer(null);
    setDrawerForm({ ...EMPTY_DRAWER_FORM });
    setDrawerModalOpen(true);
  };

  const openEditDrawerModal = () => {
    if (!selectedDrawer) return;
    setEditingDrawer(selectedDrawer);
    setDrawerForm({
      drawer_name: selectedDrawer.drawer_name || '',
      location: selectedDrawer.location || '',
    });
    setDetailOpen(false);
    setDrawerModalOpen(true);
  };

  const handleDrawerFormChange = (field, value) => {
    setDrawerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDrawer = async (e) => {
    e.preventDefault();
    if (!drawerForm.drawer_name.trim()) {
      toast.error('Drawer name is required');
      return;
    }
    setSavingDrawer(true);
    try {
      const payload = {
        drawer_name: drawerForm.drawer_name.trim(),
        location: drawerForm.location.trim() || null,
      };
      if (editingDrawer) {
        await api.put(`/cash-drawer/${editingDrawer.id}`, payload);
        toast.success('Drawer updated successfully');
      } else {
        await api.post('/cash-drawer', payload);
        toast.success('Drawer created successfully');
      }
      setDrawerModalOpen(false);
      setDrawerForm({ ...EMPTY_DRAWER_FORM });
      setEditingDrawer(null);
      fetchDrawers();
    } catch (err) {
      console.error('Save drawer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to save drawer';
      toast.error(message);
    } finally {
      setSavingDrawer(false);
    }
  };

  // --- Open Drawer ---
  const handleOpenDrawerClick = () => {
    setOpeningBalance('');
    setOpenDrawerModalOpen(true);
  };

  const handleOpenDrawer = async (e) => {
    e.preventDefault();
    if (!selectedDrawer) return;
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast.error('Please enter a valid opening balance');
      return;
    }
    setOpeningDrawer(true);
    try {
      await api.post(`/cash-drawer/${selectedDrawer.id}/open`, {
        opening_balance: parseFloat(openingBalance),
      });
      toast.success('Drawer opened successfully');
      setOpenDrawerModalOpen(false);
      // Refresh detail
      const { data } = await api.get(`/cash-drawer/${selectedDrawer.id}`);
      setSelectedDrawer(data);
      fetchDrawers();
    } catch (err) {
      console.error('Open drawer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to open drawer';
      toast.error(message);
    } finally {
      setOpeningDrawer(false);
    }
  };

  // --- Close Drawer ---
  const handleCloseDrawer = async () => {
    if (!selectedDrawer) return;
    try {
      await api.post(`/cash-drawer/${selectedDrawer.id}/close`);
      toast.success('Drawer closed successfully');
      const { data } = await api.get(`/cash-drawer/${selectedDrawer.id}`);
      setSelectedDrawer(data);
      fetchDrawers();
    } catch (err) {
      console.error('Close drawer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to close drawer';
      toast.error(message);
    }
  };

  // --- Add Transaction ---
  const openTxModal = () => {
    setTxForm({ ...EMPTY_TRANSACTION_FORM });
    setTxModalOpen(true);
  };

  const handleTxFormChange = (field, value) => {
    setTxForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!selectedDrawer) return;
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setSavingTx(true);
    try {
      await api.post(`/cash-drawer/${selectedDrawer.id}/transaction`, {
        transaction_type: txForm.transaction_type,
        amount: parseFloat(txForm.amount),
        description: txForm.description.trim() || null,
      });
      toast.success('Transaction added successfully');
      setTxModalOpen(false);
      setTxForm({ ...EMPTY_TRANSACTION_FORM });
      // Refresh detail
      const { data } = await api.get(`/cash-drawer/${selectedDrawer.id}`);
      setSelectedDrawer(data);
      fetchDrawers();
    } catch (err) {
      console.error('Add transaction error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to add transaction';
      toast.error(message);
    } finally {
      setSavingTx(false);
    }
  };

  // --- Delete Drawer ---
  const openDeleteModal = () => {
    if (!selectedDrawer) return;
    setDrawerToDelete(selectedDrawer);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteDrawer = async () => {
    if (!drawerToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/cash-drawer/${drawerToDelete.id}`);
      toast.success('Drawer deleted successfully');
      setDeleteModalOpen(false);
      setDrawerToDelete(null);
      setSelectedDrawer(null);
      fetchDrawers();
    } catch (err) {
      console.error('Delete drawer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to delete drawer';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Get transactions from selected drawer
  const transactions = selectedDrawer?.transactions || selectedDrawer?.CashDrawerTransactions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Wallet className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Drawer Management</h1>
            <p className="text-sm text-gray-500">
              {drawers.length} drawer{drawers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openNewDrawerModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Drawer
        </button>
      </div>

      {/* Drawer Cards */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
          <span className="text-sm text-gray-500">Loading drawers...</span>
        </div>
      ) : drawers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No cash drawers found</p>
          <button
            onClick={openNewDrawerModal}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium mt-1"
          >
            Create your first drawer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawers.map((drawer) => {
            const isOpen = drawer.status === 'open';
            return (
              <div
                key={drawer.id}
                onClick={() => handleCardClick(drawer)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-200 cursor-pointer transition-all duration-150 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {drawer.drawer_name}
                    </h3>
                    {drawer.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {drawer.location}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={drawer.status} />
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-400">Current Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(drawer.current_balance)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {drawer.opened_at && (
                    <div className="flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      <span>{formatDateTime(drawer.opened_at)}</span>
                    </div>
                  )}
                  {drawer.closed_at && (
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>{formatDateTime(drawer.closed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedDrawer ? selectedDrawer.drawer_name : 'Drawer Details'}
        onEdit={openEditDrawerModal}
        onDelete={openDeleteModal}
      >
        {selectedDrawer && (
          <div className="space-y-6">
            {/* Status + Balance */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedDrawer.current_balance)}
                </p>
              </div>
              <StatusBadge status={selectedDrawer.status} />
            </div>

            {/* Drawer Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Drawer Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Wallet className="w-4 h-4 text-gray-400" />}
                  label="Drawer Name"
                  value={selectedDrawer.drawer_name}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  label="Location"
                  value={selectedDrawer.location}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Opening Balance"
                  value={formatCurrency(selectedDrawer.opening_balance)}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Current Balance"
                  value={formatCurrency(selectedDrawer.current_balance)}
                />
                {selectedDrawer.opened_at && (
                  <DetailRow
                    icon={<Unlock className="w-4 h-4 text-gray-400" />}
                    label="Opened At"
                    value={formatDateTime(selectedDrawer.opened_at)}
                  />
                )}
                {selectedDrawer.closed_at && (
                  <DetailRow
                    icon={<Lock className="w-4 h-4 text-gray-400" />}
                    label="Closed At"
                    value={formatDateTime(selectedDrawer.closed_at)}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {selectedDrawer.status !== 'open' && (
                <button
                  onClick={handleOpenDrawerClick}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  Open Drawer
                </button>
              )}
              {selectedDrawer.status === 'open' && (
                <>
                  <button
                    onClick={handleCloseDrawer}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Close Drawer
                  </button>
                  <button
                    onClick={openTxModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </button>
                </>
              )}
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Transaction History
              </h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx, idx) => {
                    const isCashIn = tx.transaction_type === 'cash_in';
                    const isCashOut = tx.transaction_type === 'cash_out';
                    return (
                      <div
                        key={tx.id || idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {isCashIn ? (
                            <ArrowDownCircle className="w-5 h-5 text-green-500 shrink-0" />
                          ) : isCashOut ? (
                            <ArrowUpCircle className="w-5 h-5 text-red-500 shrink-0" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-blue-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {(tx.transaction_type || '').replace('_', ' ')}
                            </p>
                            {tx.description && (
                              <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              {formatDateTime(tx.created_at || tx.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">
                          <span
                            className={`text-sm font-semibold ${
                              isCashIn
                                ? 'text-green-600'
                                : isCashOut
                                ? 'text-red-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {isCashIn ? '+' : isCashOut ? '-' : ''}
                            {formatCurrency(tx.amount)}
                          </span>
                          {tx.running_balance !== undefined && tx.running_balance !== null && (
                            <p className="text-xs text-gray-400 text-right">
                              Bal: {formatCurrency(tx.running_balance)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Record Info
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Clock className="w-4 h-4 text-gray-400" />}
                  label="Created"
                  value={formatDate(selectedDrawer.created_at)}
                />
                <DetailRow
                  icon={<Clock className="w-4 h-4 text-gray-400" />}
                  label="Updated"
                  value={formatDate(selectedDrawer.updated_at)}
                />
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* New / Edit Drawer Modal */}
      <Modal
        isOpen={drawerModalOpen}
        onClose={() => setDrawerModalOpen(false)}
        title={editingDrawer ? 'Edit Drawer' : 'New Cash Drawer'}
        size="md"
      >
        <form onSubmit={handleSaveDrawer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drawer Name *</label>
            <input
              type="text"
              value={drawerForm.drawer_name}
              onChange={(e) => handleDrawerFormChange('drawer_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="e.g. Main Register"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={drawerForm.location}
              onChange={(e) => handleDrawerFormChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="e.g. Front Counter"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDrawerModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDrawer}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingDrawer ? 'Saving...' : editingDrawer ? 'Update Drawer' : 'Create Drawer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Open Drawer Modal */}
      <Modal
        isOpen={openDrawerModalOpen}
        onClose={() => setOpenDrawerModalOpen(false)}
        title="Open Cash Drawer"
        size="sm"
      >
        <form onSubmit={handleOpenDrawer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Balance *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenDrawerModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={openingDrawer}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg shadow-md shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {openingDrawer ? 'Opening...' : 'Open Drawer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title="Add Transaction"
        size="md"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
            <select
              value={txForm.transaction_type}
              onChange={(e) => handleTxFormChange('transaction_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              <option value="cash_in">Cash In</option>
              <option value="cash_out">Cash Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={txForm.amount}
              onChange={(e) => handleTxFormChange('amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={txForm.description}
              onChange={(e) => handleTxFormChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTxModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTx}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingTx ? 'Saving...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Cash Drawer"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete drawer{' '}
            <span className="font-semibold text-gray-900">
              {drawerToDelete?.drawer_name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDrawer}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Drawer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
