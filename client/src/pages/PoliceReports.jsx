import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { FileText, Search, Plus, RefreshCw, Calendar, Shield, Hash, User, Send, Package, DollarSign } from 'lucide-react';

const REPORT_TYPES = ['daily_transaction', 'stolen_property', 'suspicious_activity'];

const STATUS_OPTIONS = ['pending', 'submitted', 'acknowledged'];

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-green-100 text-green-700',
};

const EMPTY_FORM = {
  report_date: '',
  report_type: '',
  department: '',
  officer_name: '',
  badge_number: '',
  notes: '',
};

const EMPTY_ITEM_FORM = {
  inventory_id: '',
  customer_id: '',
  transaction_type: '',
  item_description: '',
  serial_number: '',
  amount: '',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatReportType(type) {
  if (!type) return '-';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400">-</span>;
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
      {status}
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

export default function PoliceReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [inventoryItems, setInventoryItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedReport, setSelectedReport] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Add items state
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });
  const [itemSaving, setItemSaving] = useState(false);
  const [newReportId, setNewReportId] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.report_type = typeFilter;
      const { data } = await api.get('/police-reports', { params });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch police reports error:', err);
      toast.error('Failed to load police reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory');
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
    }
  };

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
      fetchReports();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, typeFilter]);

  // Row click -> detail (fetches report with items)
  const handleRowClick = async (report) => {
    try {
      const { data } = await api.get(`/police-reports/${report.id}`);
      setSelectedReport(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch report detail error:', err);
      toast.error('Failed to load report details');
    }
  };

  // --- Submit Report ---
  const handleSubmitReport = async (reportId) => {
    setSubmitting(true);
    try {
      await api.post(`/police-reports/${reportId}/submit`);
      toast.success('Report submitted successfully');
      // Refresh detail
      const { data } = await api.get(`/police-reports/${reportId}`);
      setSelectedReport(data);
      fetchReports();
    } catch (err) {
      console.error('Submit report error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to submit report';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- New Report ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!form.report_type) {
      toast.error('Please select a report type');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        report_date: form.report_date || null,
        report_type: form.report_type,
        department: form.department || null,
        officer_name: form.officer_name || null,
        badge_number: form.badge_number || null,
        notes: form.notes || null,
      };
      const { data } = await api.post('/police-reports', payload);
      toast.success('Police report created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchReports();
      // Offer to add items
      const createdId = data.id || data.report?.id;
      if (createdId) {
        setNewReportId(createdId);
        setItemForm({ ...EMPTY_ITEM_FORM });
        fetchInventory();
        fetchCustomers();
        setAddItemModalOpen(true);
      }
    } catch (err) {
      console.error('Create report error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create report';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Add Item to Report ---
  const handleItemFormChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newReportId) return;
    setItemSaving(true);
    try {
      const payload = {
        inventory_id: itemForm.inventory_id ? parseInt(itemForm.inventory_id, 10) : null,
        customer_id: itemForm.customer_id ? parseInt(itemForm.customer_id, 10) : null,
        transaction_type: itemForm.transaction_type || null,
        item_description: itemForm.item_description || null,
        serial_number: itemForm.serial_number || null,
        amount: itemForm.amount ? parseFloat(itemForm.amount) : null,
      };
      await api.post(`/police-reports/${newReportId}/items`, payload);
      toast.success('Item added to report');
      setItemForm({ ...EMPTY_ITEM_FORM });
    } catch (err) {
      console.error('Add item error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to add item';
      toast.error(message);
    } finally {
      setItemSaving(false);
    }
  };

  const closeAddItemModal = () => {
    setAddItemModalOpen(false);
    setNewReportId(null);
    setItemForm({ ...EMPTY_ITEM_FORM });
    fetchReports();
  };

  // --- Edit Report ---
  const openEditModal = () => {
    if (!selectedReport) return;
    setEditForm({
      report_date: selectedReport.report_date ? selectedReport.report_date.slice(0, 10) : '',
      report_type: selectedReport.report_type || '',
      department: selectedReport.department || '',
      officer_name: selectedReport.officer_name || '',
      badge_number: selectedReport.badge_number || '',
      notes: selectedReport.notes || '',
    });
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    if (!editForm.report_type) {
      toast.error('Report type is required');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        report_date: editForm.report_date || null,
        report_type: editForm.report_type,
        department: editForm.department || null,
        officer_name: editForm.officer_name || null,
        badge_number: editForm.badge_number || null,
        notes: editForm.notes || null,
      };
      await api.put(`/police-reports/${selectedReport.id}`, payload);
      toast.success('Report updated successfully');
      setEditModalOpen(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error('Update report error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update report';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Report ---
  const openDeleteModal = () => {
    if (!selectedReport) return;
    setReportToDelete(selectedReport);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/police-reports/${reportToDelete.id}`);
      toast.success('Report deleted successfully');
      setDeleteModalOpen(false);
      setReportToDelete(null);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error('Delete report error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete report';
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

  const getItemCount = (report) => {
    if (report.items && Array.isArray(report.items)) return report.items.length;
    if (report.item_count !== undefined) return report.item_count;
    return 0;
  };

  // Report form fields renderer
  const renderReportFields = (currentForm, onChange) => (
    <div className="space-y-4">
      {/* Report Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
        <input
          type="date"
          value={currentForm.report_date}
          onChange={(e) => onChange('report_date', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        />
      </div>

      {/* Report Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
        <select
          value={currentForm.report_type}
          onChange={(e) => onChange('report_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          required
        >
          <option value="">Select report type...</option>
          {REPORT_TYPES.map((rt) => (
            <option key={rt} value={rt}>{formatReportType(rt)}</option>
          ))}
        </select>
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input
          type="text"
          value={currentForm.department}
          onChange={(e) => onChange('department', e.target.value)}
          placeholder="e.g. City Police Department"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        />
      </div>

      {/* Officer Name & Badge */}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
          <input
            type="text"
            value={currentForm.badge_number}
            onChange={(e) => onChange('badge_number', e.target.value)}
            placeholder="Badge #"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
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
            <FileText className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Police Reports</h1>
            <p className="text-sm text-gray-500">Daily transaction reporting for law enforcement</p>
          </div>
          <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            {reports.length}
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Report
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
            placeholder="Search by department, officer, badge number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
        >
          <option value="all">All Report Types</option>
          {REPORT_TYPES.map((rt) => (
            <option key={rt} value={rt}>{formatReportType(rt)}</option>
          ))}
        </select>
        <button
          onClick={fetchReports}
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Report Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Report Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Officer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Badge #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600"># Items</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading police reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No police reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => handleRowClick(report)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{report.id}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDate(report.report_date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {formatReportType(report.report_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{report.department || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{report.officer_name || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{report.badge_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{getItemCount(report)}</td>
                    <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
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
        title={selectedReport ? `Report #${selectedReport.id}` : 'Report Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Report Information</h3>
              <div className="space-y-3">
                <DetailRow icon={<Calendar className="w-4 h-4 text-amber-500" />} label="Report Date" value={formatDate(selectedReport.report_date)} />
                <DetailRow icon={<FileText className="w-4 h-4 text-purple-500" />} label="Report Type" value={formatReportType(selectedReport.report_type)} />
                <DetailRow icon={<Shield className="w-4 h-4 text-blue-500" />} label="Department" value={selectedReport.department} />
                <DetailRow icon={<User className="w-4 h-4 text-gray-400" />} label="Officer Name" value={selectedReport.officer_name} />
                <DetailRow icon={<Hash className="w-4 h-4 text-gray-400" />} label="Badge Number" value={selectedReport.badge_number} />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0"><FileText className="w-4 h-4 text-gray-400" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Status</p>
                    <div className="mt-0.5"><StatusBadge status={selectedReport.status} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button for pending reports */}
            {selectedReport.status === 'pending' && (
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => handleSubmitReport(selectedReport.id)}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}

            {/* Add Items Button */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setNewReportId(selectedReport.id);
                  setItemForm({ ...EMPTY_ITEM_FORM });
                  fetchInventory();
                  fetchCustomers();
                  setAddItemModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Item to Report
              </button>
            </div>

            {/* Report Items */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Report Items ({selectedReport.items ? selectedReport.items.length : 0})
              </h3>
              {selectedReport.items && selectedReport.items.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-2 py-2 font-semibold text-gray-600">Item Description</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-600">Serial #</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-600">Customer</th>
                        <th className="text-left px-2 py-2 font-semibold text-gray-600">Transaction</th>
                        <th className="text-right px-2 py-2 font-semibold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedReport.items.map((item, idx) => {
                        const custName = item.customer
                          ? `${item.customer.first_name || ''} ${item.customer.last_name || ''}`.trim()
                          : item.customer_name || '-';
                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-gray-700">{item.item_description || '-'}</td>
                            <td className="px-2 py-2 font-mono text-gray-500">{item.serial_number || '-'}</td>
                            <td className="px-2 py-2 text-gray-700">{custName}</td>
                            <td className="px-2 py-2 text-gray-700">{formatReportType(item.transaction_type)}</td>
                            <td className="px-2 py-2 text-right text-gray-700">{item.amount ? formatCurrency(item.amount) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No items in this report</p>
              )}
            </div>

            {/* Notes */}
            {selectedReport.notes && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Create Report Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Police Report" size="lg">
        <form onSubmit={handleCreateReport}>
          {renderReportFields(form, handleFormChange)}
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
              {saving ? 'Saving...' : 'Create Report'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={addItemModalOpen} onClose={closeAddItemModal} title={`Add Item to Report #${newReportId}`} size="lg">
        <form onSubmit={handleAddItem}>
          <div className="space-y-4">
            {/* Inventory Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item</label>
              <select
                value={itemForm.inventory_id}
                onChange={(e) => handleItemFormChange('inventory_id', e.target.value)}
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
                value={itemForm.customer_id}
                onChange={(e) => handleItemFormChange('customer_id', e.target.value)}
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

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <input
                type="text"
                value={itemForm.transaction_type}
                onChange={(e) => handleItemFormChange('transaction_type', e.target.value)}
                placeholder="e.g. pawn, purchase, sale"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              />
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Description</label>
              <input
                type="text"
                value={itemForm.item_description}
                onChange={(e) => handleItemFormChange('item_description', e.target.value)}
                placeholder="Describe the item"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
              />
            </div>

            {/* Serial Number & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={itemForm.serial_number}
                  onChange={(e) => handleItemFormChange('serial_number', e.target.value)}
                  placeholder="Serial #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.amount}
                  onChange={(e) => handleItemFormChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={closeAddItemModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={itemSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {itemSaving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Report Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Police Report" size="lg">
        <form onSubmit={handleUpdateReport}>
          {renderReportFields(editForm, handleEditFormChange)}
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
              {editSaving ? 'Saving...' : 'Update Report'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Police Report" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this police report?
          </p>
          {reportToDelete && (
            <div className="bg-red-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-900">Report #{reportToDelete.id}</p>
              <p className="text-red-700">{formatReportType(reportToDelete.report_type)} - {formatDate(reportToDelete.report_date)}</p>
            </div>
          )}
          <p className="text-xs text-red-500 font-medium">
            This action cannot be undone. All report items will also be deleted.
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
              onClick={handleDeleteReport}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Report'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
