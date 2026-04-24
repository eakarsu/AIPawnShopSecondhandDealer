import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { Target, Search, Plus, RefreshCw, Calendar, Shield, Hash, User, FileText } from 'lucide-react';

const FIREARM_TYPES = ['Handgun', 'Rifle', 'Shotgun', 'Other'];

const TRANSACTION_TYPES = ['acquisition', 'disposition', 'pawn_intake', 'pawn_return', 'sale'];

const ACQUISITION_DISPOSITION = ['acquisition', 'disposition'];

const NICS_RESULTS = ['proceed', 'delayed', 'denied', 'cancelled'];

const NICS_COLORS = {
  proceed: 'bg-green-100 text-green-700',
  delayed: 'bg-amber-100 text-amber-700',
  denied: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  inventory_id: '',
  customer_id: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  caliber: '',
  firearm_type: '',
  action_type: '',
  barrel_length: '',
  transaction_type: '',
  transaction_date: '',
  acquisition_disposition: '',
  nics_check_number: '',
  nics_check_date: '',
  nics_result: '',
  notes: '',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function NicsBadge({ result }) {
  if (!result) return <span className="text-gray-400">-</span>;
  const colorClass = NICS_COLORS[result] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
      {result}
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

function formatTransactionType(type) {
  if (!type) return '-';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Firearms() {
  const [firearms, setFirearms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [transFilter, setTransFilter] = useState('all');

  const [inventoryItems, setInventoryItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedFirearm, setSelectedFirearm] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [firearmToDelete, setFirearmToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch firearms
  const fetchFirearms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter !== 'all') params.firearm_type = typeFilter;
      if (transFilter !== 'all') params.transaction_type = transFilter;
      const { data } = await api.get('/firearms', { params });
      setFirearms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch firearms error:', err);
      toast.error('Failed to load firearms log');
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

  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchFirearms();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, typeFilter, transFilter]);

  // Row click -> detail
  const handleRowClick = async (firearm) => {
    try {
      const { data } = await api.get(`/firearms/${firearm.id}`);
      setSelectedFirearm(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch firearm detail error:', err);
      toast.error('Failed to load firearm details');
    }
  };

  // --- New Entry ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    fetchInventory();
    fetchCustomers();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateFirearm = async (e) => {
    e.preventDefault();
    if (!form.manufacturer) {
      toast.error('Manufacturer is required');
      return;
    }
    if (!form.serial_number) {
      toast.error('Serial number is required');
      return;
    }
    if (!form.transaction_type) {
      toast.error('Transaction type is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        inventory_id: form.inventory_id ? parseInt(form.inventory_id, 10) : null,
        customer_id: form.customer_id ? parseInt(form.customer_id, 10) : null,
        manufacturer: form.manufacturer,
        model: form.model || null,
        serial_number: form.serial_number,
        caliber: form.caliber || null,
        firearm_type: form.firearm_type || null,
        action_type: form.action_type || null,
        barrel_length: form.barrel_length || null,
        transaction_type: form.transaction_type,
        transaction_date: form.transaction_date || null,
        acquisition_disposition: form.acquisition_disposition || null,
        nics_check_number: form.nics_check_number || null,
        nics_check_date: form.nics_check_date || null,
        nics_result: form.nics_result || null,
        notes: form.notes || null,
      };
      await api.post('/firearms', payload);
      toast.success('Firearm entry created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchFirearms();
    } catch (err) {
      console.error('Create firearm error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create firearm entry';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit ---
  const openEditModal = () => {
    if (!selectedFirearm) return;
    setEditForm({
      inventory_id: selectedFirearm.inventory_id || '',
      customer_id: selectedFirearm.customer_id || '',
      manufacturer: selectedFirearm.manufacturer || '',
      model: selectedFirearm.model || '',
      serial_number: selectedFirearm.serial_number || '',
      caliber: selectedFirearm.caliber || '',
      firearm_type: selectedFirearm.firearm_type || '',
      action_type: selectedFirearm.action_type || '',
      barrel_length: selectedFirearm.barrel_length || '',
      transaction_type: selectedFirearm.transaction_type || '',
      transaction_date: selectedFirearm.transaction_date ? selectedFirearm.transaction_date.slice(0, 10) : '',
      acquisition_disposition: selectedFirearm.acquisition_disposition || '',
      nics_check_number: selectedFirearm.nics_check_number || '',
      nics_check_date: selectedFirearm.nics_check_date ? selectedFirearm.nics_check_date.slice(0, 10) : '',
      nics_result: selectedFirearm.nics_result || '',
      notes: selectedFirearm.notes || '',
    });
    fetchInventory();
    fetchCustomers();
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateFirearm = async (e) => {
    e.preventDefault();
    if (!selectedFirearm) return;
    if (!editForm.manufacturer) {
      toast.error('Manufacturer is required');
      return;
    }
    if (!editForm.serial_number) {
      toast.error('Serial number is required');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        inventory_id: editForm.inventory_id ? parseInt(editForm.inventory_id, 10) : null,
        customer_id: editForm.customer_id ? parseInt(editForm.customer_id, 10) : null,
        manufacturer: editForm.manufacturer,
        model: editForm.model || null,
        serial_number: editForm.serial_number,
        caliber: editForm.caliber || null,
        firearm_type: editForm.firearm_type || null,
        action_type: editForm.action_type || null,
        barrel_length: editForm.barrel_length || null,
        transaction_type: editForm.transaction_type || null,
        transaction_date: editForm.transaction_date || null,
        acquisition_disposition: editForm.acquisition_disposition || null,
        nics_check_number: editForm.nics_check_number || null,
        nics_check_date: editForm.nics_check_date || null,
        nics_result: editForm.nics_result || null,
        notes: editForm.notes || null,
      };
      await api.put(`/firearms/${selectedFirearm.id}`, payload);
      toast.success('Firearm entry updated successfully');
      setEditModalOpen(false);
      setSelectedFirearm(null);
      fetchFirearms();
    } catch (err) {
      console.error('Update firearm error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update firearm entry';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete ---
  const openDeleteModal = () => {
    if (!selectedFirearm) return;
    setFirearmToDelete(selectedFirearm);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteFirearm = async () => {
    if (!firearmToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/firearms/${firearmToDelete.id}`);
      toast.success('Firearm entry deleted successfully');
      setDeleteModalOpen(false);
      setFirearmToDelete(null);
      setSelectedFirearm(null);
      fetchFirearms();
    } catch (err) {
      console.error('Delete firearm error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete firearm entry';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getInventoryLabel = (item) => {
    return item.name || item.item_name || item.description || `Item #${item.id}`;
  };

  const getCustomerLabel = (customer) => {
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return customer.phone ? `${name} (${customer.phone})` : name;
  };

  const getCustomerName = (firearm) => {
    if (firearm.customer) {
      return `${firearm.customer.first_name || ''} ${firearm.customer.last_name || ''}`.trim();
    }
    if (firearm.customer_name) return firearm.customer_name;
    return '-';
  };

  // Form fields renderer
  const renderFormFields = (currentForm, onChange) => (
    <div className="space-y-4">
      {/* Inventory Item */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item</label>
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

      {/* Customer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <select
          value={currentForm.customer_id}
          onChange={(e) => onChange('customer_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select a customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {getCustomerLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Manufacturer & Model */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer *</label>
          <input
            type="text"
            value={currentForm.manufacturer}
            onChange={(e) => onChange('manufacturer', e.target.value)}
            placeholder="e.g. Smith & Wesson"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={currentForm.model}
            onChange={(e) => onChange('model', e.target.value)}
            placeholder="e.g. M&P Shield"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Serial Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number *</label>
        <input
          type="text"
          value={currentForm.serial_number}
          onChange={(e) => onChange('serial_number', e.target.value)}
          placeholder="Enter serial number"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          required
        />
      </div>

      {/* Caliber & Firearm Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Caliber</label>
          <input
            type="text"
            value={currentForm.caliber}
            onChange={(e) => onChange('caliber', e.target.value)}
            placeholder="e.g. 9mm, .45 ACP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Firearm Type</label>
          <select
            value={currentForm.firearm_type}
            onChange={(e) => onChange('firearm_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          >
            <option value="">Select type...</option>
            {FIREARM_TYPES.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Type & Barrel Length */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
          <input
            type="text"
            value={currentForm.action_type}
            onChange={(e) => onChange('action_type', e.target.value)}
            placeholder="e.g. Semi-Auto, Revolver"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Length</label>
          <input
            type="text"
            value={currentForm.barrel_length}
            onChange={(e) => onChange('barrel_length', e.target.value)}
            placeholder='e.g. 4.25"'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Transaction Type & Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
          <select
            value={currentForm.transaction_type}
            onChange={(e) => onChange('transaction_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
            required
          >
            <option value="">Select type...</option>
            {TRANSACTION_TYPES.map((tt) => (
              <option key={tt} value={tt}>{formatTransactionType(tt)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
          <input
            type="date"
            value={currentForm.transaction_date}
            onChange={(e) => onChange('transaction_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Acquisition/Disposition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition / Disposition</label>
        <select
          value={currentForm.acquisition_disposition}
          onChange={(e) => onChange('acquisition_disposition', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select...</option>
          {ACQUISITION_DISPOSITION.map((ad) => (
            <option key={ad} value={ad}>{ad.charAt(0).toUpperCase() + ad.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* NICS Section */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          NICS Background Check
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NICS Check Number</label>
            <input
              type="text"
              value={currentForm.nics_check_number}
              onChange={(e) => onChange('nics_check_number', e.target.value)}
              placeholder="NTN number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NICS Check Date</label>
            <input
              type="date"
              value={currentForm.nics_check_date}
              onChange={(e) => onChange('nics_check_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">NICS Result</label>
          <select
            value={currentForm.nics_result}
            onChange={(e) => onChange('nics_result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          >
            <option value="">Select result...</option>
            {NICS_RESULTS.map((nr) => (
              <option key={nr} value={nr}>{nr.charAt(0).toUpperCase() + nr.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Target className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Firearms Log Book</h1>
            <p className="text-sm text-gray-500">ATF compliance firearm acquisition & disposition log</p>
          </div>
          <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            {firearms.length}
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by manufacturer, model, serial number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Types</option>
          {FIREARM_TYPES.map((ft) => (
            <option key={ft} value={ft}>{ft}</option>
          ))}
        </select>
        <select
          value={transFilter}
          onChange={(e) => setTransFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Transactions</option>
          {TRANSACTION_TYPES.map((tt) => (
            <option key={tt} value={tt}>{formatTransactionType(tt)}</option>
          ))}
        </select>
        <button
          onClick={fetchFirearms}
          className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Manufacturer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Model</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Serial #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Caliber</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Transaction</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">NICS #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">NICS Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading firearms log...
                  </td>
                </tr>
              ) : firearms.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No firearm entries found
                  </td>
                </tr>
              ) : (
                firearms.map((firearm) => (
                  <tr
                    key={firearm.id}
                    onClick={() => handleRowClick(firearm)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{firearm.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{firearm.manufacturer || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{firearm.model || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{firearm.serial_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{firearm.caliber || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{firearm.firearm_type || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {formatTransactionType(firearm.transaction_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(firearm.transaction_date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{firearm.nics_check_number || '-'}</td>
                    <td className="px-4 py-3"><NicsBadge result={firearm.nics_result} /></td>
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
        title={selectedFirearm ? `${selectedFirearm.manufacturer || ''} ${selectedFirearm.model || ''}`.trim() || 'Firearm Details' : 'Firearm Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedFirearm && (
          <div className="space-y-6">
            {/* Firearm Information */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Firearm Information</h3>
              <div className="space-y-3">
                <DetailRow icon={<Target className="w-4 h-4 text-amber-500" />} label="Manufacturer" value={selectedFirearm.manufacturer} />
                <DetailRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Model" value={selectedFirearm.model} />
                <DetailRow icon={<Hash className="w-4 h-4 text-gray-400" />} label="Serial Number" value={selectedFirearm.serial_number} />
                <DetailRow icon={<Target className="w-4 h-4 text-gray-400" />} label="Caliber" value={selectedFirearm.caliber} />
                <DetailRow icon={<Target className="w-4 h-4 text-gray-400" />} label="Firearm Type" value={selectedFirearm.firearm_type} />
                <DetailRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Action Type" value={selectedFirearm.action_type} />
                <DetailRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Barrel Length" value={selectedFirearm.barrel_length} />
              </div>
            </div>

            {/* Transaction Details */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Transaction Details</h3>
              <div className="space-y-3">
                <DetailRow icon={<RefreshCw className="w-4 h-4 text-blue-500" />} label="Transaction Type" value={formatTransactionType(selectedFirearm.transaction_type)} />
                <DetailRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Transaction Date" value={formatDate(selectedFirearm.transaction_date)} />
                <DetailRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Acquisition / Disposition" value={selectedFirearm.acquisition_disposition ? selectedFirearm.acquisition_disposition.charAt(0).toUpperCase() + selectedFirearm.acquisition_disposition.slice(1) : '-'} />
                <DetailRow icon={<User className="w-4 h-4 text-gray-400" />} label="Customer" value={getCustomerName(selectedFirearm)} />
              </div>
            </div>

            {/* NICS Background Check */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">NICS Background Check</h3>
              <div className="space-y-3">
                <DetailRow icon={<Shield className="w-4 h-4 text-amber-500" />} label="NICS Check Number" value={selectedFirearm.nics_check_number} />
                <DetailRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="NICS Check Date" value={formatDate(selectedFirearm.nics_check_date)} />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0"><Shield className="w-4 h-4 text-gray-400" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">NICS Result</p>
                    <div className="mt-0.5"><NicsBadge result={selectedFirearm.nics_result} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedFirearm.notes && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFirearm.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Firearm Entry" size="lg">
        <form onSubmit={handleCreateFirearm}>
          {renderFormFields(form, handleFormChange)}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Firearm Entry" size="lg">
        <form onSubmit={handleUpdateFirearm}>
          {renderFormFields(editForm, handleEditFormChange)}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {editSaving ? 'Saving...' : 'Update Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Firearm Entry" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this firearm entry?
          </p>
          {firearmToDelete && (
            <div className="bg-red-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-900">{firearmToDelete.manufacturer} {firearmToDelete.model}</p>
              <p className="text-red-700">Serial: {firearmToDelete.serial_number}</p>
            </div>
          )}
          <p className="text-xs text-red-500 font-medium">
            This action cannot be undone. ATF records should be maintained per federal requirements.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteFirearm}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Entry'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
