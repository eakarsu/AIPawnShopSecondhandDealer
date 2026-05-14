import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { Banknote, Search, Plus, Calendar, DollarSign, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const LOAN_STATUSES = ['active', 'extended', 'defaulted', 'redeemed', 'in_grace_period'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  extended: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-red-100 text-red-700',
  redeemed: 'bg-gray-100 text-gray-700',
  in_grace_period: 'bg-amber-100 text-amber-700',
};

const STATUS_LABELS = {
  active: 'Active',
  extended: 'Extended',
  defaulted: 'Defaulted',
  redeemed: 'Redeemed',
  in_grace_period: 'Grace Period',
};

const EMPTY_LOAN_FORM = {
  customer_id: '',
  item_description: '',
  principal_amount: '',
  interest_rate: '25',
  loan_period_days: '30',
  notes: '',
};

const EMPTY_EDIT_FORM = {
  customer_id: '',
  item_description: '',
  principal_amount: '',
  interest_rate: '',
  loan_period_days: '',
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

function daysRemaining(maturityDate) {
  if (!maturityDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturity = new Date(maturityDate);
  maturity.setHours(0, 0, 0, 0);
  const diffMs = maturity - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

function isActionableStatus(status) {
  return ['active', 'extended', 'in_grace_period'].includes(status);
}

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [customers, setCustomers] = useState([]);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_LOAN_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendForm, setExtendForm] = useState({ days_to_extend: '', extension_fee: '' });
  const [extendSaving, setExtendSaving] = useState(false);

  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [redeemForm, setRedeemForm] = useState({ payment_amount: '', payment_type: 'cash' });
  const [redeemSaving, setRedeemSaving] = useState(false);

  const [forfeitModalOpen, setForfeitModalOpen] = useState(false);
  const [forfeitSaving, setForfeitSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch loans
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/loans', { params });
      if (Array.isArray(data)) {
        setLoans(data);
      } else {
        setLoans(data.data || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Fetch loans error:', err);
      toast.error('Failed to load loans');
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
      fetchLoans();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, page]);

  // Row click -> detail
  const handleRowClick = async (loan) => {
    try {
      const { data } = await api.get(`/loans/${loan.id}`);
      setSelectedLoan(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch loan detail error:', err);
      toast.error('Failed to load loan details');
    }
  };

  // --- New Loan ---
  const openAddModal = () => {
    setForm({ ...EMPTY_LOAN_FORM });
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!form.item_description.trim()) {
      toast.error('Item description is required');
      return;
    }
    if (!form.principal_amount || parseFloat(form.principal_amount) <= 0) {
      toast.error('Principal amount is required and must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id || null,
        item_description: form.item_description,
        principal_amount: parseFloat(form.principal_amount),
        interest_rate: parseFloat(form.interest_rate) || 25,
        loan_period_days: parseInt(form.loan_period_days, 10) || 30,
        notes: form.notes || null,
      };
      await api.post('/loans', payload);
      toast.success('Loan created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_LOAN_FORM });
      fetchLoans();
    } catch (err) {
      console.error('Create loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create loan';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Loan ---
  const openEditModal = () => {
    if (!selectedLoan) return;
    setEditForm({
      customer_id: selectedLoan.customer_id || '',
      item_description: selectedLoan.item_description || '',
      principal_amount: selectedLoan.principal_amount || '',
      interest_rate: selectedLoan.interest_rate || '',
      loan_period_days: selectedLoan.loan_period_days || '',
      notes: selectedLoan.notes || '',
      status: selectedLoan.status || '',
    });
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateLoan = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (!editForm.item_description.trim()) {
      toast.error('Item description is required');
      return;
    }
    if (!editForm.principal_amount || parseFloat(editForm.principal_amount) <= 0) {
      toast.error('Principal amount is required and must be greater than 0');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        customer_id: editForm.customer_id || null,
        item_description: editForm.item_description,
        principal_amount: parseFloat(editForm.principal_amount),
        interest_rate: parseFloat(editForm.interest_rate),
        loan_period_days: parseInt(editForm.loan_period_days, 10),
        notes: editForm.notes || null,
        status: editForm.status,
      };
      await api.put(`/loans/${selectedLoan.id}`, payload);
      toast.success('Loan updated successfully');
      setEditModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      console.error('Update loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update loan';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Extend Loan ---
  const openExtendModal = () => {
    if (!selectedLoan) return;
    setExtendForm({ days_to_extend: '', extension_fee: '' });
    setDetailOpen(false);
    setExtendModalOpen(true);
  };

  const handleExtendLoan = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (!extendForm.days_to_extend || parseInt(extendForm.days_to_extend, 10) <= 0) {
      toast.error('Days to extend must be greater than 0');
      return;
    }
    setExtendSaving(true);
    try {
      const payload = {
        days_to_extend: parseInt(extendForm.days_to_extend, 10),
        extension_fee: parseFloat(extendForm.extension_fee) || 0,
      };
      await api.post(`/loans/${selectedLoan.id}/extend`, payload);
      toast.success('Loan extended successfully');
      setExtendModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      console.error('Extend loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to extend loan';
      toast.error(message);
    } finally {
      setExtendSaving(false);
    }
  };

  // --- Redeem Loan ---
  const openRedeemModal = () => {
    if (!selectedLoan) return;
    setRedeemForm({
      payment_amount: selectedLoan.total_due || '',
      payment_type: 'cash',
    });
    setDetailOpen(false);
    setRedeemModalOpen(true);
  };

  const handleRedeemLoan = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (!redeemForm.payment_amount || parseFloat(redeemForm.payment_amount) <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    setRedeemSaving(true);
    try {
      const payload = {
        payment_amount: parseFloat(redeemForm.payment_amount),
        payment_type: redeemForm.payment_type,
      };
      await api.post(`/loans/${selectedLoan.id}/redeem`, payload);
      toast.success('Loan redeemed successfully');
      setRedeemModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      console.error('Redeem loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to redeem loan';
      toast.error(message);
    } finally {
      setRedeemSaving(false);
    }
  };

  // --- Forfeit Loan ---
  const openForfeitModal = () => {
    if (!selectedLoan) return;
    setDetailOpen(false);
    setForfeitModalOpen(true);
  };

  const handleForfeitLoan = async () => {
    if (!selectedLoan) return;
    setForfeitSaving(true);
    try {
      await api.post(`/loans/${selectedLoan.id}/forfeit`);
      toast.success('Loan forfeited/defaulted successfully');
      setForfeitModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      console.error('Forfeit loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to forfeit loan';
      toast.error(message);
    } finally {
      setForfeitSaving(false);
    }
  };

  // --- Delete Loan ---
  const openDeleteModal = () => {
    if (!selectedLoan) return;
    setLoanToDelete(selectedLoan);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteLoan = async () => {
    if (!loanToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/loans/${loanToDelete.id}`);
      toast.success('Loan deleted successfully');
      setDeleteModalOpen(false);
      setLoanToDelete(null);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      console.error('Delete loan error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete loan';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Customer name helper
  const getCustomerName = (loan) => {
    if (loan.customer) {
      return `${loan.customer.first_name || ''} ${loan.customer.last_name || ''}`.trim();
    }
    if (loan.customer_name) return loan.customer_name;
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Banknote className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pawn Loans</h1>
            <p className="text-sm text-gray-500">
              {loans.length} total loan{loans.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Loan
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
            placeholder="Search by ticket, customer, or item..."
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
          {LOAN_STATUSES.map((s) => (
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ticket #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item Description</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Principal ($)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Interest Rate (%)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Loan Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Maturity Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Due ($)</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading loans...</span>
                    </div>
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Banknote className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No loans found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first loan
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr
                    key={loan.id}
                    onClick={() => handleRowClick(loan)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {loan.ticket_number || loan.id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getCustomerName(loan)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {loan.item_description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(loan.principal_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {loan.interest_rate != null ? `${loan.interest_rate}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(loan.loan_date || loan.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(loan.maturity_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(loan.total_due)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={loan.status} />
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
        title={selectedLoan ? `Loan #${selectedLoan.ticket_number || selectedLoan.id}` : 'Loan Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedLoan && (
          <div className="space-y-6">
            {/* Ticket + Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Ticket Number</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {selectedLoan.ticket_number || selectedLoan.id}
                </p>
              </div>
              <StatusBadge status={selectedLoan.status} />
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Customer Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Banknote className="w-4 h-4 text-gray-400" />}
                  label="Name"
                  value={getCustomerName(selectedLoan)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Phone"
                  value={selectedLoan.customer?.phone || selectedLoan.customer_phone || '-'}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Email"
                  value={selectedLoan.customer?.email || selectedLoan.customer_email || '-'}
                />
              </div>
            </div>

            {/* Item Description */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Item Description
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                {selectedLoan.item_description || '-'}
              </p>
            </div>

            {/* Financial Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Financial Details
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Principal"
                  value={formatCurrency(selectedLoan.principal_amount)}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Interest Rate"
                  value={selectedLoan.interest_rate != null ? `${selectedLoan.interest_rate}%` : '-'}
                />
                <DetailRow
                  icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                  label="Total Due"
                  value={formatCurrency(selectedLoan.total_due)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Loan Date"
                  value={formatDate(selectedLoan.loan_date || selectedLoan.created_at)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Maturity Date"
                  value={formatDate(selectedLoan.maturity_date)}
                />
                {selectedLoan.maturity_date && (
                  <DetailRow
                    icon={<AlertTriangle className="w-4 h-4 text-gray-400" />}
                    label="Days Remaining"
                    value={(() => {
                      const days = daysRemaining(selectedLoan.maturity_date);
                      if (days === null) return '-';
                      if (days < 0) return `${Math.abs(days)} days overdue`;
                      if (days === 0) return 'Due today';
                      return `${days} day${days !== 1 ? 's' : ''}`;
                    })()}
                  />
                )}
              </div>
            </div>

            {/* Payment History */}
            {selectedLoan.payments && selectedLoan.payments.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Payment History
                </h3>
                <div className="space-y-2">
                  {selectedLoan.payments.map((payment, idx) => (
                    <div
                      key={payment.id || idx}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount || payment.payment_amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_type || payment.type || 'Payment'} &middot; {formatDate(payment.payment_date || payment.created_at)}
                        </p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extension History */}
            {selectedLoan.extensions && selectedLoan.extensions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Extension History
                </h3>
                <div className="space-y-2">
                  {selectedLoan.extensions.map((ext, idx) => (
                    <div
                      key={ext.id || idx}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          +{ext.days_extended || ext.days_to_extend} days
                        </p>
                        <p className="text-xs text-gray-500">
                          Fee: {formatCurrency(ext.extension_fee || ext.fee)} &middot; {formatDate(ext.extension_date || ext.created_at)}
                        </p>
                      </div>
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLoan.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedLoan.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {isActionableStatus(selectedLoan.status) && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openExtendModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Extend Loan
                  </button>
                  <button
                    onClick={openRedeemModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Redeem Loan
                  </button>
                  <button
                    onClick={openForfeitModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Forfeit/Default
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* New Loan Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setForm({ ...EMPTY_LOAN_FORM });
        }}
        title="New Pawn Loan"
        size="lg"
      >
        <form onSubmit={handleCreateLoan} className="space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={form.customer_id}
              onChange={(e) => handleFormChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
            >
              <option value="">Select a customer (optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} {c.phone ? `- ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.item_description}
              onChange={(e) => handleFormChange('item_description', e.target.value)}
              placeholder="Describe the item being pawned..."
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Principal & Interest */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Principal Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.principal_amount}
                onChange={(e) => handleFormChange('principal_amount', e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.interest_rate}
                onChange={(e) => handleFormChange('interest_rate', e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Loan Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Period (days)</label>
            <input
              type="number"
              min="1"
              value={form.loan_period_days}
              onChange={(e) => handleFormChange('loan_period_days', e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setForm({ ...EMPTY_LOAN_FORM });
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
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Create Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Loan Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditForm({ ...EMPTY_EDIT_FORM });
        }}
        title="Edit Loan"
        size="lg"
      >
        <form onSubmit={handleUpdateLoan} className="space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={editForm.customer_id}
              onChange={(e) => handleEditFormChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
            >
              <option value="">Select a customer (optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} {c.phone ? `- ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editForm.item_description}
              onChange={(e) => handleEditFormChange('item_description', e.target.value)}
              placeholder="Describe the item being pawned..."
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Principal & Interest */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Principal Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.principal_amount}
                onChange={(e) => handleEditFormChange('principal_amount', e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editForm.interest_rate}
                onChange={(e) => handleEditFormChange('interest_rate', e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Loan Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Period (days)</label>
            <input
              type="number"
              min="1"
              value={editForm.loan_period_days}
              onChange={(e) => handleEditFormChange('loan_period_days', e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => handleEditFormChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
            >
              {LOAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => handleEditFormChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditForm({ ...EMPTY_EDIT_FORM });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {editSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Update Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Extend Loan Modal */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => {
          setExtendModalOpen(false);
          setExtendForm({ days_to_extend: '', extension_fee: '' });
        }}
        title="Extend Loan"
        size="sm"
      >
        <form onSubmit={handleExtendLoan} className="space-y-5">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Extending loan <span className="font-semibold">#{selectedLoan?.ticket_number || selectedLoan?.id}</span>.
              Current maturity date: <span className="font-semibold">{formatDate(selectedLoan?.maturity_date)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days to Extend <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={extendForm.days_to_extend}
              onChange={(e) => setExtendForm((prev) => ({ ...prev, days_to_extend: e.target.value }))}
              placeholder="30"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extension Fee ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={extendForm.extension_fee}
              onChange={(e) => setExtendForm((prev) => ({ ...prev, extension_fee: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setExtendModalOpen(false);
                setExtendForm({ days_to_extend: '', extension_fee: '' });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={extendSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {extendSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Extend Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Redeem Loan Modal */}
      <Modal
        isOpen={redeemModalOpen}
        onClose={() => {
          setRedeemModalOpen(false);
          setRedeemForm({ payment_amount: '', payment_type: 'cash' });
        }}
        title="Redeem Loan"
        size="sm"
      >
        <form onSubmit={handleRedeemLoan} className="space-y-5">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Redeeming loan <span className="font-semibold">#{selectedLoan?.ticket_number || selectedLoan?.id}</span>.
              Total due: <span className="font-semibold">{formatCurrency(selectedLoan?.total_due)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={redeemForm.payment_amount}
              onChange={(e) => setRedeemForm((prev) => ({ ...prev, payment_amount: e.target.value }))}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
            <select
              value={redeemForm.payment_type}
              onChange={(e) => setRedeemForm((prev) => ({ ...prev, payment_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm bg-white"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setRedeemModalOpen(false);
                setRedeemForm({ payment_amount: '', payment_type: 'cash' });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={redeemSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {redeemSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Redeem Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Forfeit/Default Modal */}
      <Modal
        isOpen={forfeitModalOpen}
        onClose={() => setForfeitModalOpen(false)}
        title="Forfeit / Default Loan"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-1">
                Are you sure you want to forfeit/default loan{' '}
                <span className="font-semibold">#{selectedLoan?.ticket_number || selectedLoan?.id}</span>?
                The pawned item will be forfeited and the loan will be marked as defaulted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setForfeitModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForfeitLoan}
              disabled={forfeitSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {forfeitSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Forfeit Loan
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLoanToDelete(null);
        }}
        title="Delete Loan"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-1">
                Are you sure you want to permanently delete loan{' '}
                <span className="font-semibold">#{loanToDelete?.ticket_number || loanToDelete?.id}</span>?
                All associated records may be affected.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setLoanToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteLoan}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Delete Loan
            </button>
          </div>
        </div>
      </Modal>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages} ({pagination.total} loans)
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
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
