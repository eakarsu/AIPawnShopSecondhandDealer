import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Banknote,
  CreditCard,
  ShoppingBag,
  Clock,
  Gem,
  Target,
  FileText,
  Wallet,
  Receipt,
  Gavel,
  Bell,
  BarChart3,
  Brain,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Pawn Loans', icon: Banknote, path: '/loans' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Layaway', icon: ShoppingBag, path: '/layaway' },
  { label: 'Hold Periods', icon: Clock, path: '/hold-periods' },
  { label: 'Precious Metals', icon: Gem, path: '/precious-metals' },
  { label: 'Firearms Log', icon: Target, path: '/firearms' },
  { label: 'Police Reports', icon: FileText, path: '/police-reports' },
  { label: 'Cash Drawer', icon: Wallet, path: '/cash-drawer' },
  { label: 'Receipts', icon: Receipt, path: '/receipts' },
  { label: 'Auctions', icon: Gavel, path: '/auctions' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'AI Tools', icon: Brain, path: '/ai-tools' },
  { label: 'AI Predictive', icon: BarChart3, path: '/ai-predictive' },
  // === Batch 06 Gaps & Frontend Mounts ===
  { path: '/cf-agentic-valuation', label: 'Agentic valuation', icon: '✨' },
  { path: '/cf-compliance-automation', label: 'Compliance automation', icon: '✨' },
  { path: '/cf-pricing-recommendation-engine', label: 'Pricing recommendation engine', icon: '✨' },
  { path: '/cf-customer-segmentation-marketing', label: 'Customer segmentation + marketing', icon: '✨' },
  { path: '/cf-loan-default-prediction-intervention', label: 'Loan default prediction + intervention', icon: '✨' },
  { path: '/gap-auctions-without-auction', label: 'Auctions without `/auction', icon: '✨' },
  { path: '/gap-hold', label: 'Hold', icon: '✨' },
  { path: '/gap-cash', label: 'Cash', icon: '✨' },
  { path: '/gap-customers-without-customer', label: 'Customers without `/customer', icon: '✨' },
  { path: '/gap-no-integration-with-ncic-stolen-goods-databases-fb', label: 'No integration with NCIC/stolen goods databases (FBI/Interpol)', icon: '✨' },
  { path: '/gap-limited-atf-firearms-tracking-integration-some-int', label: 'Limited ATF firearms tracking integration (some integration code exists but no real ATF connector)', icon: '✨' },
  { path: '/gap-no-customer-id-verification-system-age-address-for', label: 'No customer ID verification system (age, address for regulated items)', icon: '✨' },
  { path: '/gap-no-multi', label: 'No multi', icon: '✨' },
  { path: '/gap-no-audit-trail-dedicated-module-grep-showed-0-audi', label: 'No audit trail dedicated module (grep showed 0 audit mentions)', icon: '✨' },
  { path: '/gap-no-webhooks-for-stolen', label: 'No webhooks for stolen', icon: '✨' },
  { path: '/gap-no-mobile-app-for-showroom-floor-staff', label: 'No mobile app for showroom floor staff', icon: '✨' }
];

export default function Layout({ children, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white leading-tight">Gold Shield</h1>
            <p className="text-xs text-amber-400 font-medium">Pawn Shop</p>
          </div>
        )}
        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex ml-auto p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-amber-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-800 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user.role || 'Staff'}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex justify-center p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-3 p-1 rounded text-gray-400 hover:text-white lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-gray-900 transition-all duration-200 shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-gray-900">Gold Shield Pawn</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
