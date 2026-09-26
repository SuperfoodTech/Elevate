import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RekapBillingPage } from './pages/RekapBillingPage';
import { RangkumanPage } from './pages/RangkumanPage';
import { LaporanPerformaPage } from './pages/LaporanPerformaPage';
import { PerformaComparisonPage } from './pages/PerformaComparisonPage';
import { LaporanJamRamaiPage } from './pages/LaporanJamRamaiPage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { OwnersPage } from './pages/OwnersPage';
import { OwnerDetailPage } from './pages/OwnerDetailPage';
import { BrandsPage } from './pages/BrandsPage';
import { BrandDetailPage } from './pages/BrandDetailPage';
import { OutletsPage } from './pages/OutletsPage';
import { OutletDetailPage } from './pages/OutletDetailPage';
import { ListingsPage } from './pages/ListingsPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { TransactionExplorerPage } from './pages/TransactionExplorerPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { VBTransactionDetailPage } from './pages/VBTransactionDetailPage';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Portal Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Core Navigation Routes matching Elevate2 Owner mockup */}
            <Route path="/owners" element={<OwnersPage />} />
            <Route path="/owners/:id" element={<OwnerDetailPage />} />
            <Route path="/modules/owner" element={<OwnersPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/brands/:id" element={<BrandDetailPage />} />
            <Route path="/modules/brand" element={<BrandsPage />} />
            <Route path="/outlets" element={<OutletsPage />} />
            <Route path="/outlets/:id" element={<OutletDetailPage />} />
            <Route path="/modules/outlet" element={<OutletsPage />} />
            <Route path="/transactions" element={<TransactionExplorerPage />} />
            <Route path="/transactions/agency" element={<Navigate to="/transactions?tab=agency" replace />} />
            <Route path="/transactions/vb" element={<Navigate to="/transactions?tab=vb" replace />} />
            <Route path="/transactions/:orderId" element={<TransactionDetailPage />} />
            <Route path="/transactions/vb/:orderId" element={<VBTransactionDetailPage />} />
            <Route path="/settlement" element={<PerformaComparisonPage />} />
            <Route path="/reports" element={<LaporanPerformaPage />} />
            <Route path="/payments" element={<RekapBillingPage />} />

            {/* Virtual Brand (VB) Routes redirecting to unified Transactions page */}
            <Route path="/vb" element={<Navigate to="/transactions?tab=vb" replace />} />
            <Route path="/vb/transactions" element={<Navigate to="/transactions?tab=vb" replace />} />
            <Route path="/vb/transactions/:orderId" element={<VBTransactionDetailPage />} />
            <Route path="/vb/settlement" element={<PlaceholderPage />} />
            <Route path="/vb/overview" element={<PlaceholderPage />} />

            {/* MERCHANT Routes */}
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/modules/listing" element={<ListingsPage />} />

            {/* FINANCE Routes */}
            <Route path="/finance/:moduleName" element={<PlaceholderPage />} />

            {/* REPORT Routes */}
            <Route path="/reports/weekly" element={<LaporanPerformaPage />} />
            <Route path="/reports/monthly" element={<PlaceholderPage />} />
            <Route path="/reports/analytics" element={<PlaceholderPage />} />
            <Route path="/reports/:moduleName" element={<PlaceholderPage />} />

            {/* TOOLS & DOCUMENTS Routes */}
            <Route path="/tools/:moduleName" element={<PlaceholderPage />} />
            <Route path="/documents/:moduleName" element={<PlaceholderPage />} />

            {/* OPERATIONS Routes */}
            <Route path="/operations/:moduleName" element={<PlaceholderPage />} />

            {/* SYSTEM & ADMINISTRATION Routes */}
            <Route path="/system/:moduleName" element={<PlaceholderPage />} />
            <Route path="/administration/:moduleName" element={<PlaceholderPage />} />
            <Route path="/exceptions" element={<Navigate to="/operations/exceptions" replace />} />
            <Route path="/analytics" element={<Navigate to="/reports/analytics" replace />} />

            {/* Legacy and Detailed Feature Pages */}
            <Route path="/rekap-tagihan-billing" element={<RekapBillingPage />} />
            <Route path="/rangkuman" element={<RangkumanPage />} />
            <Route path="/laporan-performa" element={<LaporanPerformaPage />} />
            <Route path="/performa-comparison" element={<PerformaComparisonPage />} />
            <Route path="/laporan-jam-ramai" element={<LaporanJamRamaiPage />} />
            <Route path="/order-sukses-vs-batal" element={<OrderStatusPage />} />
            <Route path="/modules/:moduleName" element={<PlaceholderPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
