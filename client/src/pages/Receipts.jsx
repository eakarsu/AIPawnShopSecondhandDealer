import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import {
  Receipt,
  Search,
  Plus,
  RefreshCw,
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  Printer,
  Trash2,
  X,
} from 'lucide-react';

const RECEIPT_TYPES = [
  'pawn_loan',
  'redemption',
  'retail_sale',
  'layaway_payment',
  'purchase',
  'extension',
];

const RECEIPT_TYPE_LABELS = {
  pawn_loan: 'Pawn Loan',
  redemption: 'Redemption',
  retail_sale: 'Retail Sale',
  layaway_payment: 'Layaway Payment',
  purchase: 'Purchase',
  extension: 'Extension',
};

const RECEIPT_TYPE_COLORS = {
  pawn_loan: 'bg-amber-100 text-amber-700',
  redemption: 'bg-green-100 text-green-700',
  retail_sale: 'bg-blue-100 text-blue-700',
  layaway_payment: 'bg-purple-100 text-purple-700',
  purchase: 'bg-orange-100 text-orange-700',
  extension: 'bg-teal-100 text-teal-700',
};

const PAYMENT_METHODS = ['cash', 'card', 'check'];

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  check: 'Check',
};

const EMPTY_FORM = {
  receipt_type: 'retail_sale',
  customer_id: '',
  items: [{ name: '', price: '' }],
  tax_rate: '8.5',
  payment_method: 'cash',
  notes: '',
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

function ReceiptTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        RECEIPT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {RECEIPT_TYPE_LABELS[type] || type}
    </span>
  );
}

function parseItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getCustomerName(receipt) {
  if (receipt.customer) {
    return `${receipt.customer.first_name || ''} ${receipt.customer.last_name || ''}`.trim();
  }
  if (receipt.customer_name) return receipt.customer_name;
  return '-';
}

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [customers, setCustomers] = useState([]);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, items: [{ name: '', price: '' }] });
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch receipts
  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.receipt_type = typeFilter;
      const { data } = await api.get('/receipts', { params });
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch receipts error:', err);
      toast.error('Failed to load receipts');
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchReceipts();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, typeFilter]);

  // Row click -> detail
  const handleRowClick = async (receipt) => {
    try {
      const { data } = await api.get(`/receipts/${receipt.id}`);
      setSelectedReceipt(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch receipt detail error:', err);
      toast.error('Failed to load receipt details');
    }
  };

  // --- Create Receipt ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM, items: [{ name: '', price: '' }] });
    fetchCustomers();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Items management
  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', price: '' }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  // Calculated values
  const calcSubtotal = () => {
    return form.items.reduce((sum, item) => {
      const price = parseFloat(item.price);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const calcTax = () => {
    const subtotal = calcSubtotal();
    const rate = parseFloat(form.tax_rate) || 0;
    return subtotal * (rate / 100);
  };

  const calcTotal = () => {
    return calcSubtotal() + calcTax();
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    const validItems = form.items.filter(
      (item) => item.name.trim() && item.price && parseFloat(item.price) > 0
    );
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a name and price');
      return;
    }
    setSaving(true);
    try {
      const subtotal = calcSubtotal();
      const tax = calcTax();
      const total = calcTotal();
      const payload = {
        receipt_type: form.receipt_type,
        customer_id: form.customer_id ? parseInt(form.customer_id, 10) : null,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          price: parseFloat(item.price),
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_amount: parseFloat(tax.toFixed(2)),
        tax_rate: parseFloat(form.tax_rate) || 0,
        total_amount: parseFloat(total.toFixed(2)),
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
      };
      await api.post('/receipts', payload);
      toast.success('Receipt created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM, items: [{ name: '', price: '' }] });
      fetchReceipts();
    } catch (err) {
      console.error('Create receipt error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to create receipt';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Delete Receipt ---
  const openDeleteModal = () => {
    if (!selectedReceipt) return;
    setReceiptToDelete(selectedReceipt);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/receipts/${receiptToDelete.id}`);
      toast.success('Receipt deleted successfully');
      setDeleteModalOpen(false);
      setReceiptToDelete(null);
      setSelectedReceipt(null);
      fetchReceipts();
    } catch (err) {
      console.error('Delete receipt error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to delete receipt';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // --- Print Receipt ---
  const handlePrintReceipt = () => {
    window.print();
  };

  // Get customer label for dropdown
  const getCustomerLabel = (customer) => {
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return name || `Customer #${customer.id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Receipt className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Receipts
              <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {receipts.length}
              </span>
            </h1>
            <p className="text-sm text-gray-500">
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Receipt
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt #, customer..."
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white min-w-[180px]"
        >
          <option value="">All Types</option>
          {RECEIPT_TYPES.map((type) => (
            <option key={type} value={type}>
              {RECEIPT_TYPE_LABELS[type]}
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Receipt #</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Subtotal</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Tax</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading receipts...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No receipts found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    onClick={() => handleRowClick(receipt)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {receipt.receipt_number || `#${receipt.id}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ReceiptTypeBadge type={receipt.receipt_type} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getCustomerName(receipt)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(receipt.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(receipt.tax_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {formatCurrency(receipt.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {receipt.payment_method || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(receipt.receipt_date || receipt.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel - Receipt Style */}
      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={
          selectedReceipt
            ? `Receipt ${selectedReceipt.receipt_number || '#' + selectedReceipt.id}`
            : 'Receipt Details'
        }
        onDelete={openDeleteModal}
      >
        {selectedReceipt && (
          <div className="space-y-6">
            {/* Receipt-style display */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 print:border-black print:bg-white" id="receipt-printable">
              {/* Store Header */}
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Gold Shield Pawn</h2>
                <p className="text-xs text-gray-500 mt-1">Thank you for your business</p>
              </div>

              {/* Receipt Info */}
              <div className="flex justify-between text-xs text-gray-600 mb-4">
                <div>
                  <p className="font-semibold">
                    Receipt: {selectedReceipt.receipt_number || `#${selectedReceipt.id}`}
                  </p>
                  <p>
                    Date: {formatDateTime(selectedReceipt.receipt_date || selectedReceipt.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <ReceiptTypeBadge type={selectedReceipt.receipt_type} />
                </div>
              </div>

              {/* Customer */}
              {getCustomerName(selectedReceipt) !== '-' && (
                <div className="text-xs text-gray-600 mb-4 pb-3 border-b border-dashed border-gray-300">
                  <p className="font-semibold">Customer:</p>
                  <p>{getCustomerName(selectedReceipt)}</p>
                  {selectedReceipt.customer?.phone && (
                    <p>{selectedReceipt.customer.phone}</p>
                  )}
                  {selectedReceipt.customer?.email && (
                    <p>{selectedReceipt.customer.email}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold text-gray-700 border-b border-gray-300 pb-1 mb-2">
                  <span>Item</span>
                  <span>Price</span>
                </div>
                {parseItems(selectedReceipt.items).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-700 py-1">
                    <span className="flex-1 truncate pr-3">{item.name || item.description || `Item ${idx + 1}`}</span>
                    <span className="shrink-0 font-mono">
                      {formatCurrency(item.price || item.amount || 0)}
                    </span>
                  </div>
                ))}
                {parseItems(selectedReceipt.items).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No items listed</p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-300 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Tax
                    {selectedReceipt.tax_rate
                      ? ` (${selectedReceipt.tax_rate}%)`
                      : ''}
                  </span>
                  <span className="font-mono">
                    {formatCurrency(selectedReceipt.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatCurrency(selectedReceipt.total_amount)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-center">
                <p className="text-xs text-gray-500">
                  Paid via{' '}
                  <span className="font-semibold capitalize">
                    {selectedReceipt.payment_method || '-'}
                  </span>
                </p>
              </div>

              {/* Notes */}
              {selectedReceipt.notes && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                  <p className="text-xs text-gray-500">
                    Notes: {selectedReceipt.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Print + PDF Buttons */}
            <div className="flex gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <a
                href={`/api/receipts/${selectedReceipt.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                PDF Download
              </a>
            </div>

            {/* Timestamps */}
            <div className="print:hidden">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Record Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="text-sm text-gray-900 break-words">
                      {formatDate(selectedReceipt.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Updated</p>
                    <p className="text-sm text-gray-900 break-words">
                      {formatDate(selectedReceipt.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* New Receipt Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Receipt" size="lg">
        <form onSubmit={handleCreateReceipt} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Type *
              </label>
              <select
                value={form.receipt_type}
                onChange={(e) => handleFormChange('receipt_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
                required
              >
                {RECEIPT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {RECEIPT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={form.customer_id}
                onChange={(e) => handleFormChange('customer_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              >
                <option value="">Select customer (optional)...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {getCustomerLabel(customer)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    placeholder="Price"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {/* Tax Rate + Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.tax_rate}
                onChange={(e) => handleFormChange('tax_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                placeholder="8.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => handleFormChange('payment_method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-calculated totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">{formatCurrency(calcSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax ({form.tax_rate || 0}%)</span>
              <span className="font-mono font-medium">{formatCurrency(calcTax())}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(calcTotal())}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              rows={2}
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
              {saving ? 'Creating...' : 'Create Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Receipt"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete receipt{' '}
            <span className="font-semibold text-gray-900">
              {receiptToDelete?.receipt_number || `#${receiptToDelete?.id}`}
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
              onClick={handleDeleteReceipt}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Receipt'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-printable,
          #receipt-printable * {
            visibility: visible;
          }
          #receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
