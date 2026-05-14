import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AIResultDisplay from '../components/AIResultDisplay';
import {
  Brain,
  DollarSign,
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText,
  MessageSquare,
  Sparkles,
  History,
  Upload,
  X,
  Search,
  Calculator,
  BookOpen,
} from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Jewelry',
  'Watches',
  'Musical Instruments',
  'Tools & Equipment',
  'Firearms',
  'Precious Metals',
  'Collectibles',
  'Sporting Goods',
  'Designer Goods',
  'Antiques',
  'Vehicles',
  'Other',
];

const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor', 'For Parts'];

const TOOLS = [
  {
    id: 'valuation',
    name: 'Item Valuation',
    description: 'Get AI-powered price estimates for any item',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'from-emerald-600 to-emerald-700',
  },
  {
    id: 'market',
    name: 'Market Price Trends',
    description: 'Analyze current market conditions and pricing trends',
    icon: TrendingUp,
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'from-blue-600 to-blue-700',
  },
  {
    id: 'risk',
    name: 'Loan Risk Scoring',
    description: 'Assess loan risk based on customer history and item value',
    icon: Shield,
    gradient: 'from-amber-500 to-amber-600',
    hoverGradient: 'from-amber-600 to-amber-700',
  },
  {
    id: 'counterfeit',
    name: 'Counterfeit Detection',
    description: 'Identify potential counterfeit or stolen merchandise',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-red-600',
    hoverGradient: 'from-red-600 to-red-700',
  },
  {
    id: 'regulatory',
    name: 'Regulatory Report Draft',
    description: 'Generate compliance reports and regulatory documents',
    icon: FileText,
    gradient: 'from-indigo-500 to-indigo-600',
    hoverGradient: 'from-indigo-600 to-indigo-700',
  },
  {
    id: 'negotiation',
    name: 'Negotiation Tips',
    description: 'Get AI-powered negotiation strategies and talking points',
    icon: MessageSquare,
    gradient: 'from-purple-500 to-purple-600',
    hoverGradient: 'from-purple-600 to-purple-700',
  },
  {
    id: 'market_price',
    name: 'Market Price Lookup',
    description: 'Get current market price ranges with comparable sales data',
    icon: Search,
    gradient: 'from-cyan-500 to-cyan-600',
    hoverGradient: 'from-cyan-600 to-cyan-700',
  },
  {
    id: 'loan_calc',
    name: 'Loan Calculator',
    description: 'AI-recommended loan amount, interest rate, and redemption timeline',
    icon: Calculator,
    gradient: 'from-teal-500 to-teal-600',
    hoverGradient: 'from-teal-600 to-teal-700',
  },
  {
    id: 'compliance',
    name: 'Compliance Checker',
    description: 'Jurisdiction-specific pawn shop regulations and requirements',
    icon: BookOpen,
    gradient: 'from-slate-500 to-slate-600',
    hoverGradient: 'from-slate-600 to-slate-700',
  },
];

const initialForms = {
  valuation: {
    item_description: '',
    category: '',
    condition: '',
    brand: '',
    model: '',
    age: '',
  },
  market: {
    item_category: '',
    item_name: '',
    region: 'United States',
  },
  risk: {
    customer_history: '',
    loan_amount: '',
    item_value: '',
    item_category: '',
  },
  counterfeit: {
    item_description: '',
    category: '',
    brand: '',
    serial_number: '',
    photos_description: '',
  },
  regulatory: {
    report_type: 'daily_transaction',
    date_range_start: '',
    date_range_end: '',
    location: '',
    transactions_summary: '',
  },
  negotiation: {
    item_description: '',
    estimated_value: '',
    customer_asking_price: '',
    market_conditions: 'normal',
  },
  market_price: {
    category: '',
    description: '',
    condition: 'Good',
    brand: '',
    model: '',
  },
  loan_calc: {
    appraisedValue: '',
    itemCategory: '',
    customerId: '',
  },
  compliance: {
    jurisdiction: '',
    businessType: 'Traditional pawn shop (buy/sell/loan)',
    specificQuestion: '',
  },
};

export default function AITools() {
  const [activeTool, setActiveTool] = useState(null);
  const [forms, setForms] = useState(initialForms);
  const [result, setResult] = useState(null);
  const [resultType, setResultType] = useState('valuation');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'history'
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, totalPages: 1 });
  const [historyExpanded, setHistoryExpanded] = useState(null);
  const [counterfeitPhoto, setCounterfeitPhoto] = useState(null);

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/ai/history?page=${page}&limit=20`);
      setHistory(data.data || []);
      setHistoryPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      toast.error('Failed to load AI history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage);
    }
  }, [activeTab, historyPage]);

  function updateForm(toolId, field, value) {
    setForms((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], [field]: value },
    }));
  }

  function handleToolSelect(toolId) {
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setResult(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeTool) return;

    setLoading(true);
    setResult(null);

    try {
      let endpoint = '';
      let payload = {};

      switch (activeTool) {
        case 'valuation': {
          endpoint = '/ai/valuate';
          const f = forms.valuation;
          if (!f.item_description.trim()) {
            toast.error('Please provide an item description');
            setLoading(false);
            return;
          }
          payload = {
            item_description: f.item_description,
            category: f.category || undefined,
            condition: f.condition || undefined,
            brand: f.brand || undefined,
            model: f.model || undefined,
            age: f.age || undefined,
          };
          break;
        }
        case 'market': {
          endpoint = '/ai/market-trends';
          const f = forms.market;
          payload = {
            item_category: f.item_category || undefined,
            item_name: f.item_name || undefined,
            region: f.region || 'United States',
          };
          break;
        }
        case 'risk': {
          endpoint = '/ai/risk-score';
          const f = forms.risk;
          if (!f.customer_history.trim()) {
            toast.error('Please provide customer history');
            setLoading(false);
            return;
          }
          payload = {
            customer_history: f.customer_history,
            loan_amount: f.loan_amount ? Number(f.loan_amount) : undefined,
            item_value: f.item_value ? Number(f.item_value) : undefined,
            item_category: f.item_category || undefined,
          };
          break;
        }
        case 'counterfeit': {
          endpoint = '/ai/counterfeit-check';
          const f = forms.counterfeit;
          if (!f.item_description.trim()) {
            toast.error('Please provide an item description');
            setLoading(false);
            return;
          }
          // Use FormData to support optional photo upload
          const formData = new FormData();
          formData.append('item_description', f.item_description);
          if (f.category) formData.append('category', f.category);
          if (f.brand) formData.append('brand', f.brand);
          if (f.serial_number) formData.append('serial_number', f.serial_number);
          if (f.photos_description) formData.append('photos_description', f.photos_description);
          if (counterfeitPhoto) formData.append('photo', counterfeitPhoto);

          try {
            const res = await api.post(endpoint, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            setResultType(activeTool);
            toast.success(res.data.photo_analyzed ? 'AI analysis complete (with photo)' : 'AI analysis complete');
          } catch (err) {
            const message = err.response?.data?.error || err.response?.data?.message || 'AI analysis failed';
            toast.error(message);
            setResult(null);
          } finally {
            setLoading(false);
          }
          return; // handled inline above
        }
        case 'regulatory': {
          endpoint = '/ai/regulatory-report';
          const f = forms.regulatory;
          payload = {
            report_type: f.report_type,
            date_range: {
              start: f.date_range_start || undefined,
              end: f.date_range_end || undefined,
            },
            location: f.location || undefined,
            transactions: f.transactions_summary || undefined,
          };
          break;
        }
        case 'negotiation': {
          endpoint = '/ai/negotiation-tips';
          const f = forms.negotiation;
          if (!f.item_description.trim()) {
            toast.error('Please provide an item description');
            setLoading(false);
            return;
          }
          payload = {
            item_description: f.item_description,
            estimated_value: f.estimated_value ? Number(f.estimated_value) : undefined,
            customer_asking_price: f.customer_asking_price ? Number(f.customer_asking_price) : undefined,
            market_conditions: f.market_conditions || 'normal',
          };
          break;
        }
        case 'market_price': {
          endpoint = '/ai/market-price';
          const f = forms.market_price;
          if (!f.category || !f.description.trim()) {
            toast.error('Category and description are required');
            setLoading(false);
            return;
          }
          payload = {
            category: f.category,
            description: f.description,
            condition: f.condition || 'Good',
            brand: f.brand || undefined,
            model: f.model || undefined,
          };
          break;
        }
        case 'loan_calc': {
          endpoint = '/ai/loan-recommendation';
          const f = forms.loan_calc;
          if (!f.appraisedValue) {
            toast.error('Appraised value is required');
            setLoading(false);
            return;
          }
          payload = {
            appraisedValue: Number(f.appraisedValue),
            itemCategory: f.itemCategory || undefined,
            customerId: f.customerId ? Number(f.customerId) : undefined,
          };
          break;
        }
        case 'compliance': {
          endpoint = '/ai/compliance-check';
          const f = forms.compliance;
          if (!f.jurisdiction.trim()) {
            toast.error('Jurisdiction is required');
            setLoading(false);
            return;
          }
          payload = {
            jurisdiction: f.jurisdiction,
            businessType: f.businessType || undefined,
            specificQuestion: f.specificQuestion || undefined,
          };
          break;
        }
        default:
          break;
      }

      const res = await api.post(endpoint, payload);
      setResult(res.data);
      setResultType(activeTool);
      toast.success('AI analysis complete');
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'AI analysis failed';
      toast.error(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // --- Form field helpers ---

  function InputField({ label, value, onChange, type = 'text', placeholder, required }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm
                     focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors
                     placeholder:text-gray-400"
        />
      </div>
    );
  }

  function TextAreaField({ label, value, onChange, placeholder, required, rows = 3 }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm
                     focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors
                     placeholder:text-gray-400 resize-none"
        />
      </div>
    );
  }

  function SelectField({ label, value, onChange, options, placeholder, required }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm
                     focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  // --- Render each tool's form ---

  function renderValuationForm() {
    const f = forms.valuation;
    return (
      <div className="space-y-4">
        <TextAreaField
          label="Item Description"
          value={f.item_description}
          onChange={(v) => updateForm('valuation', 'item_description', v)}
          placeholder="Describe the item in detail (e.g., 14k gold ring with 0.5ct diamond, excellent clarity)"
          required
          rows={4}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Category"
            value={f.category}
            onChange={(v) => updateForm('valuation', 'category', v)}
            options={CATEGORIES}
            placeholder="Select category..."
          />
          <SelectField
            label="Condition"
            value={f.condition}
            onChange={(v) => updateForm('valuation', 'condition', v)}
            options={CONDITIONS}
            placeholder="Select condition..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Brand"
            value={f.brand}
            onChange={(v) => updateForm('valuation', 'brand', v)}
            placeholder="e.g., Rolex, Gibson"
          />
          <InputField
            label="Model"
            value={f.model}
            onChange={(v) => updateForm('valuation', 'model', v)}
            placeholder="e.g., Submariner, Les Paul"
          />
          <InputField
            label="Age"
            value={f.age}
            onChange={(v) => updateForm('valuation', 'age', v)}
            placeholder="e.g., 5 years, Vintage 1970"
          />
        </div>
      </div>
    );
  }

  function renderMarketForm() {
    const f = forms.market;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Item Category"
            value={f.item_category}
            onChange={(v) => updateForm('market', 'item_category', v)}
            options={CATEGORIES}
            placeholder="Select category..."
          />
          <InputField
            label="Item Name"
            value={f.item_name}
            onChange={(v) => updateForm('market', 'item_name', v)}
            placeholder="e.g., iPhone 15 Pro, Gold Necklace"
          />
        </div>
        <InputField
          label="Region"
          value={f.region}
          onChange={(v) => updateForm('market', 'region', v)}
          placeholder="e.g., United States, New York"
        />
      </div>
    );
  }

  function renderRiskForm() {
    const f = forms.risk;
    return (
      <div className="space-y-4">
        <TextAreaField
          label="Customer History"
          value={f.customer_history}
          onChange={(v) => updateForm('risk', 'customer_history', v)}
          placeholder="e.g., 5 previous loans, 1 default, 3 year customer, always paid within grace period"
          required
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Loan Amount ($)"
            value={f.loan_amount}
            onChange={(v) => updateForm('risk', 'loan_amount', v)}
            type="number"
            placeholder="e.g., 500"
          />
          <InputField
            label="Item Value ($)"
            value={f.item_value}
            onChange={(v) => updateForm('risk', 'item_value', v)}
            type="number"
            placeholder="e.g., 1200"
          />
          <SelectField
            label="Item Category"
            value={f.item_category}
            onChange={(v) => updateForm('risk', 'item_category', v)}
            options={CATEGORIES}
            placeholder="Select category..."
          />
        </div>
      </div>
    );
  }

  function renderCounterfeitForm() {
    const f = forms.counterfeit;
    return (
      <div className="space-y-4">
        <TextAreaField
          label="Item Description"
          value={f.item_description}
          onChange={(v) => updateForm('counterfeit', 'item_description', v)}
          placeholder="Describe the item in detail including any markings, stamps, or engravings"
          required
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Category"
            value={f.category}
            onChange={(v) => updateForm('counterfeit', 'category', v)}
            options={CATEGORIES}
            placeholder="Select category..."
          />
          <InputField
            label="Brand"
            value={f.brand}
            onChange={(v) => updateForm('counterfeit', 'brand', v)}
            placeholder="e.g., Louis Vuitton, Apple"
          />
          <InputField
            label="Serial Number"
            value={f.serial_number}
            onChange={(v) => updateForm('counterfeit', 'serial_number', v)}
            placeholder="e.g., SN12345678"
          />
        </div>
        <TextAreaField
          label="Photos Description (optional if uploading photo)"
          value={f.photos_description}
          onChange={(v) => updateForm('counterfeit', 'photos_description', v)}
          placeholder="Describe the item's appearance: stitching quality, logo placement, material texture, weight, color accuracy, etc."
          rows={3}
        />
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Upload Photo <span className="text-gray-400 text-xs">(optional - enables vision AI analysis)</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 transition-colors">
              <Upload className="w-4 h-4" />
              {counterfeitPhoto ? counterfeitPhoto.name : 'Choose image...'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setCounterfeitPhoto(e.target.files?.[0] || null)}
              />
            </label>
            {counterfeitPhoto && (
              <button
                type="button"
                onClick={() => setCounterfeitPhoto(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {counterfeitPhoto && (
            <p className="text-xs text-green-600 mt-1">Photo selected: AI will analyze image for counterfeit indicators</p>
          )}
        </div>
      </div>
    );
  }

  function renderRegulatoryForm() {
    const f = forms.regulatory;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Report Type"
            value={f.report_type}
            onChange={(v) => updateForm('regulatory', 'report_type', v)}
            options={[
              { value: 'daily_transaction', label: 'Daily Transaction Report' },
              { value: 'monthly_summary', label: 'Monthly Summary' },
              { value: 'annual_compliance', label: 'Annual Compliance Report' },
              { value: 'suspicious_activity', label: 'Suspicious Activity Report' },
            ]}
            placeholder="Select report type..."
          />
          <InputField
            label="Location"
            value={f.location}
            onChange={(v) => updateForm('regulatory', 'location', v)}
            placeholder="e.g., 123 Main St, Springfield, IL"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={f.date_range_start}
              onChange={(e) => updateForm('regulatory', 'date_range_start', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm
                         focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={f.date_range_end}
              onChange={(e) => updateForm('regulatory', 'date_range_end', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm
                         focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
        <TextAreaField
          label="Transactions Summary"
          value={f.transactions_summary}
          onChange={(v) => updateForm('regulatory', 'transactions_summary', v)}
          placeholder="Summarize relevant transactions, amounts, customer information, and any notable activity"
          rows={4}
        />
      </div>
    );
  }

  function renderNegotiationForm() {
    const f = forms.negotiation;
    return (
      <div className="space-y-4">
        <TextAreaField
          label="Item Description"
          value={f.item_description}
          onChange={(v) => updateForm('negotiation', 'item_description', v)}
          placeholder="Describe the item the customer wants to pawn or sell"
          required
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Estimated Value ($)"
            value={f.estimated_value}
            onChange={(v) => updateForm('negotiation', 'estimated_value', v)}
            type="number"
            placeholder="e.g., 800"
          />
          <InputField
            label="Customer Asking Price ($)"
            value={f.customer_asking_price}
            onChange={(v) => updateForm('negotiation', 'customer_asking_price', v)}
            type="number"
            placeholder="e.g., 1200"
          />
          <SelectField
            label="Market Conditions"
            value={f.market_conditions}
            onChange={(v) => updateForm('negotiation', 'market_conditions', v)}
            options={[
              { value: 'hot', label: 'Hot - High Demand' },
              { value: 'normal', label: 'Normal - Stable' },
              { value: 'slow', label: 'Slow - Low Demand' },
              { value: 'declining', label: 'Declining - Falling Prices' },
            ]}
          />
        </div>
      </div>
    );
  }

  function renderMarketPriceForm() {
    const f = forms.market_price;
    return (
      <div className="space-y-4">
        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-700">
          Get real-time market price ranges with comparable sales data from eBay, Facebook Marketplace, and other platforms.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Category"
            value={f.category}
            onChange={(v) => updateForm('market_price', 'category', v)}
            options={CATEGORIES}
            placeholder="Select category..."
            required
          />
          <SelectField
            label="Condition"
            value={f.condition}
            onChange={(v) => updateForm('market_price', 'condition', v)}
            options={CONDITIONS}
            placeholder="Select condition..."
          />
        </div>
        <TextAreaField
          label="Item Description"
          value={f.description}
          onChange={(v) => updateForm('market_price', 'description', v)}
          placeholder="Describe the item (e.g., Apple iPhone 15 Pro 256GB Space Black, minor screen scratches)"
          required
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Brand"
            value={f.brand}
            onChange={(v) => updateForm('market_price', 'brand', v)}
            placeholder="e.g., Apple, Rolex, Fender"
          />
          <InputField
            label="Model"
            value={f.model}
            onChange={(v) => updateForm('market_price', 'model', v)}
            placeholder="e.g., iPhone 15 Pro, Submariner"
          />
        </div>
      </div>
    );
  }

  function renderLoanCalcForm() {
    const f = forms.loan_calc;
    return (
      <div className="space-y-4">
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700">
          Get AI-recommended loan amount, interest rate, and redemption timeline based on item value and customer history.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Appraised Value ($)"
            value={f.appraisedValue}
            onChange={(v) => updateForm('loan_calc', 'appraisedValue', v)}
            type="number"
            placeholder="e.g., 500"
            required
          />
          <SelectField
            label="Item Category"
            value={f.itemCategory}
            onChange={(v) => updateForm('loan_calc', 'itemCategory', v)}
            options={CATEGORIES}
            placeholder="Select category..."
          />
          <InputField
            label="Customer ID (optional)"
            value={f.customerId}
            onChange={(v) => updateForm('loan_calc', 'customerId', v)}
            type="number"
            placeholder="Auto-loads loan history"
          />
        </div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          If Customer ID is provided, the AI will automatically load their loan history to determine their customer tier and risk-adjusted rates.
        </div>
      </div>
    );
  }

  function renderComplianceForm() {
    const f = forms.compliance;
    return (
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
          Get comprehensive pawn shop regulatory requirements for any US state or city jurisdiction.
        </div>
        <InputField
          label="Jurisdiction"
          value={f.jurisdiction}
          onChange={(v) => updateForm('compliance', 'jurisdiction', v)}
          placeholder="e.g., Texas, California, New York City, Chicago"
          required
        />
        <SelectField
          label="Business Type"
          value={f.businessType}
          onChange={(v) => updateForm('compliance', 'businessType', v)}
          options={[
            { value: 'Traditional pawn shop (buy/sell/loan)', label: 'Traditional Pawn Shop' },
            { value: 'Secondhand dealer only', label: 'Secondhand Dealer Only' },
            { value: 'Pawn shop with firearms sales', label: 'Pawn Shop with Firearms' },
            { value: 'Online pawn / shipping-based', label: 'Online / Shipping-Based' },
          ]}
        />
        <TextAreaField
          label="Specific Question (optional)"
          value={f.specificQuestion}
          onChange={(v) => updateForm('compliance', 'specificQuestion', v)}
          placeholder="e.g., What are the holding period requirements for electronics? Do I need a separate firearms license?"
          rows={3}
        />
      </div>
    );
  }

  const formRenderers = {
    valuation: renderValuationForm,
    market: renderMarketForm,
    risk: renderRiskForm,
    counterfeit: renderCounterfeitForm,
    regulatory: renderRegulatoryForm,
    negotiation: renderNegotiationForm,
    market_price: renderMarketPriceForm,
    loan_calc: renderLoanCalcForm,
    compliance: renderComplianceForm,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">

        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-xl backdrop-blur-sm border border-amber-500/30">
            <Brain className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI-Powered Analysis Tools</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Powered by Claude AI
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'tools' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          AI Tools
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          AI History
        </button>
      </div>

      {/* AI History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyLoading && (
            <div className="text-center py-12 text-gray-400">Loading AI history...</div>
          )}
          {!historyLoading && history.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No AI analyses yet. Run some AI tools above to see history here.
            </div>
          )}
          {history.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setHistoryExpanded(historyExpanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    {entry.endpoint}
                  </span>
                  {entry.inventory_id && (
                    <span className="text-xs text-gray-500">Item #{entry.inventory_id}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">{historyExpanded === entry.id ? '▲' : '▼'}</span>
              </div>
              {historyExpanded === entry.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64 font-mono">
                    {typeof entry.result === 'object' ? JSON.stringify(entry.result, null, 2) : String(entry.result)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {historyPage} of {historyPagination.totalPages}
              </span>
              <button
                onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
                disabled={historyPage === historyPagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tool Cards Grid - only shown in tools tab */}
      {activeTab === 'tools' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`group relative text-left rounded-xl p-5 transition-all duration-300 ease-out
                ${
                  isActive
                    ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-md'
                }
                bg-white`}
            >
              <div
                className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${tool.gradient} mb-3
                  shadow-sm transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{tool.name}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
              {isActive && (
                <div className="absolute top-3 right-3">
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tool Form */}
      <div
        className={`transition-all duration-500 ease-out overflow-hidden ${
          activeTool ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {activeTool && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              {(() => {
                const tool = TOOLS.find((t) => t.id === activeTool);
                const Icon = tool?.icon || Brain;
                return (
                  <>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${tool?.gradient || 'from-gray-500 to-gray-600'}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{tool?.name}</h2>
                      <p className="text-xs text-gray-500">Fill in the details below for AI analysis</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6">
              {formRenderers[activeTool]?.()}

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl
                             bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700
                             text-white font-semibold text-sm shadow-lg shadow-amber-500/25
                             transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/30
                             disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Analyze with AI
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* AI Result Display */}
      {(loading || result) && (
        <div className="transition-all duration-300">
          <AIResultDisplay data={result} type={resultType} isLoading={loading} />
        </div>
      )}
    </div>
  );
}
