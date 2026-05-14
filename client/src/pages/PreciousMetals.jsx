import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import { Gem, Search, Plus, RefreshCw, Calendar, FileText, User, DollarSign, Scale, FlaskConical, Clock, Beaker } from 'lucide-react';

const METAL_TYPES = ['Gold', 'Silver', 'Platinum', 'Palladium'];

const TEST_METHODS = ['Acid Test', 'XRF Analysis', 'Electronic Tester', 'Specific Gravity', 'Visual Inspection'];

const TEST_RESULTS = ['Pass', 'Fail', 'Inconclusive'];

const RESULT_COLORS = {
  Pass: 'bg-green-100 text-green-700',
  pass: 'bg-green-100 text-green-700',
  authentic: 'bg-green-100 text-green-700',
  Fail: 'bg-red-100 text-red-700',
  fail: 'bg-red-100 text-red-700',
  counterfeit: 'bg-red-100 text-red-700',
  Inconclusive: 'bg-amber-100 text-amber-700',
  inconclusive: 'bg-amber-100 text-amber-700',
};

const EMPTY_FORM = {
  inventory_id: '',
  customer_id: '',
  metal_type: '',
  purity: '',
  weight_grams: '',
  test_method: '',
  test_result: '',
  tested_by: '',
  market_price_per_gram: '',
  estimated_value: '',
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

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function ResultBadge({ result }) {
  const colorClass = RESULT_COLORS[result] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {result || '-'}
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

export default function PreciousMetals() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [metalFilter, setMetalFilter] = useState('all');
  const [spotPrices, setSpotPrices] = useState(null);
  const [spotLoading, setSpotLoading] = useState(false);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedTest, setSelectedTest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch tests
  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (metalFilter !== 'all') params.metal_type = metalFilter;
      const { data } = await api.get('/precious-metals', { params });
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch precious metals error:', err);
      toast.error('Failed to load precious metals tests');
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

  const fetchSpotPrices = async () => {
    setSpotLoading(true);
    try {
      const { data } = await api.get('/precious-metals/spot-price');
      setSpotPrices(data);
    } catch (err) {
      toast.error('Failed to fetch spot prices');
    } finally {
      setSpotLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
    fetchSpotPrices();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchTests();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, metalFilter]);

  // Row click -> detail
  const handleRowClick = async (test) => {
    try {
      const { data } = await api.get(`/precious-metals/${test.id}`);
      setSelectedTest(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Fetch test detail error:', err);
      toast.error('Failed to load test details');
    }
  };

  // --- Auto-calculate estimated value ---
  const calcEstimatedValue = (weight, price) => {
    const w = parseFloat(weight);
    const p = parseFloat(price);
    if (!isNaN(w) && !isNaN(p) && w > 0 && p > 0) {
      return (w * p).toFixed(2);
    }
    return '';
  };

  // --- New Test ---
  const openAddModal = () => {
    setForm({ ...EMPTY_FORM });
    fetchInventory();
    fetchCustomers();
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'weight_grams' || field === 'market_price_per_gram') {
        const weight = field === 'weight_grams' ? value : prev.weight_grams;
        const price = field === 'market_price_per_gram' ? value : prev.market_price_per_gram;
        updated.estimated_value = calcEstimatedValue(weight, price);
      }
      return updated;
    });
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!form.metal_type) {
      toast.error('Please select a metal type');
      return;
    }
    if (!form.test_method) {
      toast.error('Please select a test method');
      return;
    }
    if (!form.test_result) {
      toast.error('Please select a test result');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        inventory_id: form.inventory_id ? parseInt(form.inventory_id, 10) : null,
        customer_id: form.customer_id ? parseInt(form.customer_id, 10) : null,
        metal_type: form.metal_type,
        purity: form.purity || null,
        weight_grams: form.weight_grams ? parseFloat(form.weight_grams) : null,
        test_method: form.test_method,
        test_result: form.test_result,
        tested_by: form.tested_by || null,
        market_price_per_gram: form.market_price_per_gram ? parseFloat(form.market_price_per_gram) : null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        notes: form.notes || null,
      };
      await api.post('/precious-metals', payload);
      toast.success('Test entry created successfully');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchTests();
    } catch (err) {
      console.error('Create test error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create test entry';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Edit Test ---
  const openEditModal = () => {
    if (!selectedTest) return;
    setEditForm({
      inventory_id: selectedTest.inventory_id || '',
      customer_id: selectedTest.customer_id || '',
      metal_type: selectedTest.metal_type || '',
      purity: selectedTest.purity || '',
      weight_grams: selectedTest.weight_grams || '',
      test_method: selectedTest.test_method || '',
      test_result: selectedTest.test_result || '',
      tested_by: selectedTest.tested_by || '',
      market_price_per_gram: selectedTest.market_price_per_gram || '',
      estimated_value: selectedTest.estimated_value || '',
      notes: selectedTest.notes || '',
    });
    fetchInventory();
    fetchCustomers();
    setDetailOpen(false);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'weight_grams' || field === 'market_price_per_gram') {
        const weight = field === 'weight_grams' ? value : prev.weight_grams;
        const price = field === 'market_price_per_gram' ? value : prev.market_price_per_gram;
        updated.estimated_value = calcEstimatedValue(weight, price);
      }
      return updated;
    });
  };

  const handleUpdateTest = async (e) => {
    e.preventDefault();
    if (!selectedTest) return;
    if (!editForm.metal_type) {
      toast.error('Metal type is required');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        inventory_id: editForm.inventory_id ? parseInt(editForm.inventory_id, 10) : null,
        customer_id: editForm.customer_id ? parseInt(editForm.customer_id, 10) : null,
        metal_type: editForm.metal_type,
        purity: editForm.purity || null,
        weight_grams: editForm.weight_grams ? parseFloat(editForm.weight_grams) : null,
        test_method: editForm.test_method || null,
        test_result: editForm.test_result || null,
        tested_by: editForm.tested_by || null,
        market_price_per_gram: editForm.market_price_per_gram ? parseFloat(editForm.market_price_per_gram) : null,
        estimated_value: editForm.estimated_value ? parseFloat(editForm.estimated_value) : null,
        notes: editForm.notes || null,
      };
      await api.put(`/precious-metals/${selectedTest.id}`, payload);
      toast.success('Test entry updated successfully');
      setEditModalOpen(false);
      setSelectedTest(null);
      fetchTests();
    } catch (err) {
      console.error('Update test error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update test entry';
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Test ---
  const openDeleteModal = () => {
    if (!selectedTest) return;
    setTestToDelete(selectedTest);
    setDetailOpen(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/precious-metals/${testToDelete.id}`);
      toast.success('Test entry deleted successfully');
      setDeleteModalOpen(false);
      setTestToDelete(null);
      setSelectedTest(null);
      fetchTests();
    } catch (err) {
      console.error('Delete test error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to delete test entry';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getItemName = (test) => {
    if (test.inventory?.name) return test.inventory.name;
    if (test.inventory?.item_name) return test.inventory.item_name;
    if (test.inventory?.description) return test.inventory.description;
    if (test.item_name) return test.item_name;
    return '-';
  };

  const getCustomerName = (test) => {
    if (test.customer) {
      return `${test.customer.first_name || ''} ${test.customer.last_name || ''}`.trim();
    }
    if (test.customer_name) return test.customer_name;
    return '-';
  };

  const getInventoryLabel = (item) => {
    const name = item.name || item.item_name || item.description || `Item #${item.id}`;
    return name;
  };

  const getCustomerLabel = (customer) => {
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return customer.phone ? `${name} (${customer.phone})` : name;
  };

  // Form fields renderer for create/edit modals
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

      {/* Metal Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Metal Type *</label>
        <select
          value={currentForm.metal_type}
          onChange={(e) => onChange('metal_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select metal type...</option>
          {METAL_TYPES.map((mt) => (
            <option key={mt} value={mt}>
              {mt}
            </option>
          ))}
        </select>
      </div>

      {/* Purity & Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
          <input
            type="text"
            value={currentForm.purity}
            onChange={(e) => onChange('purity', e.target.value)}
            placeholder="e.g. 24K, 99.9%"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={currentForm.weight_grams}
            onChange={(e) => onChange('weight_grams', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Test Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Method *</label>
        <select
          value={currentForm.test_method}
          onChange={(e) => onChange('test_method', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select test method...</option>
          {TEST_METHODS.map((tm) => (
            <option key={tm} value={tm}>
              {tm}
            </option>
          ))}
        </select>
      </div>

      {/* Test Result */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Result *</label>
        <select
          value={currentForm.test_result}
          onChange={(e) => onChange('test_result', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        >
          <option value="">Select result...</option>
          {TEST_RESULTS.map((tr) => (
            <option key={tr} value={tr}>
              {tr}
            </option>
          ))}
        </select>
      </div>

      {/* Tested By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tested By</label>
        <input
          type="text"
          value={currentForm.tested_by}
          onChange={(e) => onChange('tested_by', e.target.value)}
          placeholder="Technician name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
        />
      </div>

      {/* Market Price & Estimated Value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Market Price / gram ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={currentForm.market_price_per_gram}
            onChange={(e) => onChange('market_price_per_gram', e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={currentForm.estimated_value}
            onChange={(e) => onChange('estimated_value', e.target.value)}
            placeholder="Auto-calculated"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-gray-50"
          />
          {currentForm.weight_grams && currentForm.market_price_per_gram && (
            <p className="text-xs text-gray-400 mt-1">
              {currentForm.weight_grams}g x ${currentForm.market_price_per_gram}/g
            </p>
          )}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Gem className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Precious Metals Testing Log</h1>
            <p className="text-sm text-gray-500">
              {tests.length} total test{tests.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md shadow-amber-500/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Test Entry
        </button>
      </div>

      {/* Spot Price Display */}
      {(spotPrices || spotLoading) && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-800">Live Spot Prices</h3>
            <div className="flex items-center gap-2">
              {spotPrices?.source === 'mock' && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Reference Only</span>
              )}
              <button
                onClick={fetchSpotPrices}
                disabled={spotLoading}
                className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${spotLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          {spotLoading ? (
            <div className="text-sm text-amber-600">Loading spot prices...</div>
          ) : spotPrices ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {spotPrices.gold_usd_per_troy_oz && (
                <div className="text-center">
                  <p className="text-xs text-amber-600 font-medium">Gold</p>
                  <p className="text-lg font-bold text-amber-800">${parseFloat(spotPrices.gold_usd_per_troy_oz).toLocaleString()}</p>
                  <p className="text-xs text-amber-500">per troy oz</p>
                  {spotPrices.gold_usd_per_gram && (
                    <p className="text-xs text-amber-600">${spotPrices.gold_usd_per_gram}/g</p>
                  )}
                </div>
              )}
              {spotPrices.silver_usd_per_troy_oz && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Silver</p>
                  <p className="text-lg font-bold text-gray-700">${parseFloat(spotPrices.silver_usd_per_troy_oz).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">per troy oz</p>
                  {spotPrices.silver_usd_per_gram && (
                    <p className="text-xs text-gray-500">${spotPrices.silver_usd_per_gram}/g</p>
                  )}
                </div>
              )}
              {spotPrices.platinum_usd_per_troy_oz && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-medium">Platinum</p>
                  <p className="text-lg font-bold text-blue-700">${parseFloat(spotPrices.platinum_usd_per_troy_oz).toLocaleString()}</p>
                  <p className="text-xs text-blue-400">per troy oz</p>
                </div>
              )}
              {spotPrices.palladium_usd_per_troy_oz && (
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-medium">Palladium</p>
                  <p className="text-lg font-bold text-purple-700">${parseFloat(spotPrices.palladium_usd_per_troy_oz).toLocaleString()}</p>
                  <p className="text-xs text-purple-400">per troy oz</p>
                </div>
              )}
            </div>
          ) : null}
          {spotPrices?.note && (
            <p className="text-xs text-amber-500 mt-2">{spotPrices.note}</p>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by metal type, tester, purity..."
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
          value={metalFilter}
          onChange={(e) => setMetalFilter(e.target.value)}
          className="appearance-none px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm bg-white cursor-pointer"
        >
          <option value="all">All Metals</option>
          {METAL_TYPES.map((mt) => (
            <option key={mt} value={mt}>
              {mt}
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Metal Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Purity</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Weight (g)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Test Method</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Test Result</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tested By</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Test Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Est. Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading precious metals tests...</span>
                    </div>
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Gem className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No test entries found</p>
                      <button
                        onClick={openAddModal}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Create your first test entry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr
                    key={test.id}
                    onClick={() => handleRowClick(test)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {test.id}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {test.metal_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {test.purity || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {test.weight_grams != null ? `${parseFloat(test.weight_grams).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {test.test_method || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ResultBadge result={test.test_result} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {test.tested_by || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(test.test_date || test.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {test.estimated_value != null ? formatCurrency(test.estimated_value) : '-'}
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
        title={selectedTest ? `Test #${selectedTest.id}` : 'Test Details'}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      >
        {selectedTest && (
          <div className="space-y-6">
            {/* Result Badge */}
            <div className="flex items-center gap-2">
              <ResultBadge result={selectedTest.test_result} />
              <span className="text-xs text-gray-400">#{selectedTest.id}</span>
            </div>

            {/* Metal Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metal Information</h3>
              <DetailRow
                icon={<Gem className="w-4 h-4 text-amber-500" />}
                label="Metal Type"
                value={selectedTest.metal_type}
              />
              <DetailRow
                icon={<FileText className="w-4 h-4 text-gray-400" />}
                label="Purity"
                value={selectedTest.purity}
              />
              <DetailRow
                icon={<Scale className="w-4 h-4 text-gray-400" />}
                label="Weight"
                value={selectedTest.weight_grams != null ? `${parseFloat(selectedTest.weight_grams).toFixed(2)} g` : null}
              />
            </div>

            {/* Test Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Test Details</h3>
              <DetailRow
                icon={<FlaskConical className="w-4 h-4 text-gray-400" />}
                label="Test Method"
                value={selectedTest.test_method}
              />
              <DetailRow
                icon={<Beaker className="w-4 h-4 text-gray-400" />}
                label="Test Result"
                value={selectedTest.test_result}
              />
              <DetailRow
                icon={<User className="w-4 h-4 text-gray-400" />}
                label="Tested By"
                value={selectedTest.tested_by}
              />
              <DetailRow
                icon={<Calendar className="w-4 h-4 text-gray-400" />}
                label="Test Date"
                value={formatDate(selectedTest.test_date || selectedTest.created_at)}
              />
            </div>

            {/* Valuation */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valuation</h3>
              <DetailRow
                icon={<DollarSign className="w-4 h-4 text-gray-400" />}
                label="Market Price / gram"
                value={selectedTest.market_price_per_gram != null ? formatCurrency(selectedTest.market_price_per_gram) : null}
              />
              <DetailRow
                icon={<DollarSign className="w-4 h-4 text-green-500" />}
                label="Estimated Value"
                value={selectedTest.estimated_value != null ? formatCurrency(selectedTest.estimated_value) : null}
              />
            </div>

            {/* Linked Item / Customer */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Linked Records</h3>
              <DetailRow
                icon={<FileText className="w-4 h-4 text-gray-400" />}
                label="Inventory Item"
                value={getItemName(selectedTest)}
              />
              <DetailRow
                icon={<User className="w-4 h-4 text-gray-400" />}
                label="Customer"
                value={getCustomerName(selectedTest)}
              />
            </div>

            {/* Notes */}
            {selectedTest.notes && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {selectedTest.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamps</h3>
              <DetailRow
                icon={<Clock className="w-4 h-4 text-gray-400" />}
                label="Created"
                value={formatDate(selectedTest.created_at)}
              />
              <DetailRow
                icon={<Clock className="w-4 h-4 text-gray-400" />}
                label="Updated"
                value={formatDate(selectedTest.updated_at)}
              />
            </div>
          </div>
        )}
      </DetailPanel>

      {/* New Test Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Precious Metal Test" size="lg">
        <form onSubmit={handleCreateTest}>
          {renderFormFields(form, handleFormChange)}
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
              {saving ? 'Creating...' : 'Create Test Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Test Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Precious Metal Test" size="lg">
        <form onSubmit={handleUpdateTest}>
          {renderFormFields(editForm, handleEditFormChange)}
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
              {editSaving ? 'Updating...' : 'Update Test Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Test Entry" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete test entry{' '}
            <span className="font-semibold text-gray-900">#{testToDelete?.id}</span>? This action cannot be undone.
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
              onClick={handleDeleteTest}
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
