import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { OutletDetailPage } from './pages/OutletDetailPage';
import { TransactionExplorerPage } from './pages/TransactionExplorerPage';


export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Core Navigation Routes matching Elevate2 Owner mockup */}
        <Route path="/owners" element={<OwnersPage />} />
        <Route path="/owners/:id" element={<OwnerDetailPage />} />
        <Route path="/modules/owner" element={<OwnersPage />} />
        <Route path="/outlets" element={<PlaceholderPage />} />
        <Route path="/outlets/:id" element={<OutletDetailPage />} />
        <Route path="/transactions" element={<TransactionExplorerPage />} />
        <Route path="/transactions/:orderId" element={<PlaceholderPage />} />
        <Route path="/settlement" element={<PerformaComparisonPage />} />
        <Route path="/reports" element={<LaporanPerformaPage />} />
        <Route path="/payments" element={<RekapBillingPage />} />

        {/* OPERATIONS Routes */}
        <Route path="/operations/:moduleName" element={<PlaceholderPage />} />

        {/* SYSTEM Routes */}
        <Route path="/system/:moduleName" element={<PlaceholderPage />} />

        {/* Legacy and Detailed Feature Pages */}
        <Route path="/rekap-tagihan-billing" element={<RekapBillingPage />} />
        <Route path="/rangkuman" element={<RangkumanPage />} />
        <Route path="/laporan-performa" element={<LaporanPerformaPage />} />
        <Route path="/performa-comparison" element={<PerformaComparisonPage />} />
        <Route path="/laporan-jam-ramai" element={<LaporanJamRamaiPage />} />
        <Route path="/order-sukses-vs-batal" element={<OrderStatusPage />} />
        <Route path="/modules/:moduleName" element={<PlaceholderPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
