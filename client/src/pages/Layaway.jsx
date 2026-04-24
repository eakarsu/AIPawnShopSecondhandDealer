import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { ShoppingBag, Search, Plus, DollarSign, Calendar, FileText, User, Package, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const LAYAWAY_STATUSES = ['active', 'completed', 'defaulted', 'cancelled'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  active: 'Active',
  completed: 'Completed',
  defaulted: 'Defaulted',
  cancelled: 'Cancelled',
};

const EMPTY_FORM = {
  customer_id: '',
  inventory_id: '',
  total_price: '',
  down_payment: '',
  monthly_payment: '',
  due_date: '',
  notes: '',
};

const EMPTY_EDIT_FORM = {
  customer_id: '',
  inventory_id: '',
  total_price: '',
  down_payment: '',
  monthly_payment: '',
  due_date: '',
  notes: '',
  status: '',
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

function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{percent}% paid</span>
        <span className="text-xs text-gray-500">
          {formatCurrency(current)} / {formatCurrency(total)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function Layaway() {
  const [layaways, setLayaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [selectedLayaway, setSelectedLayaway] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeSaving, setCompleteSaving] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [layawayToDelete, setLayawayToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch layaways
  const fetchLayaways = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/layaway', { params });
      setLayaways(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch layaways error:', err);
      toast.error('Failed to load layaway plans');
    } finally {
      setLoading(false);
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

  // Fetch available inventory for dropdown
  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory', { params: { status: 'available' } });
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchInventory();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLayaways();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  // Row click -> detail
  const handleRowClick = async (layaway) => {
    try {
      const { data } = await api.get(`/layaway/${layaway.id}`);
      setSelectedLayaway(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch layaway detail error:', err);
      toast.error('Failed to load layaway details');
    }
  };

  // --- New Layaway ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    fetchCustomers();
    fetchInventory();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateLayaway = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.inventory_id) {
      toast.error('Please select an item');
      return;
    }
    if (!form.total_price || parseFloat(form.total_price) <= 0) {
      toast.error('Total price must be greater than 0');
      return;
    }
    if (!form.down_payment || parseFloat(form.down_payment) < 0) {
      toast.error('Down payment is required');
      return;
    }
    if (!form.monthly_payment || parseFloat(form.monthly_payment) <= 0) {
      toast.error('Monthly payment must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: parseInt(form.customer_id, 10),
        inventory_id: parseInt(form.inventory_id, 10),
        total_price: parseFloat(form.total_price),
        down_payment: parseFloat(form.down_payment),
        monthly_payment: parseFloat(form.monthly_payment),
        due_date: form.due_date || null,
        notes: form.notes || null,
      };
      await api.post('/layaway', payload);
      toast.success('Layaway plan created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchLayaways();
    } catch (err) {
      console.error('Create layaway error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create layaway plan';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Layaway ---
  const openEditModal = () => {
    if (!selectedLayaway) return;
    setEditForm({
      customer_id: selectedLayaway.customer_id || '',
      inventory_id: selectedLayaway.inventory_id || '',
      total_price: selectedLayaway.total_price || '',
      down_payment: selectedLayaway.down_payment || '',
      monthly_payment: selectedLayaway.monthly_payment || '',
      due_date: selectedLayaway.due_date ? selectedLayaway.due_date.split('T')[0] : '',
      notes: selectedLayaway.notes || '',
      status: selectedLayaway.status || '',
    });
    fetchCustomers();
    fetchInventory();
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateLayaway = async (e) => {
    e.preventDefault();
    if (!selectedLayaway) return;
    if (!editForm.total_price || parseFloat(editForm.total_price) <= 0) {
      toast.error('Total price must be greater than 0');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        customer_id: parseInt(editForm.customer_id, 10) || null,
        inventory_id: parseInt(editForm.inventory_id, 10) || null,
        total_price: parseFloat(editForm.total_price),
        down_payment: parseFloat(editForm.down_payment) || 0,
        monthly_payment: parseFloat(editForm.monthly_payment) || 0,
        due_date: editForm.due_date || null,
        notes: editForm.notes || null,
        status: editForm.status,
      };
      await api.put(`/layaway/${selectedLayaway.id}`, payload);
      toast.success('Layaway plan updated successfully');
      setEditModalOpen(false);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Update layaway error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update layaway plan';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Make Payment ---
  const openPaymentModal = () => {
    if (!selectedLayaway) return;
    setPaymentForm({
      amount: selectedLayaway.monthly_payment || '',
      notes: '',
    });
    setDetailOpen(false);
    setPaymentModalOpen(true);
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!selectedLayaway) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    setPaymentSaving(true);
    try {
      const payload = {
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes || null,
      };
      await api.post(`/layaway/${selectedLayaway.id}/payment`, payload);
      toast.success('Payment recorded successfully');
      setPaymentModalOpen(false);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Make payment error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to record payment';
      toast.error(message);
    } finally {
      setPaymentSaving(false);
    }
  };

  // --- Complete Layaway ---
  const openCompleteModal = () => {
    if (!selectedLayaway) return;
    setDetailOpen(false);
    setCompleteModalOpen(true);
  };

  const handleCompleteLayaway = async () => {
    if (!selectedLayaway) return;
    setCompleteSaving(true);
    try {
      await api.post(`/layaway/${selectedLayaway.id}/complete`);
      toast.success('Layaway plan completed successfully');
      setCompleteModalOpen(false);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Complete layaway error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to complete layaway plan';
      toast.error(message);
    } finally {
      setCompleteSaving(false);
    }
  };

  // --- Cancel Layaway ---
  const openCancelModal = () => {
    if (!selectedLayaway) return;
    setDetailOpen(false);
    setCancelModalOpen(true);
  };

  const handleCancelLayaway = async () => {
    if (!selectedLayaway) return;
    setCancelSaving(true);
    try {
      await api.post(`/layaway/${selectedLayaway.id}/cancel`);
      toast.success('Layaway plan cancelled');
      setCancelModalOpen(false);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Cancel layaway error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to cancel layaway plan';
      toast.error(message);
    } finally {
      setCancelSaving(false);
    }
  };

  // --- Delete Layaway ---
  const openDeleteModal = () => {
    if (!selectedLayaway) return;
    setLayawayToDelete(selectedLayaway);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteLayaway = async () => {
    if (!layawayToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/layaway/${layawayToDelete.id}`);
      toast.success('Layaway plan deleted successfully');
      setDeleteModalOpen(false);
      setLayawayToDelete(null);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Delete layaway error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete layaway plan';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getCustomerName = (layaway) => {
    if (layaway.customer) {
      return `${layaway.customer.first_name || ''} ${layaway.customer.last_name || ''}`.trim();
    }
    if (layaway.customer_name) return layaway.customer_name;
    return '-';
  };

  const getItemName = (layaway) => {
    if (layaway.inventory?.name) return layaway.inventory.name;
    if (layaway.inventory?.item_name) return layaway.inventory.item_name;
    if (layaway.inventory?.description) return layaway.inventory.description;
    if (layaway.item_name) return layaway.item_name;
    if (layaway.item_description) return layaway.item_description;
    return '-';
  };

  const getRemainingBalance = (layaway) => {
    if (layaway.remaining_balance != null) return parseFloat(layaway.remaining_balance);
    const total = parseFloat(layaway.total_price) || 0;
    const down = parseFloat(layaway.down_payment) || 0;
    const paid = parseFloat(layaway.total_paid) || 0;
    return total - down - paid;
  };

  const getAmountPaid = (layaway) => {
    const total = parseFloat(layaway.total_price) || 0;
    const remaining = getRemainingBalance(layaway);
    return total - remaining;
  };

  const isActive = (layaway) => layaway.status === 'active';

  const getCustomerLabel = (customer) => {
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return customer.phone ? `${name} (${customer.phone})` : name;
  };

  const getInventoryLabel = (item) => {
    const name = item.name || item.item_name || item.description || `Item #${item.id}`;
    const price = item.price || item.selling_price;
    return price ? `${name} (${formatCurrency(price)})` : name;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Layaway Plans</h1>
            <p className="text-sm text-gray-500">
              {layaways.length} total plan{layaways.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Layaway
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
            placeholder="Search by customer, item, or notes..."
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
          {LAYAWAY_STATUSES.map((s) => (
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Down Payment</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Monthly</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Remaining</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading layaway plans...</span>
                    </div>
                  </td>
                </tr>
              ) : layaways.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No layaway plans found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first layaway plan
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                layaways.map((layaway) => (
                  <tr
                    key={layaway.id}
                    onClick={() => handleRowClick(layaway)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {layaway.id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getCustomerName(layaway)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {getItemName(layaway)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(layaway.total_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(layaway.down_payment)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(layaway.monthly_payment)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(getRemainingBalance(layaway))}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(layaway.due_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={layaway.status} />
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
        title={selectedLayaway ? `Layaway #${selectedLayaway.id}` : 'Layaway Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedLayaway && (
          <div className="space-y-6">
            {/* ID + Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Layaway ID</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {selectedLayaway.id}
                </p>
              </div>
              <StatusBadge status={selectedLayaway.status} />
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Customer Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Name"
                  value={getCustomerName(selectedLayaway)}
                />
                <DetailRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Phone"
                  value={selectedLayaway.customer?.phone || '-'}
                />
                <DetailRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Email"
                  value={selectedLayaway.customer?.email || '-'}
                />
              </div>
            </div>

            {/* Item Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Item Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Package className="w-4 h-4 text-gray-400" />}
                  label="Item"
                  value={getItemName(selectedLayaway)}
                />
                {selectedLayaway.inventory?.category && (
                  <DetailRow
                    icon={<Package className="w-4 h-4 text-gray-400" />}
                    label="Category"
                    value={selectedLayaway.inventory.category}
                  />
                )}
                {selectedLayaway.inventory?.condition && (
                  <DetailRow
                    icon={<Package className="w-4 h-4 text-gray-400" />}
                    label="Condition"
                    value={selectedLayaway.inventory.condition}
                  />
                )}
              </div>
            </div>

            {/* Financial Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Financial Details
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Total Price"
                  value={formatCurrency(selectedLayaway.total_price)}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Down Payment"
                  value={formatCurrency(selectedLayaway.down_payment)}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Monthly Payment"
                  value={formatCurrency(selectedLayaway.monthly_payment)}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Remaining Balance"
                  value={formatCurrency(getRemainingBalance(selectedLayaway))}
                />
                <div className="pt-1">
                  <ProgressBar
                    current={getAmountPaid(selectedLayaway)}
                    total={parseFloat(selectedLayaway.total_price) || 0}
                  />
                </div>
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Due Date"
                  value={formatDate(selectedLayaway.due_date)}
                />
              </div>
            </div>

            {/* Payment History */}
            {selectedLayaway.payments && selectedLayaway.payments.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Payment History
                </h3>
                <div className="space-y-2">
                  {selectedLayaway.payments.map((payment, idx) => (
                    <div
                      key={payment.id || idx}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.payment_date || payment.created_at)}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-gray-400 max-w-[150px] truncate">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLayaway.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedLayaway.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Record Info
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Created"
                  value={formatDate(selectedLayaway.created_at)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Updated"
                  value={formatDate(selectedLayaway.updated_at)}
                />
              </div>
            </div>

            {/* Action Buttons (only for active layaways) */}
            {isActive(selectedLayaway) && (
              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openPaymentModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Make Payment
                  </button>
                  <button
                    onClick={openCompleteModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                  <button
                    onClick={openCancelModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* New Layaway Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Layaway Plan" size="lg">
        <form onSubmit={handleCreateLayaway} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={form.customer_id}
              onChange={(e) => handleFormChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCustomerLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <select
              value={form.inventory_id}
              onChange={(e) => handleFormChange('inventory_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              <option value="">Select an item...</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {getInventoryLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.total_price}
                onChange={(e) => handleFormChange('total_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.down_payment}
                onChange={(e) => handleFormChange('down_payment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.monthly_payment}
                onChange={(e) => handleFormChange('monthly_payment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => handleFormChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Create Layaway'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Layaway Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Layaway Plan" size="lg">
        <form onSubmit={handleUpdateLayaway} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={editForm.customer_id}
              onChange={(e) => handleEditFormChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCustomerLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <select
              value={editForm.inventory_id}
              onChange={(e) => handleEditFormChange('inventory_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              <option value="">Select an item...</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {getInventoryLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.total_price}
                onChange={(e) => handleEditFormChange('total_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.down_payment}
                onChange={(e) => handleEditFormChange('down_payment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.monthly_payment}
                onChange={(e) => handleEditFormChange('monthly_payment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) => handleEditFormChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => handleEditFormChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {LAYAWAY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => handleEditFormChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editSaving ? 'Saving...' : 'Update Layaway'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Make Payment Modal */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Make Layaway Payment" size="sm">
        <form onSubmit={handleMakePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentSaving ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Confirmation Modal */}
      <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Layaway" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to mark layaway{' '}
            <span className="font-semibold text-gray-900">#{selectedLayaway?.id}</span> as completed?
            This will finalize the plan and release the item to the customer.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteLayaway}
              disabled={completeSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completeSaving ? 'Completing...' : 'Complete Layaway'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Layaway" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel layaway{' '}
            <span className="font-semibold text-gray-900">#{selectedLayaway?.id}</span>? This action
            may affect refund eligibility and cannot be easily undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleCancelLayaway}
              disabled={cancelSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelSaving ? 'Cancelling...' : 'Cancel Layaway'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Layaway" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete layaway{' '}
            <span className="font-semibold text-gray-900">#{layawayToDelete?.id}</span>? This action
            cannot be undone and all associated payment records will be lost.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteLayaway}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Layaway'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
