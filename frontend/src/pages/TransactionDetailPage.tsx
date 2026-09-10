import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ArrowLeft, Copy, Check, ShieldCheck, Info } from 'lucide-react';
import {
  TRANSACTIONS_BY_ORDER_ID,
  getPlatformLabel,
  getDataSource,
  formatRupiah,
  type Platform,
  type OrderStatus,
} from '../data/transactions';

function PlatformLogoLarge({ platform }: { platform: Platform }) {
  if (platform === 'gofood') {
    return (
      <div className="w-20 h-20 rounded-xl bg-[#E53935] flex flex-col items-center justify-center shrink-0" aria-label="GoFood">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle cx="18" cy="18" r="18" fill="#E53935" />
          <path d="M18 8c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S23.52 8 18 8zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.175 7.175 0 01-6 3.22z" fill="white"/>
        </svg>
        <span className="text-white text-xs font-bold mt-1">GoFood</span>
      </div>
    );
  }
  if (platform === 'grabfood') {
    return (
      <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center shrink-0" aria-label="GrabFood">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[#00B14F] font-black text-lg leading-tight">Grab</span>
          <span className="text-[#00B14F] font-black text-lg leading-tight">Food</span>
        </div>
      </div>
    );
  }
  return (
    <div className="w-20 h-20 rounded-xl bg-[#EE4D2D] flex flex-col items-center justify-center shrink-0" aria-label="ShopeeFood">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z" fill="#EE4D2D"/>
        <path d="M20.5 11h-9a.5.5 0 00-.5.5v1a.5.5 0 00.5.5H20.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5zM20 14H12l-1 7h10l-1-7z" fill="white"/>
      </svg>
      <span className="text-white text-xs font-bold mt-1">ShopeeFood</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
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
      aria-label={copied ? 'Disalin' : `Salin ${text}`}
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
  isTotal?: boolean;
  status?: OrderStatus;
}

function FinancialRow({ label, description, value, isNegative, isTotal, status }: FinancialRowProps) {
  const isBatal = status === 'Batal';

  if (isTotal) {
    return (
      <tr className={isBatal ? 'bg-[#FFF5F5]' : 'bg-[#F0FDF4]'}>
        <td className={`px-4 py-3.5 font-bold text-sm ${isBatal ? 'text-[#E53935]' : 'text-[#16A34A]'}`}>{label}</td>
        <td className={`px-4 py-3.5 text-sm ${isBatal ? 'text-[#E53935]' : 'text-[#16A34A]'}`}>{description}</td>
        <td className={`px-4 py-3.5 text-right font-bold text-sm ${isBatal ? 'text-[#E53935]' : 'text-[#16A34A]'}`}>
          {formatRupiah(value)}
        </td>
      </tr>
    );
  }

  if (isNegative) {
    return (
      <tr className="border-b border-gray-50">
        <td className="px-4 py-3 text-sm text-gray-700">{label}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{description}</td>
        <td className="px-4 py-3 text-right text-sm text-[#E53935] font-medium">
          {value === 0 ? `- ${formatRupiah(0)}` : `- ${formatRupiah(value)}`}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{label}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{description}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-800 font-medium">{formatRupiah(value)}</td>
    </tr>
  );
}

export const TransactionDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const transaction = orderId ? TRANSACTIONS_BY_ORDER_ID.get(orderId) : undefined;

  if (!transaction) {
    return (
      <DashboardLayout title="Detail Transaksi">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-gray-500 text-sm mb-1">Order tidak ditemukan.</p>
            <p className="text-gray-400 text-xs mb-4">Order ID <span className="font-mono">{orderId}</span> tidak ada dalam sistem.</p>
            <button
              onClick={() => navigate('/transactions')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#EFF6FF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Transaction Explorer
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isSukses = transaction.status === 'Sukses';
  const platformLabel = getPlatformLabel(transaction.platform);
  const dataSource = getDataSource(transaction.platform);

  const netSales = transaction.netSales ?? transaction.orderValue;
  const marketingFee = transaction.marketingSuccessFee ?? 0;
  const commission = transaction.orderCommission ?? 0;
  const ofdFees = transaction.ofdFees ?? 0;

  return (
    <DashboardLayout title="Detail Transaksi Agency">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <button
              onClick={() => navigate('/transactions')}
              className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              Transactions
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/transactions')}
              className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              Transaction Explorer
            </button>
            <span>/</span>
            <span className="text-gray-800 font-medium">Detail Transaksi Agency</span>
          </nav>

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detail Transaksi Agency</h1>
              <p className="mt-1 text-sm text-gray-500">Informasi detail order pada platform delivery.</p>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          </div>

          {/* Body grid: 7:5 split */}
          <div className="grid grid-cols-12 gap-5">
            {/* Left column */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">

              {/* Card: Order & Outlet Information */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-gray-500" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Order &amp; Outlet Information</h2>
                </div>

                {/* Top row: platform + core order fields */}
                <div className="flex items-start gap-5 pb-5 border-b border-gray-100">
                  <PlatformLogoLarge platform={transaction.platform} />
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Platform</p>
                      <p className="text-sm font-semibold text-gray-800">{platformLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Order ID</p>
                      <div className="flex items-center">
                        <p className="text-sm font-semibold text-gray-800 font-mono">{transaction.orderId}</p>
                        <CopyButton text={transaction.orderId} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Date &amp; Time</p>
                      <p className="text-sm font-semibold text-gray-800 whitespace-pre-line">{transaction.dateTime.replace(' ', '\n')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Order Status</p>
                      <StatusBadge status={transaction.status} />
                    </div>
                  </div>
                </div>

                {/* Bottom row: owner + outlet + listing + SID */}
                <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Owner</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Physical Outlet</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.physicalOutlet.replace(' - ', ' \u2014 ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Platform Listing</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.platformListing}</p>
                    <p className="text-xs text-[#2563EB] font-mono mt-0.5">{transaction.sid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">SID / Store ID</p>
                    <div className="flex items-center">
                      <p className="text-sm font-semibold text-gray-800 font-mono">{transaction.sid}</p>
                      <CopyButton text={transaction.sid} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Transaction Financial */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="#6B7280" strokeWidth="1.5"/>
                      <path d="M1 6h14" stroke="#6B7280" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Transaction Financial</h2>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-48">Komponen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Keterangan</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-32">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FinancialRow
                      label="Order Value / Amount"
                      description="Total nilai order yang dibayarkan customer"
                      value={transaction.orderValue}
                    />
                    <FinancialRow
                      label="Net Sales"
                      description="Nilai bersih yang diterima merchant (setelah potongan komisi platform)"
                      value={netSales}
                    />
                    <FinancialRow
                      label="Marketing Success Fee"
                      description="Biaya promosi yang dibayar oleh platform (jika ada)"
                      value={marketingFee}
                    />
                    <FinancialRow
                      label="Order Commission"
                      description="Komisi platform atas order ini"
                      value={commission}
                      isNegative
                    />
                    <FinancialRow
                      label="OFD Fees"
                      description="Biaya lain dari platform (biaya layanan, biaya aplikasi, dll)"
                      value={ofdFees}
                      isNegative
                    />
                    <FinancialRow
                      label="Total"
                      description={`Total nilai order pada platform (Net Amount di ${platformLabel})`}
                      value={netSales}
                      isTotal
                      status={transaction.status}
                    />
                  </tbody>
                </table>

                {/* Batal info bar */}
                {!isSukses && (
                  <div className="flex items-center gap-2 px-5 py-3 bg-[#EFF6FF] border-t border-[#BFDBFE]">
                    <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <p className="text-xs text-[#1D4ED8]">
                      Order batal tidak termasuk dalam perhitungan Agency Receivable.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">

              {/* Card: FoodMaster Agency */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSukses ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <circle cx="9" cy="9" r="8" stroke={isSukses ? '#16A34A' : '#DC2626'} strokeWidth="1.5"/>
                      <path d="M9 5v4l2.5 2.5" stroke={isSukses ? '#16A34A' : '#DC2626'} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">FoodMaster Agency</h2>
                </div>

                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 mb-2">Agency Fee (FoodMaster)</p>
                  <p className={`text-3xl font-bold ${isSukses ? 'text-[#16A34A]' : 'text-[#E53935]'}`}>
                    {formatRupiah(transaction.agencyFee)}
                  </p>
                  <div className="mt-3">
                    {isSukses ? (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-[#DCFCE7] text-[#166534]">
                        Earned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border border-[#E53935] text-[#E53935] bg-white">
                        Lost due to Cancellation
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Rate</p>
                    <p className="text-sm text-gray-700 font-medium">{formatRupiah(transaction.agencyFee)} / order</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Keterangan</p>
                    <p className="text-sm text-gray-600">
                      {isSukses
                        ? 'Fee berhasil diperoleh dari order sukses.'
                        : 'Order batal sebelum dinyatakan sukses di platform. Agency fee tidak diakui sebagai receivable.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card: Source / Audit */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-gray-500" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-800">Source / Audit</h2>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Data Source</p>
                    <p className="text-sm font-semibold text-gray-800">{dataSource}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ingested At</p>
                    <p className="text-sm text-gray-700">{transaction.ingestedAt ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ingested By</p>
                    <p className="text-sm text-gray-700">{transaction.ingestedBy ?? 'System'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Last Updated</p>
                    <p className="text-sm text-gray-700">{transaction.lastUpdated ?? '-'}</p>
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

export default TransactionDetailPage;

