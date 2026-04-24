import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { Bell, Search, Plus, Send, Clock, Mail, Phone, MessageSquare, FileText, RefreshCw, AlertTriangle, User } from 'lucide-react';

const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'];

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  sent: 'Sent',
  failed: 'Failed',
};

const NOTIFICATION_TYPES = ['payment_reminder', 'expiring_loan', 'default_notice', 'pickup_ready', 'general'];

const TYPE_LABELS = {
  payment_reminder: 'Payment Reminder',
  expiring_loan: 'Expiring Loan',
  default_notice: 'Default Notice',
  pickup_ready: 'Pickup Ready',
  general: 'General',
};

const TYPE_COLORS = {
  payment_reminder: 'bg-blue-100 text-blue-700',
  expiring_loan: 'bg-amber-100 text-amber-700',
  default_notice: 'bg-red-100 text-red-700',
  pickup_ready: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
};

const TYPE_ICONS = {
  payment_reminder: DollarIcon,
  expiring_loan: ClockIcon,
  default_notice: AlertIcon,
  pickup_ready: CheckIcon,
  general: InfoIcon,
};

function DollarIcon() {
  return <span className="text-[10px]">$</span>;
}
function ClockIcon() {
  return <Clock className="w-3 h-3" />;
}
function AlertIcon() {
  return <AlertTriangle className="w-3 h-3" />;
}
function CheckIcon() {
  return <Send className="w-3 h-3" />;
}
function InfoIcon() {
  return <Bell className="w-3 h-3" />;
}

const SENT_VIA_OPTIONS = ['email', 'sms', 'mail', 'phone'];

const SENT_VIA_LABELS = {
  email: 'Email',
  sms: 'SMS',
  mail: 'Mail',
  phone: 'Phone',
};

const SENT_VIA_ICONS = {
  email: Mail,
  sms: MessageSquare,
  mail: FileText,
  phone: Phone,
};

const EMPTY_FORM = {
  customer_id: '',
  loan_id: '',
  notification_type: 'general',
  message: '',
  sent_via: 'email',
};

const EMPTY_EDIT_FORM = {
  customer_id: '',
  loan_id: '',
  notification_type: '',
  message: '',
  sent_via: '',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function TypeBadge({ type }) {
  const IconComp = TYPE_ICONS[type] || InfoIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}
    >
      <IconComp />
      {TYPE_LABELS[type] || type}
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

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [customers, setCustomers] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.notification_type = typeFilter;
      const { data } = await api.get('/notifications', { params });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      toast.error('Failed to load notifications');
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
    fetchCustomers();
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchNotifications();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, typeFilter]);

  // Row click -> detail
  const handleRowClick = async (notification) => {
    try {
      const { data } = await api.get(`/notifications/${notification.id}`);
      setSelectedNotification(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch notification detail error:', err);
      toast.error('Failed to load notification details');
    }
  };

  // Helper: get customer name
  const getCustomerName = (notification) => {
    if (notification.customer) {
      return `${notification.customer.first_name || ''} ${notification.customer.last_name || ''}`.trim();
    }
    if (notification.customer_name) return notification.customer_name;
    return '-';
  };

  // --- Create Notification ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    fetchCustomers();
    fetchActiveLoans();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: parseInt(form.customer_id, 10),
        loan_id: form.loan_id ? parseInt(form.loan_id, 10) : null,
        notification_type: form.notification_type,
        message: form.message.trim(),
        sent_via: form.sent_via,
      };
      await api.post('/notifications', payload);
      toast.success('Notification created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchNotifications();
    } catch (err) {
      console.error('Create notification error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create notification';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Notification ---
  const openEditModal = () => {
    if (!selectedNotification) return;
    setEditForm({
      customer_id: selectedNotification.customer_id || '',
      loan_id: selectedNotification.loan_id || '',
      notification_type: selectedNotification.notification_type || 'general',
      message: selectedNotification.message || '',
      sent_via: selectedNotification.sent_via || 'email',
    });
    fetchCustomers();
    fetchActiveLoans();
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateNotification = async (e) => {
    e.preventDefault();
    if (!selectedNotification) return;
    if (!editForm.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (!editForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        customer_id: parseInt(editForm.customer_id, 10),
        loan_id: editForm.loan_id ? parseInt(editForm.loan_id, 10) : null,
        notification_type: editForm.notification_type,
        message: editForm.message.trim(),
        sent_via: editForm.sent_via,
      };
      await api.put(`/notifications/${selectedNotification.id}`, payload);
      toast.success('Notification updated successfully');
      setEditModalOpen(false);
      setSelectedNotification(null);
      fetchNotifications();
    } catch (err) {
      console.error('Update notification error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update notification';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Notification ---
  const openDeleteModal = () => {
    if (!selectedNotification) return;
    setNotificationToDelete(selectedNotification);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/notifications/${notificationToDelete.id}`);
      toast.success('Notification deleted successfully');
      setDeleteModalOpen(false);
      setNotificationToDelete(null);
      setSelectedNotification(null);
      fetchNotifications();
    } catch (err) {
      console.error('Delete notification error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete notification';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // --- Send Notification ---
  const handleSendNotification = async () => {
    if (!selectedNotification) return;
    setSending(true);
    try {
      await api.post(`/notifications/${selectedNotification.id}/send`);
      toast.success('Notification sent successfully');
      // Refresh the detail
      const { data } = await api.get(`/notifications/${selectedNotification.id}`);
      setSelectedNotification(data);
      fetchNotifications();
    } catch (err) {
      console.error('Send notification error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to send notification';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  // --- Auto-Generate Expiring ---
  const handleGenerateExpiring = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/notifications/generate-expiring');
      const count = data.count || data.generated || 0;
      toast.success(`Generated ${count} expiring loan notification${count !== 1 ? 's' : ''}`);
      fetchNotifications();
    } catch (err) {
      console.error('Generate expiring error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to generate notifications';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  // Helper: get sent via icon
  const getSentViaDisplay = (sentVia) => {
    const IconComp = SENT_VIA_ICONS[sentVia];
    const label = SENT_VIA_LABELS[sentVia] || sentVia || '-';
    if (IconComp) {
      return (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <IconComp className="w-3.5 h-3.5" />
          {label}
        </span>
      );
    }
    return label;
  };

  // Helper: get customer label for dropdown
  const getCustomerLabel = (customer) => {
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return name ? `#${customer.id} - ${name}` : `#${customer.id}`;
  };

  // Helper: get loan label for dropdown
  const getLoanLabel = (loan) => {
    const ticket = loan.ticket_number || `#${loan.id}`;
    const customer = loan.customer
      ? `${loan.customer.first_name || ''} ${loan.customer.last_name || ''}`.trim()
      : '';
    return customer ? `${ticket} - ${customer}` : ticket;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Notifications</h1>
            <p className="text-sm text-gray-500">
              {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateExpiring}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 disabled:bg-amber-50 text-amber-700 font-semibold rounded-lg transition-all duration-150 text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            {generating ? 'Generating...' : 'Auto-Generate Expiring'}
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            New Notification
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, message..."
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
          className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Statuses</option>
          {NOTIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Types</option>
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
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
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Message</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Sent Via</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sent At</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading notifications...</span>
                    </div>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No notifications found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first notification
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr
                    key={notification.id}
                    onClick={() => handleRowClick(notification)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {notification.id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getCustomerName(notification)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TypeBadge type={notification.notification_type} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[250px] truncate">
                      {notification.message || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {getSentViaDisplay(notification.sent_via)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(notification.sent_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={notification.status} />
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
        title={selectedNotification ? `Notification #${selectedNotification.id}` : 'Notification Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedNotification && (
          <div className="space-y-6">
            {/* ID + Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Notification ID</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {selectedNotification.id}
                </p>
              </div>
              <StatusBadge status={selectedNotification.status} />
            </div>

            {/* Send button for pending */}
            {selectedNotification.status === 'pending' && (
              <button
                onClick={handleSendNotification}
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            )}

            {/* Notification Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Notification Details
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Bell className="w-4 h-4 text-gray-400" />}
                  label="Type"
                  value={TYPE_LABELS[selectedNotification.notification_type] || selectedNotification.notification_type}
                />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Message</p>
                    <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                      {selectedNotification.message || '-'}
                    </p>
                  </div>
                </div>
                <DetailRow
                  icon={<Mail className="w-4 h-4 text-gray-400" />}
                  label="Sent Via"
                  value={SENT_VIA_LABELS[selectedNotification.sent_via] || selectedNotification.sent_via}
                />
                <DetailRow
                  icon={<Clock className="w-4 h-4 text-gray-400" />}
                  label="Sent At"
                  value={formatDate(selectedNotification.sent_at)}
                />
                <DetailRow
                  icon={<Clock className="w-4 h-4 text-gray-400" />}
                  label="Created At"
                  value={formatDate(selectedNotification.created_at)}
                />
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Customer Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Customer"
                  value={getCustomerName(selectedNotification)}
                />
                {selectedNotification.customer && (
                  <>
                    <DetailRow
                      icon={<Phone className="w-4 h-4 text-gray-400" />}
                      label="Phone"
                      value={selectedNotification.customer.phone}
                    />
                    <DetailRow
                      icon={<Mail className="w-4 h-4 text-gray-400" />}
                      label="Email"
                      value={selectedNotification.customer.email}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Linked Loan Info */}
            {(selectedNotification.loan_id || selectedNotification.loan) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Linked Loan
                </h3>
                <div className="space-y-3">
                  <DetailRow
                    icon={<FileText className="w-4 h-4 text-gray-400" />}
                    label="Loan ID"
                    value={selectedNotification.loan?.ticket_number || `#${selectedNotification.loan_id}`}
                  />
                  {selectedNotification.loan && (
                    <>
                      <DetailRow
                        icon={<FileText className="w-4 h-4 text-gray-400" />}
                        label="Loan Status"
                        value={selectedNotification.loan.status}
                      />
                      <DetailRow
                        icon={<FileText className="w-4 h-4 text-gray-400" />}
                        label="Item Description"
                        value={selectedNotification.loan.item_description}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* New Notification Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Notification" size="lg">
        <form onSubmit={handleCreateNotification} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Loan (optional)</label>
            <select
              value={form.loan_id}
              onChange={(e) => handleFormChange('loan_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              <option value="">No linked loan</option>
              {activeLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {getLoanLabel(loan)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type *</label>
            <select
              value={form.notification_type}
              onChange={(e) => handleFormChange('notification_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => handleFormChange('message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              rows={4}
              placeholder="Enter notification message..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Via *</label>
            <select
              value={form.sent_via}
              onChange={(e) => handleFormChange('sent_via', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {SENT_VIA_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {SENT_VIA_LABELS[v]}
                </option>
              ))}
            </select>
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
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Notification'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Notification Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Notification" size="lg">
        <form onSubmit={handleUpdateNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={editForm.customer_id}
              onChange={(e) => handleEditFormChange('customer_id', e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Loan (optional)</label>
            <select
              value={editForm.loan_id}
              onChange={(e) => handleEditFormChange('loan_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              <option value="">No linked loan</option>
              {activeLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {getLoanLabel(loan)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type *</label>
            <select
              value={editForm.notification_type}
              onChange={(e) => handleEditFormChange('notification_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={editForm.message}
              onChange={(e) => handleEditFormChange('message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              rows={4}
              placeholder="Enter notification message..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Via *</label>
            <select
              value={editForm.sent_via}
              onChange={(e) => handleEditFormChange('sent_via', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            >
              {SENT_VIA_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {SENT_VIA_LABELS[v]}
                </option>
              ))}
            </select>
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
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-colors"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Notification" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete notification{' '}
            <span className="font-semibold text-gray-900">
              #{notificationToDelete?.id}
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
              onClick={handleDeleteNotification}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
