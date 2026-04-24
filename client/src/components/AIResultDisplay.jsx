import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  ShieldCheck,
  Lightbulb,
  BarChart3,
  Target,
  Scale,
} from 'lucide-react';

function RiskBar({ value, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  let color = 'bg-green-500';
  if (pct > 70) color = 'bg-red-500';
  else if (pct > 40) color = 'bg-amber-500';

  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-700 w-10 text-right">{value}{max === 100 ? '%' : `/${max}`}</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }) {
  let bg = 'bg-green-100 text-green-700';
  if (value < 0.5) bg = 'bg-red-100 text-red-700';
  else if (value < 0.75) bg = 'bg-amber-100 text-amber-700';

  const display = typeof value === 'number' && value <= 1 ? `${(value * 100).toFixed(0)}%` : value;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg}`}>
      {display} confidence
    </span>
  );
}

function SectionCard({ title, icon: Icon, children, accent = 'amber' }) {
  const accents = {
    amber: 'border-l-amber-500 bg-amber-50/50',
    green: 'border-l-green-500 bg-green-50/50',
    red: 'border-l-red-500 bg-red-50/50',
    blue: 'border-l-blue-500 bg-blue-50/50',
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${accents[accent] || accents.amber}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
        <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function KeyValue({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right ml-4">
        {typeof value === 'number' && label.toLowerCase().includes('price')
          ? `$${value.toLocaleString()}`
          : typeof value === 'number'
          ? value.toLocaleString()
          : String(value)}
      </span>
    </div>
  );
}

function RecommendationBox({ text, type = 'info' }) {
  const styles = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-500' },
    success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500' },
    tip: { bg: 'bg-purple-50 border-purple-200', icon: Lightbulb, iconColor: 'text-purple-500' },
  };
  const s = styles[type] || styles.info;
  const Icon = s.icon;

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${s.bg}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}

function renderValue(key, value) {
  if (value === null || value === undefined) return null;

  const k = key.toLowerCase();

  // Risk / score bars
  if ((k.includes('risk') || k.includes('score') || k.includes('rating')) && typeof value === 'number') {
    const max = value > 10 ? 100 : 10;
    return <RiskBar value={value} max={max} label={formatLabel(key)} />;
  }

  // Confidence
  if (k.includes('confidence') && typeof value === 'number') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{formatLabel(key)}</span>
        <ConfidenceBadge value={value} />
      </div>
    );
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') {
      return (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">{formatLabel(key)}</p>
          <ul className="space-y-1.5">
            {value.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    // Array of objects
    return (
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">{formatLabel(key)}</p>
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
              {typeof item === 'object'
                ? Object.entries(item).map(([k2, v2]) => (
                    <KeyValue key={k2} label={formatLabel(k2)} value={typeof v2 === 'object' ? JSON.stringify(v2) : v2} />
                  ))
                : <p className="text-sm text-gray-700">{String(item)}</p>
              }
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nested objects
  if (typeof value === 'object') {
    return (
      <SectionCard title={formatLabel(key)} icon={Info}>
        <div className="space-y-1">
          {Object.entries(value).map(([k2, v2]) => {
            if (typeof v2 === 'object' && v2 !== null) {
              return <div key={k2} className="mt-2">{renderValue(k2, v2)}</div>;
            }
            return <KeyValue key={k2} label={formatLabel(k2)} value={v2} />;
          })}
        </div>
      </SectionCard>
    );
  }

  // Simple key-value
  return <KeyValue label={formatLabel(key)} value={value} />;
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Type-specific renderers
function renderValuation(data) {
  const {
    estimatedValue, suggestedOffer, retailPrice, wholesalePrice, confidence,
    condition, category, brand, model, comparables, recommendations, factors, ...rest
  } = data;

  return (
    <div className="space-y-4">
      {/* Price cards */}
      <div className="grid grid-cols-2 gap-3">
        {estimatedValue != null && (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-amber-100">Estimated Value</p>
            <p className="text-2xl font-bold mt-1">${Number(estimatedValue).toLocaleString()}</p>
          </div>
        )}
        {suggestedOffer != null && (
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-green-100">Suggested Offer</p>
            <p className="text-2xl font-bold mt-1">${Number(suggestedOffer).toLocaleString()}</p>
          </div>
        )}
        {retailPrice != null && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">Retail Price</p>
            <p className="text-xl font-bold text-gray-900 mt-1">${Number(retailPrice).toLocaleString()}</p>
          </div>
        )}
        {wholesalePrice != null && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">Wholesale Price</p>
            <p className="text-xl font-bold text-gray-900 mt-1">${Number(wholesalePrice).toLocaleString()}</p>
          </div>
        )}
      </div>

      {confidence != null && (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <ConfidenceBadge value={confidence} />
        </div>
      )}

      {/* Item details */}
      {(condition || category || brand || model) && (
        <SectionCard title="Item Details" icon={Target}>
          <div className="space-y-1">
            {brand && <KeyValue label="Brand" value={brand} />}
            {model && <KeyValue label="Model" value={model} />}
            {category && <KeyValue label="Category" value={category} />}
            {condition && <KeyValue label="Condition" value={condition} />}
          </div>
        </SectionCard>
      )}

      {factors && renderValue('valuation_factors', factors)}
      {comparables && renderValue('comparable_items', comparables)}
      {recommendations && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Recommendations</h4>
          {(Array.isArray(recommendations) ? recommendations : [recommendations]).map((rec, i) => (
            <RecommendationBox key={i} text={typeof rec === 'string' ? rec : rec.text || JSON.stringify(rec)} type={rec.type || 'tip'} />
          ))}
        </div>
      )}

      {/* Remaining fields */}
      {Object.keys(rest).length > 0 && (
        <div className="space-y-3">
          {Object.entries(rest).map(([k, v]) => (
            <div key={k}>{renderValue(k, v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderRisk(data) {
  const { riskScore, riskLevel, factors, flags, recommendations, confidence, ...rest } = data;

  const levelColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-red-200 text-red-800',
  };

  return (
    <div className="space-y-4">
      {/* Risk header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {riskScore != null && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Overall Risk Score</p>
            <RiskBar value={riskScore} max={riskScore > 10 ? 100 : 10} />
          </div>
        )}
        <div className="flex items-center gap-3">
          {riskLevel && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${levelColors[riskLevel.toLowerCase()] || levelColors.medium}`}>
              {riskLevel.toUpperCase()} RISK
            </span>
          )}
          {confidence != null && <ConfidenceBadge value={confidence} />}
        </div>
      </div>

      {flags && Array.isArray(flags) && flags.length > 0 && (
        <SectionCard title="Risk Flags" icon={AlertTriangle} accent="red">
          <ul className="space-y-2">
            {flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                {typeof flag === 'string' ? flag : flag.description || JSON.stringify(flag)}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {factors && renderValue('risk_factors', factors)}

      {recommendations && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Recommendations</h4>
          {(Array.isArray(recommendations) ? recommendations : [recommendations]).map((rec, i) => (
            <RecommendationBox key={i} text={typeof rec === 'string' ? rec : rec.text || JSON.stringify(rec)} type="warning" />
          ))}
        </div>
      )}

      {Object.keys(rest).length > 0 && (
        <div className="space-y-3">
          {Object.entries(rest).map(([k, v]) => (
            <div key={k}>{renderValue(k, v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMarket(data) {
  const { trends, priceHistory, forecast, marketCondition, recommendations, ...rest } = data;

  return (
    <div className="space-y-4">
      {marketCondition && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <p className="text-xs font-medium text-blue-100">Market Condition</p>
          </div>
          <p className="text-lg font-bold mt-1">{marketCondition}</p>
        </div>
      )}

      {trends && renderValue('market_trends', trends)}
      {priceHistory && renderValue('price_history', priceHistory)}
      {forecast && renderValue('forecast', forecast)}

      {recommendations && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Recommendations</h4>
          {(Array.isArray(recommendations) ? recommendations : [recommendations]).map((rec, i) => (
            <RecommendationBox key={i} text={typeof rec === 'string' ? rec : rec.text || JSON.stringify(rec)} type="info" />
          ))}
        </div>
      )}

      {Object.keys(rest).length > 0 && (
        <div className="space-y-3">
          {Object.entries(rest).map(([k, v]) => (
            <div key={k}>{renderValue(k, v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderGeneric(data) {
  if (typeof data === 'string') {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{data}</p>;
  }
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  // Extract special fields
  const { recommendations, confidence, summary, description, ...fields } = data;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-gray-800">{summary}</p>
        </div>
      )}

      {description && (
        <p className="text-sm text-gray-700">{description}</p>
      )}

      {confidence != null && (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <ConfidenceBadge value={confidence} />
        </div>
      )}

      {Object.keys(fields).length > 0 && (
        <div className="space-y-3">
          {Object.entries(fields).map(([k, v]) => (
            <div key={k}>{renderValue(k, v)}</div>
          ))}
        </div>
      )}

      {recommendations && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Recommendations</h4>
          {(Array.isArray(recommendations) ? recommendations : [recommendations]).map((rec, i) => (
            <RecommendationBox key={i} text={typeof rec === 'string' ? rec : rec.text || JSON.stringify(rec)} type="tip" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIResultDisplay({ data, type = 'valuation', isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4 font-medium">AI is analyzing...</p>
        <p className="text-xs text-gray-400 mt-1">This may take a few moments</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No AI analysis data available.</p>
      </div>
    );
  }

  const typeHeaders = {
    valuation: { title: 'AI Valuation Report', icon: DollarSign, color: 'from-amber-500 to-amber-600' },
    risk: { title: 'Risk Assessment', icon: AlertTriangle, color: 'from-red-500 to-red-600' },
    market: { title: 'Market Analysis', icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
    counterfeit: { title: 'Counterfeit Detection', icon: ShieldCheck, color: 'from-purple-500 to-purple-600' },
    regulatory: { title: 'Regulatory Compliance', icon: Scale, color: 'from-green-500 to-green-600' },
    negotiation: { title: 'Negotiation Strategy', icon: Target, color: 'from-indigo-500 to-indigo-600' },
  };

  const header = typeHeaders[type] || typeHeaders.valuation;
  const HeaderIcon = header.icon;

  const renderers = {
    valuation: renderValuation,
    risk: renderRisk,
    market: renderMarket,
    counterfeit: renderGeneric,
    regulatory: renderGeneric,
    negotiation: renderGeneric,
  };

  const renderer = renderers[type] || renderGeneric;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header bar */}
      <div className={`bg-gradient-to-r ${header.color} px-5 py-3 flex items-center gap-2.5`}>
        <HeaderIcon className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold text-sm">{header.title}</h3>
      </div>

      {/* Content */}
      <div className="p-5">
        {renderer(typeof data === 'string' ? tryParseJSON(data) : data)}
      </div>
    </div>
  );
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
