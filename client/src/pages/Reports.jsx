import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart3, DollarSign, Clock, Shield, TrendingUp, Package, AlertTriangle, Calendar } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const formatPercent = (value) => {
  const num = Number(value) || 0;
  return `${num.toFixed(1)}%`;
};

const todayString = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
  </div>
);

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'profit', label: 'Profit Margins', icon: TrendingUp },
  { id: 'aging', label: 'Aging Report', icon: Clock },
  { id: 'compliance', label: 'Regulatory Compliance', icon: Shield },
  { id: 'daily', label: 'Daily Summary', icon: Calendar },
  { id: 'inventory', label: 'Inventory Value', icon: Package },
];

// ---------------------------------------------------------------------------
// 1. Profit Margins
// ---------------------------------------------------------------------------

const ProfitMargins = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/profit-margins');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load profit margins');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-center text-gray-500 py-8">No data available.</p>;

  const items = data.items || [];
  const summary = data.summary || {};

  const marginColor = (margin) => {
    const m = Number(margin) || 0;
    if (m >= 30) return 'text-green-600 bg-green-50';
    if (m >= 15) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Cost" value={formatCurrency(summary.totalCost)} icon={DollarSign} color="blue" />
        <SummaryCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={DollarSign} color="green" />
        <SummaryCard label="Total Profit" value={formatCurrency(summary.totalProfit)} icon={TrendingUp} color="indigo" />
        <SummaryCard label="Average Margin" value={formatPercent(summary.averageMargin)} icon={BarChart3} color="purple" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Item Name', 'Category', 'Cost Price', 'Retail Price', 'Profit', 'Margin %'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No sold items found.</td></tr>
            )}
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-gray-600">{formatCurrency(item.costPrice)}</td>
                <td className="px-4 py-3 text-gray-600">{formatCurrency(item.retailPrice)}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(item.profit)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${marginColor(item.margin)}`}>
                    {formatPercent(item.margin)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Aging Report
// ---------------------------------------------------------------------------

const BUCKET_CONFIG = {
  current:  { label: 'Current',  color: 'green',  border: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  '7days':  { label: '7 Days',   color: 'blue',   border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  '14days': { label: '14 Days',  color: 'amber',  border: 'border-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
  '30days': { label: '30 Days',  color: 'orange', border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  pastDue:  { label: 'Past Due', color: 'red',    border: 'border-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
};

const AgingReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/aging');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load aging report');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-center text-gray-500 py-8">No data available.</p>;

  const buckets = data.buckets || data || {};

  return (
    <div className="space-y-6">
      {/* Bucket summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(BUCKET_CONFIG).map(([key, cfg]) => {
          const bucket = buckets[key] || {};
          const count = bucket.count ?? (bucket.loans ? bucket.loans.length : 0);
          const totalValue = bucket.totalValue ?? bucket.total ?? 0;
          return (
            <button
              key={key}
              onClick={() => setExpanded(expanded === key ? null : key)}
              className={`rounded-lg border-l-4 ${cfg.border} ${cfg.bg} p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{count}</p>
              <p className="text-sm text-gray-500">Value: {formatCurrency(totalValue)}</p>
            </button>
          );
        })}
      </div>

      {/* Expanded loan list */}
      {expanded && buckets[expanded] && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className={`px-4 py-3 ${BUCKET_CONFIG[expanded].bg} rounded-t-lg`}>
            <h3 className={`font-semibold ${BUCKET_CONFIG[expanded].text}`}>
              {BUCKET_CONFIG[expanded].label} Loans
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Loan #', 'Customer', 'Item', 'Amount', 'Due Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(buckets[expanded].loans || []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No loans in this bucket.</td></tr>
                )}
                {(buckets[expanded].loans || []).map((loan, idx) => (
                  <tr key={loan.id || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{loan.loanNumber || loan.id}</td>
                    <td className="px-4 py-3 text-gray-600">{loan.customerName || loan.customer}</td>
                    <td className="px-4 py-3 text-gray-600">{loan.itemName || loan.item}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(loan.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Regulatory Compliance
// ---------------------------------------------------------------------------

const ComplianceCard = ({ title, icon: Icon, stats, issues }) => {
  const allGood = !issues || issues.length === 0;
  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${allGood ? 'border-green-200' : 'border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${allGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${allGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {allGood ? 'Compliant' : 'Action Needed'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Issues */}
      {issues && issues.length > 0 && (
        <div className="mt-4 space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RegulatoryCompliance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/regulatory-compliance');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load compliance report');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-center text-gray-500 py-8">No data available.</p>;

  const hp = data.holdPeriods || {};
  const pr = data.policeReports || {};
  const fl = data.firearmLog || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ComplianceCard
        title="Hold Periods"
        icon={Clock}
        stats={[
          { label: 'Active', value: hp.activeCount ?? 0 },
          { label: 'Expired', value: hp.expiredCount ?? 0 },
          { label: 'Compliance Rate', value: formatPercent(hp.complianceRate) },
          { label: 'Total', value: (hp.activeCount ?? 0) + (hp.expiredCount ?? 0) },
        ]}
        issues={hp.issues}
      />

      <ComplianceCard
        title="Police Reports"
        icon={Shield}
        stats={[
          { label: 'Pending', value: pr.pendingCount ?? 0 },
          { label: 'Submitted', value: pr.submittedCount ?? 0 },
          { label: 'Compliance Rate', value: formatPercent(pr.complianceRate) },
          { label: 'Total', value: (pr.pendingCount ?? 0) + (pr.submittedCount ?? 0) },
        ]}
        issues={pr.issues}
      />

      <ComplianceCard
        title="Firearm Log"
        icon={Shield}
        stats={[
          { label: 'Total Entries', value: fl.totalEntries ?? 0 },
          { label: 'Complete', value: fl.completeCount ?? fl.totalEntries ?? 0 },
          { label: 'Completeness', value: formatPercent(fl.completeness ?? fl.completenessRate) },
          { label: 'Incomplete', value: fl.incompleteCount ?? 0 },
        ]}
        issues={fl.issues}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. Daily Summary
// ---------------------------------------------------------------------------

const DailySummary = () => {
  const [date, setDate] = useState(todayString());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async (d) => {
    try {
      setLoading(true);
      const res = await api.get('/reports/daily-summary', { params: { date: d } });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(date);
  }, [date]);

  const summary = data || {};
  const transactions = summary.transactions || [];

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label htmlFor="report-date" className="text-sm font-medium text-gray-700">Select Date:</label>
        <input
          id="report-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard label="New Loans" value={summary.newLoans ?? 0} icon={DollarSign} color="indigo" />
            <SummaryCard label="Redemptions" value={summary.redemptions ?? 0} icon={TrendingUp} color="green" />
            <SummaryCard label="Sales" value={typeof summary.sales === 'number' ? formatCurrency(summary.sales) : (summary.sales ?? 0)} icon={BarChart3} color="blue" />
            <SummaryCard label="Payments Received" value={formatCurrency(summary.paymentsReceived ?? summary.payments ?? 0)} icon={DollarSign} color="amber" />
            <SummaryCard label="New Customers" value={summary.newCustomers ?? 0} icon={Package} color="purple" />
          </div>

          {/* Transaction list */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-800">Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Time', 'Type', 'Description', 'Amount'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No transactions for this date.</td></tr>
                  )}
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{tx.time || (tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : '—')}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tx.description}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. Inventory Value
// ---------------------------------------------------------------------------

const InventoryValue = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/inventory-value');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load inventory value');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-center text-gray-500 py-8">No data available.</p>;

  const totalValue = data.totalValue ?? 0;
  const byCategory = data.byCategory || [];
  const byStatus = data.byStatus || [];

  const categoryColors = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-green-50 border-green-200 text-green-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-purple-50 border-purple-200 text-purple-700',
    'bg-pink-50 border-pink-200 text-pink-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
    'bg-orange-50 border-orange-200 text-orange-700',
    'bg-indigo-50 border-indigo-200 text-indigo-700',
  ];

  const statusColors = [
    'bg-green-50 border-green-300',
    'bg-blue-50 border-blue-300',
    'bg-amber-50 border-amber-300',
    'bg-red-50 border-red-300',
    'bg-gray-50 border-gray-300',
  ];

  return (
    <div className="space-y-6">
      {/* Total value hero */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide opacity-80">Total Inventory Value</p>
        <p className="mt-1 text-4xl font-bold">{formatCurrency(totalValue)}</p>
      </div>

      {/* By Category */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Value by Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byCategory.map((cat, idx) => (
            <div
              key={cat.category || idx}
              className={`rounded-lg border p-4 shadow-sm ${categoryColors[idx % categoryColors.length]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{cat.category}</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{formatCurrency(cat.value)}</p>
              <p className="text-sm text-gray-500">{cat.count ?? 0} items</p>
            </div>
          ))}
          {byCategory.length === 0 && (
            <p className="col-span-full text-center text-gray-400">No category data.</p>
          )}
        </div>
      </div>

      {/* By Status */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Value by Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byStatus.map((s, idx) => (
            <div
              key={s.status || idx}
              className={`rounded-lg border p-4 shadow-sm ${statusColors[idx % statusColors.length]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.status}</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{formatCurrency(s.value)}</p>
              <p className="text-sm text-gray-500">{s.count ?? 0} items</p>
            </div>
          ))}
          {byStatus.length === 0 && (
            <p className="col-span-full text-center text-gray-400">No status data.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared: Summary Card
// ---------------------------------------------------------------------------

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  iconBg: 'bg-green-100',  iconText: 'text-green-600' },
  indigo: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
  amber:  { bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600' },
  red:    { bg: 'bg-red-50',    iconBg: 'bg-red-100',    iconText: 'text-red-600' },
};

const SummaryCard = ({ label, value, icon: Icon, color = 'blue' }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className={`rounded-lg border border-gray-200 ${c.bg} p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${c.iconBg}`}>
          <Icon size={18} className={c.iconText} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main: Reports Page
// ---------------------------------------------------------------------------

const Reports = () => {
  const [activeTab, setActiveTab] = useState('profit');

  const renderTab = () => {
    switch (activeTab) {
      case 'profit':     return <ProfitMargins />;
      case 'aging':      return <AgingReport />;
      case 'compliance': return <RegulatoryCompliance />;
      case 'daily':      return <DailySummary />;
      case 'inventory':  return <InventoryValue />;
      default:           return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-indigo-100 p-2">
          <BarChart3 size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500">Business intelligence and compliance reports</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm border border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>
    </div>
  );
};

export default Reports;
