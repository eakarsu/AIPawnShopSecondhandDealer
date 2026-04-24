import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { CreditCard, Search, Plus, DollarSign, Calendar, FileText, RefreshCw } from 'lucide-react';

const PAYMENT_TYPES = ['interest', 'principal', 'redemption', 'fee'];

const PAYMENT_TYPE_LABELS = {
  interest: 'Interest',
  principal: 'Principal',
  redemption: 'Redemption',
  fee: 'Fee',
};

const PAYMENT_TYPE_COLORS = {
  interest: 'bg-amber-100 text-amber-700',
  principal: 'bg-blue-100 text-blue-700',
  redemption: 'bg-green-100 text-green-700',
  fee: 'bg-gray-100 text-gray-700',
};

const EMPTY_FORM = {
  loan_id: '',
  amount: '',
  payment_type: 'interest',
  payment_date: new Date().toISOString().split('T')[0],
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

function PaymentTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}
    >
      {PAYMENT_TYPE_LABELS[type] || type}
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

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [activeLoans, setActiveLoans] = useState([]);

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/payments', { params });
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch payments error:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch active loans for dropdown
  const fetchActiveLoans = async () => {
    try {
      const { data } = await api.get('/loans', { params: { status: 'active' } });
      setActiveLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch active loans error:', err);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPayments();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // Row click -> detail
  const handleRowClick = async (payment) => {
    try {
      const { data } = await api.get(`/payments/${payment.id}`);
      setSelectedPayment(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch payment detail error:', err);
      toast.error('Failed to load payment details');
    }
  };

  // --- Record Payment ---
  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      payment_date: new Date().toISOString().split('T')[0],
    });
    fetchActiveLoans();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!form.loan_id) {
      toast.error('Please select a loan');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        loan_id: parseInt(form.loan_id, 10),
        amount: parseFloat(form.amount),
        payment_type: form.payment_type,
        payment_date: form.payment_date || null,
        notes: form.notes || null,
      };
      await api.post('/payments', payload);
      toast.success('Payment recorded successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchPayments();
    } catch (err) {
      console.error('Create payment error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to record payment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Delete Payment ---
  const openDeleteModal = () => {
    if (!selectedPayment) return;
    setPaymentToDelete(selectedPayment);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/payments/${paymentToDelete.id}`);
      toast.success('Payment deleted successfully');
      setDeleteModalOpen(false);
      setPaymentToDelete(null);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error('Delete payment error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete payment';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getCustomerName = (payment) => {
    if (payment.customer) {
      return `${payment.customer.first_name || ''} ${payment.customer.last_name || ''}`.trim();
    }
    if (payment.loan?.customer) {
      const c = payment.loan.customer;
      return `${c.first_name || ''} ${c.last_name || ''}`.trim();
    }
    if (payment.customer_name) return payment.customer_name;
    return '-';
  };

  const getLoanTicket = (payment) => {
    if (payment.loan?.ticket_number) return payment.loan.ticket_number;
    if (payment.ticket_number) return payment.ticket_number;
    if (payment.loan_id) return `#${payment.loan_id}`;
    return '-';
  };

  const getLoanLabel = (loan) => {
    const ticket = loan.ticket_number || `#${loan.id}`;
    const customer = loan.customer
      ? `${loan.customer.first_name || ''} ${loan.customer.last_name || ''}`.trim()
      : '';
    const amount = formatCurrency(loan.principal_amount);
    return customer ? `${ticket} - ${customer} (${amount})` : `${ticket} (${amount})`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <CreditCard className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">
              {payments.length} total payment{payments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket, customer, or notes..."
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Loan Ticket #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Payment Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No payments found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Record your first payment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => handleRowClick(payment)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {payment.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {getLoanTicket(payment)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getCustomerName(payment)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentTypeBadge type={payment.payment_type} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(payment.payment_date || payment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {payment.notes || '-'}
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
        title={selectedPayment ? `Payment #${selectedPayment.id}` : 'Payment Details'}
        onDelete={openDeleteModal}
      >
        {selectedPayment && (
          <div className="space-y-6">
            {/* Payment ID + Type */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Payment ID</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {selectedPayment.id}
                </p>
              </div>
              <PaymentTypeBadge type={selectedPayment.payment_type} />
            </div>

            {/* Payment Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Payment Details
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Amount"
                  value={formatCurrency(selectedPayment.amount)}
                />
                <DetailRow
                  icon={<CreditCard className="w-4 h-4 text-gray-400" />}
                  label="Payment Type"
                  value={PAYMENT_TYPE_LABELS[selectedPayment.payment_type] || selectedPayment.payment_type}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Payment Date"
                  value={formatDate(selectedPayment.payment_date || selectedPayment.created_at)}
                />
              </div>
            </div>

            {/* Loan Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Loan Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<FileText className="w-4 h-4 text-gray-400" />}
                  label="Loan Ticket #"
                  value={getLoanTicket(selectedPayment)}
                />
                <DetailRow
                  icon={<CreditCard className="w-4 h-4 text-gray-400" />}
                  label="Customer"
                  value={getCustomerName(selectedPayment)}
                />
                {selectedPayment.loan && (
                  <>
                    <DetailRow
                      icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                      label="Loan Principal"
                      value={formatCurrency(selectedPayment.loan.principal_amount)}
                    />
                    <DetailRow
                      icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                      label="Loan Total Due"
                      value={formatCurrency(selectedPayment.loan.total_due)}
                    />
                    <DetailRow
                      icon={<FileText className="w-4 h-4 text-gray-400" />}
                      label="Loan Status"
                      value={selectedPayment.loan.status}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedPayment.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedPayment.notes}
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
                  value={formatDate(selectedPayment.created_at)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Updated"
                  value={formatDate(selectedPayment.updated_at)}
                />
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Record Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan *</label>
            <select
              value={form.loan_id}
              onChange={(e) => handleFormChange('loan_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              <option value="">Select a loan...</option>
              {activeLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {getLoanLabel(loan)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => handleFormChange('amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
            <select
              value={form.payment_type}
              onChange={(e) => handleFormChange('payment_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              required
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PAYMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => handleFormChange('payment_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
            />
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
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Payment" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete payment{' '}
            <span className="font-semibold text-gray-900">#{paymentToDelete?.id}</span>? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePayment}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
