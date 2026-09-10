import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ArrowLeft, Copy, Check, ShieldCheck, Info, AlertCircle } from 'lucide-react';
import {
  VB_TRANSACTIONS_BY_ORDER_ID,
  getPlatformLabel,
  formatPercent,
  type Platform,
  type OrderStatus,
} from '../data/vbTransactions';

function PlatformLogoLarge({ platform }: { platform: Platform }) {
  if (platform === 'gofood') {
    return (
      <div className="w-20 h-20 rounded-xl bg-[#E53935] flex flex-col items-center justify-center shrink-0" aria-label="GoFood">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path d="M18 8c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S23.52 8 18 8zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.175 7.175 0 01-6 3.22z" fill="white"/>
        </svg>
        <span className="text-white text-xs font-bold mt-1">GoFood</span>
      </div>
    );
  }
  if (platform === 'grabfood') {
    return (
      <div className="w-20 h-20 rounded-xl bg-[#00B14F] flex flex-col items-center justify-center shrink-0" aria-label="GrabFood">
        <div className="flex flex-col items-center leading-none">
          <span className="text-white font-black text-xl leading-tight">Grab</span>
          <span className="text-white font-black text-xl leading-tight">Food</span>
        </div>
      </div>
    );
  }
  return (
    <div className="w-20 h-20 rounded-xl bg-[#EE4D2D] flex flex-col items-center justify-center shrink-0" aria-label="ShopeeFood">
      <span className="text-white text-lg font-black">SF</span>
      <span className="text-white text-xs font-bold">ShopeeFood</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
      aria-label={copied ? 'Disalin' : `Salin ${label ?? text}`}
      title={copied ? 'Disalin!' : 'Salin'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === 'Sukses') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-[#DCFCE7] text-[#166534]">
        Sukses
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-[#FEE2E2] text-[#991B1B]">
      Batal
    </span>
  );
}

interface FinancialRowProps {
  label: string;
  description: string;
  value: number;
  isNegative?: boolean;
  isSubTotal?: boolean;
}

function FinancialRow({ label, description, value, isNegative, isSubTotal }: FinancialRowProps) {
  if (isSubTotal) {
    return (
      <tr className="bg-[#F0FDF4]">
        <td className="px-4 py-3.5 text-sm font-bold text-[#16A34A]">{label}</td>
        <td className="px-4 py-3.5 text-sm text-[#16A34A]">{description}</td>
        <td className="px-4 py-3.5 text-right text-sm font-bold text-[#16A34A]">{value.toLocaleString('id-ID')}</td>
      </tr>
    );
  }
  if (isNegative) {
    return (
      <tr className="border-b border-gray-50">
        <td className="px-4 py-3 text-sm text-gray-700">{label}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{description}</td>
        <td className="px-4 py-3 text-right text-sm text-[#E53935] font-medium">
          {value === 0 ? '- 0' : `- ${value.toLocaleString('id-ID')}`}
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{label}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{description}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-800 font-medium">{value.toLocaleString('id-ID')}</td>
    </tr>
  );
}

interface RatioCardProps {
  label: string;
  value: string;
  isPositive?: boolean;
  isWarning?: boolean;
}

function RatioCard({ label, value, isPositive, isWarning }: RatioCardProps) {
  const color = isWarning ? 'text-[#EA580C]' : isPositive ? 'text-[#16A34A]' : 'text-gray-700';
  return (
    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 leading-snug">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export const VBTransactionDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const transaction = orderId ? VB_TRANSACTIONS_BY_ORDER_ID.get(orderId) : undefined;

  if (!transaction) {
    return (
      <DashboardLayout title="Detail Transaction - VB">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-gray-500 text-sm mb-1">Order tidak ditemukan.</p>
            <p className="text-gray-400 text-xs mb-4">
              Order ID <span className="font-mono">{orderId}</span> tidak ada dalam sistem.
            </p>
            <button
              onClick={() => navigate('/transactions?tab=vb')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#EFF6FF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Daftar VB Transactions
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isBatal = transaction.status === 'Batal';
  const platformLabel = getPlatformLabel(transaction.platform);

  return (
    <DashboardLayout title="Detail Transaction - VB">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <button onClick={() => navigate('/dashboard')} className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded">
              Home
            </button>
            <span>/</span>
            <button onClick={() => navigate('/transactions')} className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded">
              Transactions
            </button>
            <span>/</span>
            <button onClick={() => navigate('/transactions?tab=vb')} className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded">
              VB Transactions
            </button>
            <span>/</span>
            <span className="text-gray-800 font-medium">Detail Transaction</span>
          </nav>

          {/* Page header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detail Transaction - VB</h1>
              <p className="mt-1 text-sm text-gray-500">Informasi lengkap transaksi order untuk Virtual Brand.</p>
            </div>
            <button
              onClick={() => navigate('/transactions?tab=vb')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Daftar VB Transactions
            </button>
          </div>

          {/* Alert bar (Batal only) */}
          {isBatal && (
            <div className="flex items-center justify-between gap-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-5 py-4 mb-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#E53935] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#991B1B]">Order Batal</p>
                  <p className="text-sm text-[#B91C1C]">
                    Order ini dibatalkan sebelum dinyatakan sukses di platform. Nilai berikut mengikuti data yang tercatat di sumber.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border border-[#E53935] text-[#E53935] bg-white shrink-0">
                Batal / Cancelled
              </span>
            </div>
          )}

          {/* Order info header card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
            <div className="flex items-start gap-5">
              <PlatformLogoLarge platform={transaction.platform} />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-4">
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Platform</p>
                  <p className="text-sm font-semibold text-gray-800">{platformLabel}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Order ID</p>
                  <div className="flex items-center">
                    <p className="text-sm font-semibold text-gray-800 font-mono">{transaction.orderId}</p>
                    <CopyButton text={transaction.orderId} label="Order ID" />
                  </div>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Date &amp; Time</p>
                  <p className="text-sm font-semibold text-gray-800">{transaction.dateTime}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Order Status</p>
                  <StatusBadge status={transaction.status} />
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">VB</p>
                  <p className="text-sm font-semibold text-gray-800">{transaction.vb}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Physical Outlet</p>
                  <p className="text-sm font-semibold text-gray-800">{transaction.physicalOutlet.replace(' - ', ' \u2013 ')}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Platform Listing / SID</p>
                  <p className="text-sm font-semibold text-gray-800">{transaction.platformListing}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">MID: {transaction.mid}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Klikit Brand Name</p>
                  <p className="text-sm font-semibold text-gray-800">{transaction.klikiitBrandName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Body: 7:5 grid */}
          <div className="grid grid-cols-12 gap-5">
            {/* Left column */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">

              {/* Card: Ringkasan Transaksi & Biaya */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="#6B7280" strokeWidth="1.5"/>
                      <path d="M1 6h14" stroke="#6B7280" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Ringkasan Transaksi &amp; Biaya</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-52">Komponen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Keterangan</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-32">Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FinancialRow
                      label="Order Value / Amount"
                      description="Nilai order yang dibayar customer"
                      value={transaction.orderValue}
                    />
                    <FinancialRow
                      label="Net Sales"
                      description="Nilai bersih yang diterima merchant setelah potongan"
                      value={transaction.netSales}
                    />
                    <FinancialRow
                      label="OFD Fees"
                      description="Biaya layanan platform (termasuk komisi, promo, dll)"
                      value={transaction.ofdFees}
                      isNegative
                    />
                    <FinancialRow
                      label="Revenue (Total)"
                      description="Nilai akhir yang diterima merchant dari platform"
                      value={transaction.revenue}
                      isSubTotal
                    />
                    <FinancialRow
                      label="COGS"
                      description="Biaya produk (HPP) yang menjadi hak merchant"
                      value={transaction.cogs}
                      isNegative
                    />
                    <FinancialRow
                      label="Gross Margin"
                      description="Keuntungan kotor sebelum biaya iklan"
                      value={transaction.grossMargin}
                    />
                    <FinancialRow
                      label="Ads Cost Pro-rated"
                      description="Estimasi biaya iklan yang dialokasikan ke order ini"
                      value={transaction.adsCostProrated}
                      isNegative
                    />
                    <FinancialRow
                      label="GM After Ads"
                      description="Gross Margin setelah dikurangi biaya iklan"
                      value={transaction.gmAfterAds}
                      isSubTotal
                    />
                  </tbody>
                </table>

                {/* Batal info bar */}
                {isBatal && (
                  <div className="flex items-center gap-2 px-5 py-3 bg-[#EFF6FF] border-t border-[#BFDBFE]">
                    <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <p className="text-xs text-[#1D4ED8]">
                      Nilai di atas mengikuti data dari sumber. Order batal tidak termasuk dalam perhitungan settlement dan receivable.
                    </p>
                  </div>
                )}
              </div>

              {/* Card: Rasio & Performa */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 12l3-3 3 3 3-4 3 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Rasio &amp; Performa</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <RatioCard
                    label="GM vs Amount"
                    value={formatPercent(transaction.grossMargin, transaction.orderValue)}
                    isPositive
                  />
                  <RatioCard
                    label="GM vs Net Sales"
                    value={formatPercent(transaction.grossMargin, transaction.netSales)}
                    isPositive
                  />
                  <RatioCard
                    label="GM vs Revenue"
                    value={formatPercent(transaction.grossMargin, transaction.revenue)}
                    isPositive
                  />
                  <RatioCard
                    label="GM After Ads vs Revenue"
                    value={formatPercent(transaction.gmAfterAds, transaction.revenue)}
                    isPositive
                  />
                  <RatioCard
                    label="OFD Fees vs Amount"
                    value={formatPercent(transaction.ofdFees, transaction.orderValue)}
                    isWarning
                  />
                  <RatioCard
                    label="OFD Fees vs Net Sales"
                    value={formatPercent(transaction.ofdFees, transaction.netSales)}
                    isWarning
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">

              {/* Card: Informasi Tambahan */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="12" height="12" rx="2" stroke="#6B7280" strokeWidth="1.5"/>
                      <path d="M5 6h6M5 9h4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Informasi Tambahan</h2>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Merchant ID</p>
                    <div className="flex items-center">
                      <p className="text-sm font-semibold text-gray-800 font-mono">{transaction.merchantId}</p>
                      <CopyButton text={transaction.merchantId} label="Merchant ID" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Store Name</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.storeName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Transfer ID</p>
                    <div className="flex items-center">
                      <p className="text-sm font-semibold text-gray-800 font-mono break-all">{transaction.transferId}</p>
                      <CopyButton text={transaction.transferId} label="Transfer ID" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Settlement ID</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-gray-800 font-mono">{transaction.settlementId}</p>
                      {!isBatal && <CopyButton text={transaction.settlementId} label="Settlement ID" />}
                      {isBatal && (
                        <span className="text-xs text-gray-400 ml-1">(Tidak ada karena order batal)</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">COGS Detector</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
                      {transaction.cogsDetector}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Moved at</p>
                    <p className="text-sm text-gray-700">{transaction.movedAt}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Catatan</p>
                    <p className="text-sm text-gray-700">{transaction.catatan}</p>
                  </div>
                </div>
              </div>

              {/* Card: Audit & Sumber Data */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-gray-500" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Audit &amp; Sumber Data</h2>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Data Source</p>
                    <p className="text-sm font-semibold text-gray-800">VB Order Log (4. Trx - tab pertama)</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ingested At</p>
                    <p className="text-sm text-gray-700">{transaction.ingestedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ingested By</p>
                    <p className="text-sm text-gray-700">{transaction.ingestedBy}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Last Updated</p>
                    <p className="text-sm text-gray-700">{transaction.lastUpdated}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VBTransactionDetailPage;
