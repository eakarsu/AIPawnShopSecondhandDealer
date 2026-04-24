import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Loans from './pages/Loans';
import Payments from './pages/Payments';
import Layaway from './pages/Layaway';
import HoldPeriods from './pages/HoldPeriods';
import PreciousMetals from './pages/PreciousMetals';
import Firearms from './pages/Firearms';
import PoliceReports from './pages/PoliceReports';
import CashDrawer from './pages/CashDrawer';
import Receipts from './pages/Receipts';
import Auctions from './pages/Auctions';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import AITools from './pages/AITools';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/layaway" element={<Layaway />} />
          <Route path="/hold-periods" element={<HoldPeriods />} />
          <Route path="/precious-metals" element={<PreciousMetals />} />
          <Route path="/firearms" element={<Firearms />} />
          <Route path="/police-reports" element={<PoliceReports />} />
          <Route path="/cash-drawer" element={<CashDrawer />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-tools" element={<AITools />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
