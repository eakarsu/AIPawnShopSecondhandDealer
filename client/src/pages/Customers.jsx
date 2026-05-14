import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Flag,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';

const ID_TYPES = [
  "Driver's License",
  'State ID',
  'Passport',
  'Military ID',
  'Other',
];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  id_type: '',
  id_number: '',
  id_expiry: '',
  date_of_birth: '',
  notes: '',
  flagged: false,
  flag_reason: '',
};

export default function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFlagged, setFilterFlagged] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [customerRiskLoading, setCustomerRiskLoading] = useState(false);
  const [customerRiskResult, setCustomerRiskResult] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (filterFlagged === 'flagged') params.flagged = 'true';
      if (filterFlagged === 'clean') params.flagged = 'false';

      const { data } = await api.get('/customers', { params });
      if (Array.isArray(data)) {
        setCustomers(data);
      } else {
        setCustomers(data.data || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, filterFlagged, page]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchCustomers]);

  const handleCustomerRiskScore = async (customerId) => {
    setCustomerRiskLoading(true);
    setCustomerRiskResult(null);
    try {
      const { data } = await api.post('/ai/customer-risk-score', { customer_id: customerId });
      setCustomerRiskResult(data);
      toast.success('Customer risk score generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate risk score');
    } finally {
      setCustomerRiskLoading(false);
    }
  };

  const handleRowClick = async (customer) => {
    try {
      const { data } = await api.get(`/customers/${customer.id}`);
      setSelectedCustomer(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch customer detail error:', err);
      toast.error('Failed to load customer details');
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedCustomer) return;
    setEditingCustomer(selectedCustomer);
    setForm({
      first_name: selectedCustomer.first_name || '',
      last_name: selectedCustomer.last_name || '',
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
      city: selectedCustomer.city || '',
      state: selectedCustomer.state || '',
      zip: selectedCustomer.zip || '',
      id_type: selectedCustomer.id_type || '',
      id_number: selectedCustomer.id_number || '',
      id_expiry: selectedCustomer.id_expiry ? selectedCustomer.id_expiry.slice(0, 10) : '',
      date_of_birth: selectedCustomer.date_of_birth ? selectedCustomer.date_of_birth.slice(0, 10) : '',
      notes: selectedCustomer.notes || '',
      flagged: selectedCustomer.flagged || false,
      flag_reason: selectedCustomer.flag_reason || '',
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const openDeleteModal = () => {
    if (!selectedCustomer) return;
    setCustomerToDelete(selectedCustomer);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        id_expiry: form.id_expiry || null,
        date_of_birth: form.date_of_birth || null,
      };

      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer created successfully');
      }

      setModalOpen(false);
      setEditingCustomer(null);
      setForm({ ...EMPTY_FORM });
      fetchCustomers();
    } catch (err) {
      console.error('Save customer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to save customer';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      toast.success('Customer deleted successfully');
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error('Delete customer error:', err);
      const message =
        err.response?.data?.error || err.response?.data?.message || 'Failed to delete customer';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">
              {customers.length} total customer{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
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
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterFlagged}
            onChange={(e) => setFilterFlagged(e.target.value)}
            className="appearance-none pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white cursor-pointer"
          >
            <option value="all">All Customers</option>
            <option value="flagged">Flagged Only</option>
            <option value="clean">Not Flagged</option>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID Number</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Flagged</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No customers found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Add your first customer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleRowClick(customer)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-blue-600">
                            {(customer.first_name?.[0] || '').toUpperCase()}
                            {(customer.last_name?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {customer.first_name} {customer.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{customer.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.id_type || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {customer.id_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.flagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(customer.created_at)}
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
        title={
          selectedCustomer
            ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
            : 'Customer Details'
        }
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Flagged Warning */}
            {selectedCustomer.flagged && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Flagged Customer</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {selectedCustomer.flag_reason || 'No reason provided'}
                  </p>
                </div>
              </div>
            )}

            {/* Personal Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Personal Information
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<Users className="w-4 h-4 text-gray-400" />}
                  label="Full Name"
                  value={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                />
                <DetailRow
                  icon={<Mail className="w-4 h-4 text-gray-400" />}
                  label="Email"
                  value={selectedCustomer.email}
                />
                <DetailRow
                  icon={<Phone className="w-4 h-4 text-gray-400" />}
                  label="Phone"
                  value={selectedCustomer.phone}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Date of Birth"
                  value={formatDate(selectedCustomer.date_of_birth)}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Address
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  label="Street"
                  value={selectedCustomer.address}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  label="City / State / Zip"
                  value={
                    [selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip]
                      .filter(Boolean)
                      .join(', ') || '-'
                  }
                />
              </div>
            </div>

            {/* Identification */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Identification
              </h3>
              <div className="space-y-3">
                <DetailRow
                  icon={<CreditCard className="w-4 h-4 text-gray-400" />}
                  label="ID Type"
                  value={selectedCustomer.id_type}
                />
                <DetailRow
                  icon={<CreditCard className="w-4 h-4 text-gray-400" />}
                  label="ID Number"
                  value={selectedCustomer.id_number}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="ID Expiry"
                  value={formatDate(selectedCustomer.id_expiry)}
                />
              </div>
            </div>

            {/* Notes */}
            {selectedCustomer.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedCustomer.notes}
                </p>
              </div>
            )}

            {/* Related Records */}
            {(selectedCustomer.loans?.length > 0 ||
              selectedCustomer.layaways?.length > 0 ||
              selectedCustomer.payments?.length > 0) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Related Records
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-lg font-bold text-amber-700">
                      {selectedCustomer.loans?.length || 0}
                    </p>
                    <p className="text-xs text-amber-600">Loans</p>
                  </div>
                  <div className="text-center p-3 bg-pink-50 rounded-lg">
                    <p className="text-lg font-bold text-pink-700">
                      {selectedCustomer.layaways?.length || 0}
                    </p>
                    <p className="text-xs text-pink-600">Layaways</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-700">
                      {selectedCustomer.payments?.length || 0}
                    </p>
                    <p className="text-xs text-purple-600">Payments</p>
                  </div>
                </div>
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
                  value={formatDate(selectedCustomer.created_at)}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Last Updated"
                  value={formatDate(selectedCustomer.updated_at)}
                />
              </div>
            </div>
          {/* AI Customer Risk Score */}
          {selectedCustomer && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => handleCustomerRiskScore(selectedCustomer.id)}
                disabled={customerRiskLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {customerRiskLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  'AI Customer Risk Score'
                )}
              </button>
            </div>
          )}
          </div>
        )}
      </DetailPanel>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
          setForm({ ...EMPTY_FORM });
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleFormChange('address', e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleFormChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => handleFormChange('state', e.target.value)}
                placeholder="CA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => handleFormChange('zip', e.target.value)}
                placeholder="90210"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* ID Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
              <select
                value={form.id_type}
                onChange={(e) => handleFormChange('id_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">Select ID Type</option>
                {ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => handleFormChange('id_number', e.target.value)}
                placeholder="ID Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Expiry</label>
              <input
                type="date"
                value={form.id_expiry}
                onChange={(e) => handleFormChange('id_expiry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Additional notes about this customer..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Flag Section (edit only) */}
          {editingCustomer && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.flagged}
                    onChange={(e) => handleFormChange('flagged', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-red-500" />
                    Flag this customer
                  </span>
                </label>
              </div>
              {form.flagged && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flag Reason
                  </label>
                  <input
                    type="text"
                    value={form.flag_reason}
                    onChange={(e) => handleFormChange('flag_reason', e.target.value)}
                    placeholder="Reason for flagging..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingCustomer(null);
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
              {editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        title="Delete Customer"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-1">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">
                  {customerToDelete?.first_name} {customerToDelete?.last_name}
                </span>
                ? All associated records may be affected.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setCustomerToDelete(null);
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
              Delete Customer
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
            Page {page} of {pagination.totalPages} ({pagination.total} customers)
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

      {/* Customer Risk Score Modal */}
      {customerRiskResult && (
        <Modal title="Customer Risk Score" onClose={() => setCustomerRiskResult(null)} size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className={`text-3xl font-bold ${
                  customerRiskResult.customer_risk?.risk_score > 70 ? 'text-red-600' :
                  customerRiskResult.customer_risk?.risk_score > 40 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {customerRiskResult.customer_risk?.risk_score ?? '-'}/100
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  customerRiskResult.customer_risk?.tier === 'very_high' ? 'bg-red-100 text-red-700' :
                  customerRiskResult.customer_risk?.tier === 'high' ? 'bg-orange-100 text-orange-700' :
                  customerRiskResult.customer_risk?.tier === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {customerRiskResult.customer_risk?.tier || 'N/A'}
                </span>
              </div>
            </div>
            {customerRiskResult.customer_risk?.max_recommended_loan != null && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Max Recommended Loan:</span>{' '}
                ${customerRiskResult.customer_risk.max_recommended_loan.toLocaleString()}
              </p>
            )}
            {customerRiskResult.loan_history_summary && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Total Loans</p>
                  <p className="font-bold text-blue-700">{customerRiskResult.loan_history_summary.totalLoans}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Redeemed</p>
                  <p className="font-bold text-green-700">{customerRiskResult.loan_history_summary.redeemed}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-600">Defaults</p>
                  <p className="font-bold text-red-700">{customerRiskResult.loan_history_summary.defaulted}</p>
                </div>
              </div>
            )}
            {customerRiskResult.customer_risk?.reasoning && (
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {customerRiskResult.customer_risk.reasoning}
              </p>
            )}
          </div>
        </Modal>
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
