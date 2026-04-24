import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { ShieldAlert, Search, Plus, RefreshCw, Calendar, FileText, User, Building, Hash, Clock, Unlock } from 'lucide-react';

const HOLD_STATUSES = ['active', 'released', 'expired'];

const STATUS_COLORS = {
  active: 'bg-amber-100 text-amber-700',
  released: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  active: 'Active',
  released: 'Released',
  expired: 'Expired',
};

const HOLD_TYPES = ['police_hold', 'regulatory_hold', 'dispute_hold'];

const HOLD_TYPE_LABELS = {
  police_hold: 'Police Hold',
  regulatory_hold: 'Regulatory Hold',
  dispute_hold: 'Dispute Hold',
};

const EMPTY_FORM = {
  inventory_id: '',
  hold_type: '',
  start_date: '',
  end_date: '',
  police_case_number: '',
  officer_name: '',
  officer_badge: '',
  department: '',
  notes: '',
};

const EMPTY_EDIT_FORM = {
  inventory_id: '',
  hold_type: '',
  start_date: '',
  end_date: '',
  police_case_number: '',
  officer_name: '',
  officer_badge: '',
  department: '',
  notes: '',
  status: '',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_LABELS[status] || status}
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

export default function HoldPeriods() {
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [inventoryItems, setInventoryItems] = useState([]);

  const [selectedHold, setSelectedHold] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [holdToDelete, setHoldToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [releasing, setReleasing] = useState(false);

  // Fetch holds
  const fetchHolds = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/hold-periods', { params });
      setHolds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch hold periods error:', err);
      toast.error('Failed to load hold periods');
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory for dropdown
  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory');
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchHolds();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  // Row click -> detail
  const handleRowClick = async (hold) => {
    try {
      const { data } = await api.get(`/hold-periods/${hold.id}`);
      setSelectedHold(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch hold detail error:', err);
      toast.error('Failed to load hold period details');
    }
  };

  // --- Release Hold ---
  const handleReleaseHold = async () => {
    if (!selectedHold) return;
    setReleasing(true);
    try {
      await api.post(`/hold-periods/${selectedHold.id}/release`);
      toast.success('Hold released successfully');
      setDetailOpen(false);
      setSelectedHold(null);
      fetchHolds();
    } catch (err) {
      console.error('Release hold error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to release hold';
      toast.error(message);
    } finally {
      setReleasing(false);
    }
  };

  // --- New Hold ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    fetchInventory();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateHold = async (e) => {
    e.preventDefault();
    if (!form.inventory_id) {
      toast.error('Please select an inventory item');
      return;
    }
    if (!form.hold_type) {
      toast.error('Please select a hold type');
      return;
    }
    if (!form.start_date) {
      toast.error('Start date is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        inventory_id: parseInt(form.inventory_id, 10),
        hold_type: form.hold_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        police_case_number: form.police_case_number || null,
        officer_name: form.officer_name || null,
        officer_badge: form.officer_badge || null,
        department: form.department || null,
        notes: form.notes || null,
      };
      await api.post('/hold-periods', payload);
      toast.success('Hold period created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchHolds();
    } catch (err) {
      console.error('Create hold error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create hold period';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Hold ---
  const openEditModal = () => {
    if (!selectedHold) return;
    setEditForm({
      inventory_id: selectedHold.inventory_id || '',
      hold_type: selectedHold.hold_type || '',
      start_date: selectedHold.start_date ? selectedHold.start_date.split('T')[0] : '',
      end_date: selectedHold.end_date ? selectedHold.end_date.split('T')[0] : '',
      police_case_number: selectedHold.police_case_number || '',
      officer_name: selectedHold.officer_name || '',
      officer_badge: selectedHold.officer_badge || '',
      department: selectedHold.department || '',
      notes: selectedHold.notes || '',
      status: selectedHold.status || '',
    });
    fetchInventory();
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateHold = async (e) => {
    e.preventDefault();
    if (!selectedHold) return;
    if (!editForm.hold_type) {
      toast.error('Hold type is required');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        inventory_id: parseInt(editForm.inventory_id, 10) || null,
        hold_type: editForm.hold_type,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        police_case_number: editForm.police_case_number || null,
        officer_name: editForm.officer_name || null,
        officer_badge: editForm.officer_badge || null,
        department: editForm.department || null,
        notes: editForm.notes || null,
        status: editForm.status,
      };
      await api.put(`/hold-periods/${selectedHold.id}`, payload);
      toast.success('Hold period updated successfully');
      setEditModalOpen(false);
      setSelectedHold(null);
      fetchHolds();
    } catch (err) {
      console.error('Update hold error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update hold period';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Hold ---
  const openDeleteModal = () => {
    if (!selectedHold) return;
    setHoldToDelete(selectedHold);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteHold = async () => {
    if (!holdToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/hold-periods/${holdToDelete.id}`);
      toast.success('Hold period deleted successfully');
      setDeleteModalOpen(false);
      setHoldToDelete(null);
      setSelectedHold(null);
      fetchHolds();
    } catch (err) {
      console.error('Delete hold error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete hold period';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getItemName = (hold) => {
    if (hold.inventory?.name) return hold.inventory.name;
    if (hold.inventory?.item_name) return hold.inventory.item_name;
    if (hold.inventory?.description) return hold.inventory.description;
    if (hold.item_name) return hold.item_name;
    if (hold.item_description) return hold.item_description;
    return '-';
  };

  const getInventoryLabel = (item) => {
    const name = item.name || item.item_name || item.description || `Item #${item.id}`;
    return name;
  };

  // Form fields renderer for create/edit modals
  const renderFormFields = (currentForm, onChange, includeStatus = false) => (
    <div className="space-y-4">
      {/* Inventory Item */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item *</label>
        <select
          value={currentForm.inventory_id}
          onChange={(e) => onChange('inventory_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select an item...</option>
          {inventoryItems.map((item) => (
            <option key={item.id} value={item.id}>
              {getInventoryLabel(item)}
            </option>
          ))}
        </select>
      </div>

      {/* Hold Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hold Type *</label>
        <select
          value={currentForm.hold_type}
          onChange={(e) => onChange('hold_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select hold type...</option>
          {HOLD_TYPES.map((ht) => (
            <option key={ht} value={ht}>
              {HOLD_TYPE_LABELS[ht]}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            value={currentForm.start_date}
            onChange={(e) => onChange('start_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={currentForm.end_date}
            onChange={(e) => onChange('end_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Police Case Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Police Case #</label>
        <input
          type="text"
          value={currentForm.police_case_number}
          onChange={(e) => onChange('police_case_number', e.target.value)}
          placeholder="e.g. 2026-PC-001234"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        />
      </div>

      {/* Officer Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Officer Name</label>
          <input
            type="text"
            value={currentForm.officer_name}
            onChange={(e) => onChange('officer_name', e.target.value)}
            placeholder="Officer name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Badge #</label>
          <input
            type="text"
            value={currentForm.officer_badge}
            onChange={(e) => onChange('officer_badge', e.target.value)}
            placeholder="Badge number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input
          type="text"
          value={currentForm.department}
          onChange={(e) => onChange('department', e.target.value)}
          placeholder="Police department"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        />
      </div>

      {/* Status (edit only) */}
      {includeStatus && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={currentForm.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          >
            {HOLD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={currentForm.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          rows={3}
          placeholder="Additional notes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm resize-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hold Periods</h1>
            <p className="text-sm text-gray-500">
              {holds.length} total hold{holds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Hold
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item, case number, officer..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <span className="text-xs font-bold">&times;</span>
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="appearance-none px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {HOLD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Hold Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">End Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Police Case #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Officer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading hold periods...</span>
                    </div>
                  </td>
                </tr>
              ) : holds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No hold periods found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first hold period
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                holds.map((hold) => (
                  <tr
                    key={hold.id}
                    onClick={() => handleRowClick(hold)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {hold.id}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                      {getItemName(hold)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {HOLD_TYPE_LABELS[hold.hold_type] || hold.hold_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(hold.start_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(hold.end_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {hold.police_case_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {hold.officer_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {hold.department || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={hold.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedHold ? `Hold #${selectedHold.id}` : 'Hold Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedHold && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedHold.status} />
              <span className="text-xs text-gray-400">#{selectedHold.id}</span>
            </div>

            {/* Hold Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hold Information</h3>
              <DetailRow
                icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
                label="Hold Type"
                value={HOLD_TYPE_LABELS[selectedHold.hold_type] || selectedHold.hold_type}
              />
              <DetailRow
                icon={<FileText className="w-4 h-4 text-gray-400" />}
                label="Item"
                value={getItemName(selectedHold)}
              />
              <DetailRow
                icon={<Calendar className="w-4 h-4 text-gray-400" />}
                label="Start Date"
                value={formatDate(selectedHold.start_date)}
              />
              <DetailRow
                icon={<Calendar className="w-4 h-4 text-gray-400" />}
                label="End Date"
                value={formatDate(selectedHold.end_date)}
              />
            </div>

            {/* Police / Officer Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Law Enforcement</h3>
              <DetailRow
                icon={<Hash className="w-4 h-4 text-gray-400" />}
                label="Police Case #"
                value={selectedHold.police_case_number}
              />
              <DetailRow
                icon={<User className="w-4 h-4 text-gray-400" />}
                label="Officer Name"
                value={selectedHold.officer_name}
              />
              <DetailRow
                icon={<Hash className="w-4 h-4 text-gray-400" />}
                label="Badge #"
                value={selectedHold.officer_badge}
              />
              <DetailRow
                icon={<Building className="w-4 h-4 text-gray-400" />}
                label="Department"
                value={selectedHold.department}
              />
            </div>

            {/* Notes */}
            {selectedHold.notes && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {selectedHold.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamps</h3>
              <DetailRow
                icon={<Clock className="w-4 h-4 text-gray-400" />}
                label="Created"
                value={formatDate(selectedHold.created_at)}
              />
              <DetailRow
                icon={<Clock className="w-4 h-4 text-gray-400" />}
                label="Updated"
                value={formatDate(selectedHold.updated_at)}
              />
            </div>

            {/* Release button for active holds */}
            {selectedHold.status === 'active' && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleReleaseHold}
                  disabled={releasing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  {releasing ? 'Releasing...' : 'Release Hold'}
                </button>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* New Hold Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Hold Period" size="lg">
        <form onSubmit={handleCreateHold}>
          {renderFormFields(form, handleFormChange, false)}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-300 disabled:to-amber-400 rounded-lg shadow-md shadow-amber-500/25 transition-all"
            >
              {saving ? 'Creating...' : 'Create Hold'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Hold Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Hold Period" size="lg">
        <form onSubmit={handleUpdateHold}>
          {renderFormFields(editForm, handleEditFormChange, true)}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-300 disabled:to-amber-400 rounded-lg shadow-md shadow-amber-500/25 transition-all"
            >
              {editSaving ? 'Updating...' : 'Update Hold'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Hold Period" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete hold period{' '}
            <span className="font-semibold text-gray-900">#{holdToDelete?.id}</span>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteHold}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
