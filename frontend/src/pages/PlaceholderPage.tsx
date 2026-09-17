import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Construction, ArrowLeft, Clock } from 'lucide-react';

const moduleMetadata: Record<string, { title: string; category: string; description: string }> = {
  // Core
  outlets: {
    title: 'Outlets Directory',
    category: 'CORE',
    description: 'Pemantauan status operasional, jam buka, dan rincian lokasi fisik seluruh outlet mitra.'
  },
  outlet: {
    title: 'Outlets Directory',
    category: 'CORE',
    description: 'Pemantauan status operasional, jam buka, dan rincian lokasi fisik seluruh outlet mitra.'
  },
  // Operations
  bot: {
    title: 'Bot Operations',
    category: 'OPERATIONS',
    description: 'Monitoring bot otomatisasi sinkronisasi pesanan, health status pipeline scraping, dan task queue.'
  },
  menu: {
    title: 'Central Menu Engineering',
    category: 'OPERATIONS',
    description: 'Analisis kontribusi margin per menu, optimasi COGS/HPP, dan standarisasi resep portofolio brand.'
  },
  promo: {
    title: 'Promotion & Campaign Analytics',
    category: 'OPERATIONS',
    description: 'Evaluasi efektivitas diskon platform delivery dan return on investment (ROI) program promosi.'
  },
  kks: {
    title: 'KKS Document Store',
    category: 'OPERATIONS',
    description: 'Penyimpanan digital Kontrak Kerja Sama (KKS) dan berkas legalitas kemitraan FoodMaster.'
  },
  'esign-proposal': {
    title: 'E-Sign & Proposal',
    category: 'OPERATIONS',
    description: 'Penyusunan dokumen proposal kemitraan bisnis dan integrasi tanda tangan digital tersertifikasi.'
  },
  proposal: {
    title: 'E-Sign & Proposal',
    category: 'OPERATIONS',
    description: 'Penyusunan dokumen proposal kemitraan bisnis dan integrasi tanda tangan digital tersertifikasi.'
  },
  // System
  'data-ingestion': {
    title: 'Data Ingestion Pipeline',
    category: 'SYSTEM',
    description: 'Sinkronisasi berkala data transaksi dari GoFood, GrabFood, ShopeeFood, dan POS ke basis data Elevate.'
  },
  credentials: {
    title: 'Credentials Vault',
    category: 'SYSTEM',
    description: 'Manajemen terenkripsi untuk akun merchant portal, token OAuth2, dan kunci API integrasi mitra.'
  },
  'users-roles': {
    title: 'Users & Roles Management',
    category: 'SYSTEM',
    description: 'Pengaturan otorisasi peran PIC, kontrol akses berbasis peran (RBAC), dan log izin tim internal.'
  },
  documents: {
    title: 'System Documents Repository',
    category: 'SYSTEM',
    description: 'Pusat penyimpanan arsip berkas faktur pajak, bukti transfer disbursement, dan dokumen kepatuhan.'
  },
  'activity-log': {
    title: 'System Activity Log',
    category: 'SYSTEM',
    description: 'Audit trail aktivitas operator, jejak rekonsiliasi keuangan, dan riwayat modifikasi data master.'
  },
  settings: {
    title: 'System Settings',
    category: 'SYSTEM',
    description: 'Konfigurasi global platform Elevate, pengaturan ambang batas peringatan anomali, dan preferensi akun.'
  }
};

export const PlaceholderPage: React.FC = () => {
  const { moduleName } = useParams<{ moduleName: string }>();
  const location = useLocation();

  const getLookupKey = (): string => {
    if (moduleName) return moduleName.toLowerCase();
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1]?.toLowerCase() || '';
  };

  const key = getLookupKey();
  const info = moduleMetadata[key] || {
    title: key ? key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Modul Elevate',
    category: 'GENERAL',
    description: 'Halaman fitur ini sedang dalam proses integrasi data dan pengembangan modul frontend.'
  };

  return (
    <DashboardLayout title={info.title} subtitle={`Kategori: ${info.category}`}>
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 flex flex-col items-center text-center max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mb-4 shadow-sm">
          <Construction className="w-7 h-7 stroke-[1.75]" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] mb-3">
          <Clock className="w-3.5 h-3.5" />
          Tahap Pengembangan (Coming Soon)
        </span>

        <h2 className="text-lg font-bold text-[#0F172A] mb-2">{info.title}</h2>
        <p className="text-sm text-[#64748B] leading-relaxed mb-6 max-w-md">
          {info.description} Integrasi data dan pipeline backend untuk modul ini dijadwalkan pada rilis pembaruan berikutnya.
        </p>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F172A]"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard Utama
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};
