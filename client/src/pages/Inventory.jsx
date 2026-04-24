import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import {
  Package,
  Search,
  Plus,
  Filter,
  Loader2,
  ChevronDown,
  X,
  Tag,
  Hash,
  DollarSign,
  MapPin,
  FileText,
  Calendar,
  Layers,
  Star,
  Info,
} from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Jewelry',
  'Musical Instruments',
  'Tools',
  'Firearms',
  'Watches',
  'Collectibles',
  'Sporting Goods',
  'Other',
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const STATUSES = ['available', 'pawned', 'sold', 'on_hold', 'layaway'];

const STATUS_BADGE = {
  available: 'bg-green-100 text-green-700',
  pawned: 'bg-amber-100 text-amber-700',
  sold: 'bg-red-100 text-red-700',
  on_hold: 'bg-blue-100 text-blue-700',
  layaway: 'bg-purple-100 text-purple-700',
};

const EMPTY_FORM = {
  category: '',
  subcategory: '',
  name: '',
  description: '',
  serial_number: '',
  brand: '',
  model: '',
  condition: '',
  cost_price: '',
  retail_price: '',
  status: 'available',
  location: '',
  notes: '',
};

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return '$' + num.toFixed(2);
}

function formatStatus(status) {
  if (!status) return '-';
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Fetch ---- */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;

      const { data } = await api.get('/inventory', { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterStatus]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchItems]);

  /* ---- Row click ---- */
  const handleRowClick = async (item) => {
    try {
      const { data } = await api.get(`/inventory/${item.id}`);
      setSelectedItem(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch item detail error:', err);
      toast.error('Failed to load item details');
    }
  };

  /* ---- Add / Edit / Delete openers ---- */
  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedItem) return;
    setEditingItem(selectedItem);
    setForm({
      category: selectedItem.category || '',
      subcategory: selectedItem.subcategory || '',
      name: selectedItem.name || '',
      description: selectedItem.description || '',
      serial_number: selectedItem.serial_number || '',
      brand: selectedItem.brand || '',
      model: selectedItem.model || '',
      condition: selectedItem.condition || '',
      cost_price: selectedItem.cost_price != null ? String(selectedItem.cost_price) : '',
      retail_price: selectedItem.retail_price != null ? String(selectedItem.retail_price) : '',
      status: selectedItem.status || 'available',
      location: selectedItem.location || '',
      notes: selectedItem.notes || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const openDeleteModal = () => {
    if (!selectedItem) return;
    setItemToDelete(selectedItem);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  /* ---- Form ---- */
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        cost_price: form.cost_price !== '' ? parseFloat(form.cost_price) : null,
        retail_price: form.retail_price !== '' ? parseFloat(form.retail_price) : null,
      };

      if (editingItem) {
        await api.put(`/inventory/${editingItem.id}`, payload);
        toast.success('Item updated successfully');
      } else {
        await api.post('/inventory', payload);
        toast.success('Item added successfully');
      }

      setModalOpen(false);
      setEditingItem(null);
      setForm({ ...EMPTY_FORM });
      fetchItems();
    } catch (err) {
      console.error('Save item error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to save item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${itemToDelete.id}`);
      toast.success('Item deleted successfully');
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error('Delete item error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to delete item';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {items.length}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Manage your pawn shop inventory
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, serial number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="appearance-none pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand / Model</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Serial #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Condition</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Retail Price</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No inventory items found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Add your first item
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.category || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[item.brand, item.model].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.condition || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(item.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.retail_price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_BADGE[item.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.location || '-'}</td>
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
        title={selectedItem ? selectedItem.name : 'Item Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  STATUS_BADGE[selectedItem.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {formatStatus(selectedItem.status)}
              </span>
              {selectedItem.condition && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  {selectedItem.condition}
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Basic Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Package className="w-4 h-4 text-gray-400" />}
                  label="Item Name"
                  value={selectedItem.name}
                />
                <DetailRow
                  icon={<Layers className="w-4 h-4 text-gray-400" />}
                  label="Category"
                  value={selectedItem.category}
                />
                <DetailRow
                  icon={<Layers className="w-4 h-4 text-gray-400" />}
                  label="Subcategory"
                  value={selectedItem.subcategory}
                />
                <DetailRow
                  icon={<Tag className="w-4 h-4 text-gray-400" />}
                  label="Brand"
                  value={selectedItem.brand}
                />
                <DetailRow
                  icon={<Tag className="w-4 h-4 text-gray-400" />}
                  label="Model"
                  value={selectedItem.model}
                />
                <DetailRow
                  icon={<Hash className="w-4 h-4 text-gray-400" />}
                  label="Serial Number"
                  value={selectedItem.serial_number}
                />
              </div>
            </div>

            {/* Description */}
            {selectedItem.description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pricing
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">Cost Price</p>
                  <p className="text-lg font-bold text-gray-700">
                    {formatCurrency(selectedItem.cost_price)}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-500">Retail Price</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(selectedItem.retail_price)}
                  </p>
                </div>
              </div>
              {selectedItem.cost_price != null &&
                selectedItem.retail_price != null &&
                parseFloat(selectedItem.cost_price) > 0 && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg text-center">
                    <span className="text-xs text-green-600 font-medium">
                      Margin:{' '}
                      {(
                        ((parseFloat(selectedItem.retail_price) -
                          parseFloat(selectedItem.cost_price)) /
                          parseFloat(selectedItem.cost_price)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
            </div>

            {/* Condition & Status */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Condition & Status
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Star className="w-4 h-4 text-gray-400" />}
                  label="Condition"
                  value={selectedItem.condition}
                />
                <DetailRow
                  icon={<Info className="w-4 h-4 text-gray-400" />}
                  label="Status"
                  value={formatStatus(selectedItem.status)}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  label="Location"
                  value={selectedItem.location}
                />
              </div>
            </div>

            {/* Notes */}
            {selectedItem.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedItem.notes}
                </p>
              </div>
            )}

            {/* Record Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Record Info
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Created"
                  value={formatDate(selectedItem.created_at)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Last Updated"
                  value={formatDate(selectedItem.updated_at)}
                />
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
          setForm({ ...EMPTY_FORM });
        }}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <input
                type="text"
                value={form.subcategory}
                onChange={(e) => handleFormChange('subcategory', e.target.value)}
                placeholder="e.g. Smartphones, Rings"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g. iPhone 15 Pro Max 256GB"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Detailed description of the item..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input
              type="text"
              value={form.serial_number}
              onChange={(e) => handleFormChange('serial_number', e.target.value)}
              placeholder="Serial or IMEI number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm font-mono"
            />
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => handleFormChange('brand', e.target.value)}
                placeholder="e.g. Apple, Fender"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
                placeholder="e.g. Stratocaster"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Condition & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={form.condition}
                onChange={(e) => handleFormChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">Select Condition</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => handleFormChange('cost_price', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retail Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.retail_price}
                onChange={(e) => handleFormChange('retail_price', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleFormChange('location', e.target.value)}
              placeholder="e.g. Shelf A-3, Display Case 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Additional notes about this item..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingItem(null);
                setForm({ ...EMPTY_FORM });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Item"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <Package className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-1">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">{itemToDelete?.name}</span>? Any associated
                records (loans, layaways) may be affected.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setItemToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Item
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}
