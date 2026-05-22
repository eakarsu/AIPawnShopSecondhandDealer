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
import AIPredictive from './pages/AIPredictive';
import Layout from './components/Layout';

// // === Batch 06 Gaps & Frontend Mounts ===
import CFAgenticValuationPage from './pages/CFAgenticValuationPage';
import CFComplianceAutomationPage from './pages/CFComplianceAutomationPage';
import CFPricingRecommendationEnginePage from './pages/CFPricingRecommendationEnginePage';
import CFCustomerSegmentationMarketingPage from './pages/CFCustomerSegmentationMarketingPage';
import CFLoanDefaultPredictionInterventionPage from './pages/CFLoanDefaultPredictionInterventionPage';
import GapAuctionsWithoutAuctionPage from './pages/GapAuctionsWithoutAuctionPage';
import GapHoldPage from './pages/GapHoldPage';
import GapCashPage from './pages/GapCashPage';
import GapCustomersWithoutCustomerPage from './pages/GapCustomersWithoutCustomerPage';
import GapNoIntegrationWithNcicStolenGoodsDatabasesFbPage from './pages/GapNoIntegrationWithNcicStolenGoodsDatabasesFbPage';
import GapLimitedAtfFirearmsTrackingIntegrationSomeIntPage from './pages/GapLimitedAtfFirearmsTrackingIntegrationSomeIntPage';
import GapNoCustomerIdVerificationSystemAgeAddressForPage from './pages/GapNoCustomerIdVerificationSystemAgeAddressForPage';
import GapNoMultiPage from './pages/GapNoMultiPage';
import GapNoAuditTrailDedicatedModuleGrepShowed0AudiPage from './pages/GapNoAuditTrailDedicatedModuleGrepShowed0AudiPage';
import GapNoWebhooksForStolenPage from './pages/GapNoWebhooksForStolenPage';
import GapNoMobileAppForShowroomFloorStaffPage from './pages/GapNoMobileAppForShowroomFloorStaffPage';
import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

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
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

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
          <Route path="/ai-predictive" element={<AIPredictive />} />
          <Route path="*" element={<Navigate to="/" />} />
        
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-valuation" element={<CFAgenticValuationPage />} />
          <Route path="/cf-compliance-automation" element={<CFComplianceAutomationPage />} />
          <Route path="/cf-pricing-recommendation-engine" element={<CFPricingRecommendationEnginePage />} />
          <Route path="/cf-customer-segmentation-marketing" element={<CFCustomerSegmentationMarketingPage />} />
          <Route path="/cf-loan-default-prediction-intervention" element={<CFLoanDefaultPredictionInterventionPage />} />
          <Route path="/gap-auctions-without-auction" element={<GapAuctionsWithoutAuctionPage />} />
          <Route path="/gap-hold" element={<GapHoldPage />} />
          <Route path="/gap-cash" element={<GapCashPage />} />
          <Route path="/gap-customers-without-customer" element={<GapCustomersWithoutCustomerPage />} />
          <Route path="/gap-no-integration-with-ncic-stolen-goods-databases-fb" element={<GapNoIntegrationWithNcicStolenGoodsDatabasesFbPage />} />
          <Route path="/gap-limited-atf-firearms-tracking-integration-some-int" element={<GapLimitedAtfFirearmsTrackingIntegrationSomeIntPage />} />
          <Route path="/gap-no-customer-id-verification-system-age-address-for" element={<GapNoCustomerIdVerificationSystemAgeAddressForPage />} />
          <Route path="/gap-no-multi" element={<GapNoMultiPage />} />
          <Route path="/gap-no-audit-trail-dedicated-module-grep-showed-0-audi" element={<GapNoAuditTrailDedicatedModuleGrepShowed0AudiPage />} />
          <Route path="/gap-no-webhooks-for-stolen" element={<GapNoWebhooksForStolenPage />} />
          <Route path="/gap-no-mobile-app-for-showroom-floor-staff" element={<GapNoMobileAppForShowroomFloorStaffPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
