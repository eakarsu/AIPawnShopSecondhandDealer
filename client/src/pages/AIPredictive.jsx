import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AIResultDisplay from '../components/AIResultDisplay';
import { Brain, Gavel, Calendar, Users, Sparkles, ShieldAlert } from 'lucide-react';

const TOOLS = [
  { id: 'auction-price', label: 'Auction Price Suggest', icon: Gavel, endpoint: '/ai/auction-price-suggest' },
  { id: 'expiration', label: 'Expiration Optimize', icon: Calendar, endpoint: '/ai/expiration-optimize' },
  { id: 'lifetime-value', label: 'Customer Lifetime Value', icon: Users, endpoint: '/ai/customer-lifetime-value' },
  { id: 'theft-detection', label: 'Theft Detection', icon: ShieldAlert, endpoint: '/ai/theft-detection' },
];

export default function AIPredictive() {
  const [activeTool, setActiveTool] = useState('auction-price');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [auctionForm, setAuctionForm] = useState({
    item_description: '',
    category: '',
    condition: 'Good',
    starting_price: '',
    comparable_sales: '',
  });
  const [expirationForm, setExpirationForm] = useState({
    item_id: '',
    item_description: '',
    days_in_stock: '',
    holding_cost: '',
    seasonal_factors: '',
  });
  const [ltvForm, setLtvForm] = useState({
    customer_id: '',
    transactions_summary: '',
    average_loan_size: '',
    months_active: '',
    redemption_rate: '',
  });
  const [theftForm, setTheftForm] = useState({
    employee_id: '',
    no_sale_count: '',
    time_range: '',
    recent_transactions: '',
    void_history: '',
  });

  const parseJsonOrText = (s) => {
    if (!s || !s.trim()) return undefined;
    try { return JSON.parse(s); } catch { return s; }
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const tool = TOOLS.find(t => t.id === activeTool);
      let body;
      if (activeTool === 'auction-price') {
        body = {
          item_description: auctionForm.item_description,
          category: auctionForm.category,
          condition: auctionForm.condition,
          starting_price: auctionForm.starting_price ? parseFloat(auctionForm.starting_price) : undefined,
          comparable_sales: parseJsonOrText(auctionForm.comparable_sales),
        };
      } else if (activeTool === 'expiration') {
        body = {
          item_id: expirationForm.item_id ? parseInt(expirationForm.item_id, 10) : undefined,
          item_description: expirationForm.item_description,
          days_in_stock: expirationForm.days_in_stock ? parseInt(expirationForm.days_in_stock, 10) : undefined,
          holding_cost: expirationForm.holding_cost ? parseFloat(expirationForm.holding_cost) : undefined,
          seasonal_factors: expirationForm.seasonal_factors,
        };
      } else if (activeTool === 'lifetime-value') {
        body = {
          customer_id: ltvForm.customer_id ? parseInt(ltvForm.customer_id, 10) : undefined,
          transactions_summary: ltvForm.transactions_summary,
          average_loan_size: ltvForm.average_loan_size ? parseFloat(ltvForm.average_loan_size) : undefined,
          months_active: ltvForm.months_active ? parseInt(ltvForm.months_active, 10) : undefined,
          redemption_rate: ltvForm.redemption_rate ? parseFloat(ltvForm.redemption_rate) : undefined,
        };
      } else {
        body = {
          employee_id: theftForm.employee_id ? parseInt(theftForm.employee_id, 10) : undefined,
          no_sale_count: theftForm.no_sale_count ? parseInt(theftForm.no_sale_count, 10) : undefined,
          time_range: theftForm.time_range || undefined,
          recent_transactions: parseJsonOrText(theftForm.recent_transactions),
          void_history: parseJsonOrText(theftForm.void_history),
        };
      }
      const res = await api.post(tool.endpoint, body);
      setResult(res.data);
      toast.success('AI analysis complete');
    } catch (err) {
      const status = err.response?.status;
      const baseMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'AI request failed';
      toast.error(status === 503 ? 'AI service unavailable (set OPENROUTER_API_KEY): ' + baseMsg : baseMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Predictive Tools</h1>
          <p className="text-sm text-gray-600">Auction pricing, expiration optimization, and lifetime value analytics</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TOOLS.map(t => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); setResult(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                active ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeTool === 'auction-price' && (
          <>
            <h3 className="text-lg font-bold mb-4">Auction Price Suggest</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Description *</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={auctionForm.item_description} onChange={(e) => setAuctionForm({ ...auctionForm, item_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={auctionForm.category} onChange={(e) => setAuctionForm({ ...auctionForm, category: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2" value={auctionForm.condition} onChange={(e) => setAuctionForm({ ...auctionForm, condition: e.target.value })}>
                    {['New','Like New','Excellent','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={auctionForm.starting_price} onChange={(e) => setAuctionForm({ ...auctionForm, starting_price: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comparable Sales (JSON)</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={auctionForm.comparable_sales} onChange={(e) => setAuctionForm({ ...auctionForm, comparable_sales: e.target.value })} placeholder='[{"price":250,"date":"2025-04-01"}]' />
              </div>
            </div>
          </>
        )}

        {activeTool === 'expiration' && (
          <>
            <h3 className="text-lg font-bold mb-4">Expiration Optimize</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item ID</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={expirationForm.item_id} onChange={(e) => setExpirationForm({ ...expirationForm, item_id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days in Stock</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={expirationForm.days_in_stock} onChange={(e) => setExpirationForm({ ...expirationForm, days_in_stock: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Description</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={expirationForm.item_description} onChange={(e) => setExpirationForm({ ...expirationForm, item_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holding Cost ($/day)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={expirationForm.holding_cost} onChange={(e) => setExpirationForm({ ...expirationForm, holding_cost: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seasonal Factors</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={expirationForm.seasonal_factors} onChange={(e) => setExpirationForm({ ...expirationForm, seasonal_factors: e.target.value })} placeholder="Holidays, school season..." />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTool === 'lifetime-value' && (
          <>
            <h3 className="text-lg font-bold mb-4">Customer Lifetime Value</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={ltvForm.customer_id} onChange={(e) => setLtvForm({ ...ltvForm, customer_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transactions Summary</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={ltvForm.transactions_summary} onChange={(e) => setLtvForm({ ...ltvForm, transactions_summary: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Loan Size</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={ltvForm.average_loan_size} onChange={(e) => setLtvForm({ ...ltvForm, average_loan_size: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Months Active</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={ltvForm.months_active} onChange={(e) => setLtvForm({ ...ltvForm, months_active: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Redemption Rate (0-1)</label>
                  <input type="number" step="0.01" min="0" max="1" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={ltvForm.redemption_rate} onChange={(e) => setLtvForm({ ...ltvForm, redemption_rate: e.target.value })} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTool === 'theft-detection' && (
          <>
            <h3 className="text-lg font-bold mb-4">Theft Detection</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (optional)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={theftForm.employee_id} onChange={(e) => setTheftForm({ ...theftForm, employee_id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No-Sale Opens</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={theftForm.no_sale_count} onChange={(e) => setTheftForm({ ...theftForm, no_sale_count: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={theftForm.time_range} onChange={(e) => setTheftForm({ ...theftForm, time_range: e.target.value })} placeholder="last 30 days" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recent Transactions (JSON, optional)</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={theftForm.recent_transactions} onChange={(e) => setTheftForm({ ...theftForm, recent_transactions: e.target.value })} placeholder='[{"type":"refund","amount":120,"employee_id":3}]' />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Void History (JSON, optional)</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" value={theftForm.void_history} onChange={(e) => setTheftForm({ ...theftForm, void_history: e.target.value })} placeholder='[{"amount":80,"employee_id":3,"reason":"customer changed mind"}]' />
              </div>
              <p className="text-xs text-gray-500">Leave the JSON fields empty to let the server pull recent cash-drawer data automatically.</p>
            </div>
          </>
        )}

        <button
          onClick={run}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Running...' : 'Run AI'}
        </button>
      </div>

      {(loading || result) && (
        <div className="mt-6">
          <AIResultDisplay loading={loading} result={result?.result || result?.data || result} type={activeTool} />
        </div>
      )}
    </div>
  );
}
