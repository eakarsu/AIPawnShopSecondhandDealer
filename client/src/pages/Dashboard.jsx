import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const featureCards = [
  {
    key: 'customers',
    title: 'Customers',
    description: 'Manage customer records and identification',
    icon: Users,
    color: 'blue',
    route: '/customers',
    bgClass: 'bg-blue-50',
    iconBgClass: 'bg-blue-100',
    iconTextClass: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-700',
    borderHoverClass: 'hover:border-blue-200',
  },
  {
    key: 'inventory',
    title: 'Inventory',
    description: 'Track items, serial numbers, and stock',
    icon: Package,
    color: 'green',
    route: '/inventory',
    bgClass: 'bg-green-50',
    iconBgClass: 'bg-green-100',
    iconTextClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-700',
    borderHoverClass: 'hover:border-green-200',
  },
  {
    key: 'loans',
    title: 'Pawn Loans',
    description: 'Loan management, interest, maturity',
    icon: Banknote,
    color: 'amber',
    route: '/loans',
    bgClass: 'bg-amber-50',
    iconBgClass: 'bg-amber-100',
    iconTextClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    borderHoverClass: 'hover:border-amber-200',
  },
  {
    key: 'payments',
    title: 'Payments',
    description: 'Payment history and processing',
    icon: CreditCard,
    color: 'purple',
    route: '/payments',
    bgClass: 'bg-purple-50',
    iconBgClass: 'bg-purple-100',
    iconTextClass: 'text-purple-600',
    badgeClass: 'bg-purple-100 text-purple-700',
    borderHoverClass: 'hover:border-purple-200',
  },
  {
    key: 'layaway',
    title: 'Layaway',
    description: 'Layaway plans and installments',
    icon: ShoppingBag,
    color: 'pink',
    route: '/layaway',
    bgClass: 'bg-pink-50',
    iconBgClass: 'bg-pink-100',
    iconTextClass: 'text-pink-600',
    badgeClass: 'bg-pink-100 text-pink-700',
    borderHoverClass: 'hover:border-pink-200',
  },
  {
    key: 'holdPeriods',
    title: 'Hold Periods',
    description: 'Police hold compliance tracking',
    icon: Clock,
    color: 'orange',
    route: '/hold-periods',
    bgClass: 'bg-orange-50',
    iconBgClass: 'bg-orange-100',
    iconTextClass: 'text-orange-600',
    badgeClass: 'bg-orange-100 text-orange-700',
    borderHoverClass: 'hover:border-orange-200',
  },
  {
    key: 'preciousMetals',
    title: 'Precious Metals',
    description: 'Testing logs and valuations',
    icon: Gem,
    color: 'yellow',
    route: '/precious-metals',
    bgClass: 'bg-yellow-50',
    iconBgClass: 'bg-yellow-100',
    iconTextClass: 'text-yellow-600',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    borderHoverClass: 'hover:border-yellow-200',
  },
  {
    key: 'firearms',
    title: 'Firearms Log',
    description: 'ATF compliance and bound book',
    icon: Target,
    color: 'red',
    route: '/firearms',
    bgClass: 'bg-red-50',
    iconBgClass: 'bg-red-100',
    iconTextClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-700',
    borderHoverClass: 'hover:border-red-200',
  },
  {
    key: 'policeReports',
    title: 'Police Reports',
    description: 'Daily transaction reports',
    icon: FileText,
    color: 'indigo',
    route: '/police-reports',
    bgClass: 'bg-indigo-50',
    iconBgClass: 'bg-indigo-100',
    iconTextClass: 'text-indigo-600',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    borderHoverClass: 'hover:border-indigo-200',
  },
  {
    key: 'cashDrawer',
    title: 'Cash Drawer',
    description: 'Cash management and reconciliation',
    icon: Wallet,
    color: 'teal',
    route: '/cash-drawer',
    bgClass: 'bg-teal-50',
    iconBgClass: 'bg-teal-100',
    iconTextClass: 'text-teal-600',
    badgeClass: 'bg-teal-100 text-teal-700',
    borderHoverClass: 'hover:border-teal-200',
  },
  {
    key: 'receipts',
    title: 'Receipts',
    description: 'Transaction receipts and printing',
    icon: Receipt,
    color: 'cyan',
    route: '/receipts',
    bgClass: 'bg-cyan-50',
    iconBgClass: 'bg-cyan-100',
    iconTextClass: 'text-cyan-600',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    borderHoverClass: 'hover:border-cyan-200',
  },
  {
    key: 'auctions',
    title: 'Auctions',
    description: 'Liquidation and auction management',
    icon: Gavel,
    color: 'rose',
    route: '/auctions',
    bgClass: 'bg-rose-50',
    iconBgClass: 'bg-rose-100',
    iconTextClass: 'text-rose-600',
    badgeClass: 'bg-rose-100 text-rose-700',
    borderHoverClass: 'hover:border-rose-200',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Customer alerts and reminders',
    icon: Bell,
    color: 'violet',
    route: '/notifications',
    bgClass: 'bg-violet-50',
    iconBgClass: 'bg-violet-100',
    iconTextClass: 'text-violet-600',
    badgeClass: 'bg-violet-100 text-violet-700',
    borderHoverClass: 'hover:border-violet-200',
  },
  {
    key: 'reports',
    title: 'Reports',
    description: 'Analytics and compliance reports',
    icon: BarChart3,
    color: 'emerald',
    route: '/reports',
    bgClass: 'bg-emerald-50',
    iconBgClass: 'bg-emerald-100',
    iconTextClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    borderHoverClass: 'hover:border-emerald-200',
  },
  {
    key: 'aiTools',
    title: 'AI Tools',
    description: 'AI-powered valuation and analysis',
    icon: Brain,
    color: 'amber',
    route: '/ai-tools',
    bgClass: 'bg-gradient-to-br from-amber-50 to-orange-50',
    iconBgClass: 'bg-gradient-to-br from-amber-100 to-orange-100',
    iconTextClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    borderHoverClass: 'hover:border-amber-200',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeLoans: 0,
    inventoryItems: 0,
    todaysRevenue: 0,
  });
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        customersRes,
        loansRes,
        inventoryRes,
        paymentsRes,
        layawayRes,
        holdPeriodsRes,
        preciousMetalsRes,
        firearmsRes,
        policeReportsRes,
        receiptsRes,
        auctionsRes,
        notificationsRes,
      ] = await Promise.allSettled([
        api.get('/customers'),
        api.get('/loans'),
        api.get('/inventory'),
        api.get('/payments'),
        api.get('/layaway'),
        api.get('/hold-periods'),
        api.get('/precious-metals'),
        api.get('/firearms'),
        api.get('/police-reports'),
        api.get('/receipts'),
        api.get('/auctions'),
        api.get('/notifications'),
      ]);

      const customers = customersRes.status === 'fulfilled' ? customersRes.value.data : [];
      const loans = loansRes.status === 'fulfilled' ? loansRes.value.data : [];
      const inventory = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data : [];
      const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data : [];
      const layaway = layawayRes.status === 'fulfilled' ? layawayRes.value.data : [];
      const holdPeriods = holdPeriodsRes.status === 'fulfilled' ? holdPeriodsRes.value.data : [];
      const preciousMetals = preciousMetalsRes.status === 'fulfilled' ? preciousMetalsRes.value.data : [];
      const firearms = firearmsRes.status === 'fulfilled' ? firearmsRes.value.data : [];
      const policeReports = policeReportsRes.status === 'fulfilled' ? policeReportsRes.value.data : [];
      const receipts = receiptsRes.status === 'fulfilled' ? receiptsRes.value.data : [];
      const auctions = auctionsRes.status === 'fulfilled' ? auctionsRes.value.data : [];
      const notifications = notificationsRes.status === 'fulfilled' ? notificationsRes.value.data : [];

      const customersArr = Array.isArray(customers) ? customers : [];
      const loansArr = Array.isArray(loans) ? loans : [];
      const inventoryArr = Array.isArray(inventory) ? inventory : [];
      const paymentsArr = Array.isArray(payments) ? payments : [];
      const layawayArr = Array.isArray(layaway) ? layaway : [];
      const holdPeriodsArr = Array.isArray(holdPeriods) ? holdPeriods : [];
      const preciousMetalsArr = Array.isArray(preciousMetals) ? preciousMetals : [];
      const firearmsArr = Array.isArray(firearms) ? firearms : [];
      const policeReportsArr = Array.isArray(policeReports) ? policeReports : [];
      const receiptsArr = Array.isArray(receipts) ? receipts : [];
      const auctionsArr = Array.isArray(auctions) ? auctions : [];
      const notificationsArr = Array.isArray(notifications) ? notifications : [];

      const activeLoans = loansArr.filter(
        (l) => l.status === 'active' || l.status === 'Active'
      );

      const today = new Date().toISOString().slice(0, 10);
      const todaysPayments = paymentsArr.filter((p) => {
        const payDate = p.payment_date || p.created_at || '';
        return payDate.slice(0, 10) === today;
      });
      const todaysRevenue = todaysPayments.reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0),
        0
      );

      setStats({
        totalCustomers: customersArr.length,
        activeLoans: activeLoans.length,
        inventoryItems: inventoryArr.length,
        todaysRevenue: todaysRevenue,
      });

      setCounts({
        customers: customersArr.length,
        inventory: inventoryArr.length,
        loans: loansArr.length,
        payments: paymentsArr.length,
        layaway: layawayArr.length,
        holdPeriods: holdPeriodsArr.length,
        preciousMetals: preciousMetalsArr.length,
        firearms: firearmsArr.length,
        policeReports: policeReportsArr.length,
        cashDrawer: 0,
        receipts: receiptsArr.length,
        auctions: auctionsArr.length,
        notifications: notificationsArr.length,
        reports: 0,
        aiTools: 0,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'blue',
      bgClass: 'bg-blue-50',
      iconBgClass: 'bg-blue-100',
      iconTextClass: 'text-blue-600',
    },
    {
      title: 'Active Loans',
      value: stats.activeLoans,
      icon: Activity,
      color: 'amber',
      bgClass: 'bg-amber-50',
      iconBgClass: 'bg-amber-100',
      iconTextClass: 'text-amber-600',
    },
    {
      title: 'Inventory Items',
      value: stats.inventoryItems,
      icon: Package,
      color: 'green',
      bgClass: 'bg-green-50',
      iconBgClass: 'bg-green-100',
      iconTextClass: 'text-green-600',
    },
    {
      title: "Today's Revenue",
      value: `$${stats.todaysRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'emerald',
      bgClass: 'bg-emerald-50',
      iconBgClass: 'bg-emerald-100',
      iconTextClass: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name || 'User'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{currentDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            System Online
          </span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const IconComp = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBgClass}`}>
                  <IconComp className={`w-6 h-6 ${stat.iconTextClass}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const IconComp = card.icon;
            const count = counts[card.key] ?? null;
            return (
              <button
                key={card.key}
                onClick={() => navigate(card.route)}
                className={`group text-left bg-white rounded-xl border border-gray-200 p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${card.borderHoverClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.iconBgClass}`}>
                    <IconComp className={`w-5 h-5 ${card.iconTextClass}`} />
                  </div>
                  {count !== null && count > 0 && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${card.badgeClass}`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
