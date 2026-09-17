import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ArrowLeft,
  Layers,
  Building2,
  Store,
  Users,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  ShoppingBag
} from 'lucide-react';
import {
  type ListingRecord,
  type PlatformType,
  type ListingStatus,
  parseDBRToListings
} from '../data/listings';
import { MOCK_TRANSACTIONS, formatRupiah } from '../data/transactions';

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv';

function PlatformBadge({ platform }: { platform: PlatformType }) {
  if (platform === 'GoFood') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
        GoFood
      </span>
    );
  }
  if (platform === 'GrabFood') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
        GrabFood
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
      ShopeeFood
    </span>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  if (status === 'Live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
        <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
        Live
      </span>
    );
  }
  if (status === 'Need Review') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
        <span className="w-2 h-2 rounded-full bg-[#D97706]" />
        Need Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      Inactive
    </span>
  );
}

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [rawDBRText, setRawDBRText] = useState<string>(() => {
    return localStorage.getItem('elevate_dbr_raw_csv') || '';
  });

  const [cachedOwners] = useState<any[]>(() => {
    const raw = localStorage.getItem('elevate_owners_real_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  });

  const handleFetchRealData = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      setRawDBRText(csvText);
      localStorage.setItem('elevate_dbr_raw_csv', csvText);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheets DBR';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!rawDBRText) {
      handleFetchRealData();
    }
  }, [handleFetchRealData, rawDBRText]);

  const allListings = useMemo(() => {
    if (!rawDBRText) return [];
    return parseDBRToListings(rawDBRText, cachedOwners);
  }, [rawDBRText, cachedOwners]);

  const listing: ListingRecord | null = useMemo(() => {
    if (!id || allListings.length === 0) return null;
    const match = allListings.find((l) => l.id === id || l.storeId === id);
    if (match) return match;
    return allListings[0] || null;
  }, [id, allListings]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const listingTransactions = useMemo(() => {
    if (!listing) return [];
    const sid = (listing.storeId || '').trim().toLowerCase();
    const listingName = (listing.namaListing || '').trim().toLowerCase();
    const outletName = (listing.outlet || '').trim().toLowerCase();
    const platform = listing.aplikator.toLowerCase();

    return MOCK_TRANSACTIONS.filter((t) => {
      const matchSid = sid && sid !== '-' && t.sid.toLowerCase() === sid;
      const matchName = listingName && (
        t.platformListing.toLowerCase().includes(listingName) ||
        listingName.includes(t.platformListing.toLowerCase())
      );
      const matchOutlet = outletName && (
        t.physicalOutlet.toLowerCase().includes(outletName) ||
        outletName.includes(t.physicalOutlet.toLowerCase())
      ) && t.platform === platform;
      return matchSid || matchName || matchOutlet;
    });
  }, [listing]);

  const salesStats = useMemo(() => {
    const sukses = listingTransactions.filter((t) => t.status === 'Sukses');
    const batal = listingTransactions.filter((t) => t.status === 'Batal');
    const grossSales = sukses.reduce((acc, t) => acc + t.orderValue, 0);
    const netPayout = sukses.reduce(
      (acc, t) => acc + (t.netSales ?? (t.orderValue - (t.orderCommission ?? 0))),
      0
    );
    const totalAgencyFee = sukses.reduce((acc, t) => acc + (t.agencyFee || 0), 0);
    const aov = sukses.length > 0 ? Math.round(grossSales / sukses.length) : 0;
    const successRate =
      listingTransactions.length > 0
        ? Math.round((sukses.length / listingTransactions.length) * 100)
        : 0;

    return {
      totalOrders: listingTransactions.length,
      suksesCount: sukses.length,
      batalCount: batal.length,
      grossSales,
      netPayout,
      totalAgencyFee,
      aov,
      successRate,
    };
  }, [listingTransactions]);

  if (!listing) {
    return (
      <DashboardLayout title="Detail Listing">
        <div className="p-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Memuat Detail Listing...</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sedang menghubungkan data dengan Google Sheets DBR.
            </p>
            <button
              onClick={() => navigate('/listings')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Listing</span>
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const topBarActions = (
    <div className="flex items-center gap-2.5">
      {fetchError && (
        <span className="text-xs text-[#DC2626] font-medium hidden sm:inline-flex items-center gap-1 bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FEE2E2]">
          <AlertCircle className="w-3.5 h-3.5" />
          {fetchError}
        </span>
      )}
      <button
        onClick={handleFetchRealData}
        disabled={isFetching}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        <span>{isFetching ? 'Sinkronisasi...' : 'Tarik Data DBR'}</span>
      </button>
      {listing.link && listing.link !== '#' && (
        <a
          href={listing.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
        >
          <span>Buka di Aplikator</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
        </a>
      )}
    </div>
  );

  return (
    <DashboardLayout title={`Listing: ${listing.namaListing}`} actions={topBarActions}>
      <div className="p-8 max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/dashboard" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/listings" className="hover:text-gray-900 transition-colors">
            Listings
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-sm">{listing.namaListing}</span>
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                <Layers className="w-7 h-7 text-[#2563EB]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl font-bold text-gray-900">{listing.namaListing}</h1>
                  <PlatformBadge platform={listing.aplikator} />
                  <StatusBadge status={listing.statusListing} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Cabang:{' '}
                      <Link
                        to={`/outlets/${listing.outletId}`}
                        className="font-semibold text-gray-900 hover:text-[#2563EB] hover:underline"
                        title="Buka detail outlet"
                      >
                        {listing.outlet}
                      </Link>
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Brand:{' '}
                      <Link
                        to={`/brands/${listing.brandId}`}
                        className="font-semibold text-gray-900 hover:text-[#2563EB] hover:underline"
                        title="Buka detail brand"
                      >
                        {listing.namaBrand}
                      </Link>
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Owner:{' '}
                      <Link
                        to={`/owners/${listing.ownerId}`}
                        className="font-semibold text-gray-900 hover:text-[#2563EB] hover:underline"
                        title="Buka detail owner"
                      >
                        {listing.namaPemilik}
                      </Link>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => navigate('/listings')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Semua Listing</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Store ID Aplikator</span>
              <button
                onClick={() => copyToClipboard(listing.storeId, 'storeId')}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                title="Salin Store ID"
              >
                {copiedField === 'storeId' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-xl font-bold text-gray-900">{listing.storeId}</p>
            <p className="text-xs text-gray-400 mt-1">Platform: {listing.aplikator}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Group ID Merchant</span>
              <button
                onClick={() => copyToClipboard(listing.groupId, 'groupId')}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                title="Salin Group ID"
              >
                {copiedField === 'groupId' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-xl font-bold text-gray-900">{listing.groupId || '-'}</p>
            <p className="text-xs text-gray-400 mt-1">Merchant portal group</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <span className="text-xs font-medium text-gray-500 block mb-2">Rekening Pencairan</span>
            <p className="text-lg font-bold text-gray-900 truncate">{listing.namaBank}</p>
            <p className="font-mono text-xs text-gray-600 mt-0.5">{listing.nomorRekening}</p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{listing.namaPemilikRekening}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <span className="text-xs font-medium text-gray-500 block mb-2">Tarif Agency Fee</span>
            <p className="text-2xl font-bold text-[#2563EB]">Rp {listing.tarif.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400 mt-1">per pesanan selesai</p>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Config & Hierarchy */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performa Penjualan & Transaksi Listing */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    <span>Performa Penjualan & Riwayat Pesanan</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Metrik omzet dan daftar transaksi masuk untuk listing {listing.namaListing}.
                  </p>
                </div>
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-lg transition-colors shrink-0 self-start sm:self-auto"
                >
                  <span>Transaction Explorer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 Mini KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <span className="text-[11px] font-medium text-gray-500 block mb-1">Gross Sales</span>
                  <p className="text-base font-bold text-gray-900">
                    {formatRupiah(salesStats.grossSales)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {salesStats.suksesCount} pesanan selesai
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <span className="text-[11px] font-medium text-gray-500 block mb-1">Net Payout</span>
                  <p className="text-base font-bold text-[#059669]">
                    {formatRupiah(salesStats.netPayout)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Setelah komisi platform
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <span className="text-[11px] font-medium text-gray-500 block mb-1">Agency Fee</span>
                  <p className="text-base font-bold text-[#2563EB]">
                    {formatRupiah(salesStats.totalAgencyFee)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Tarif {formatRupiah(listing.tarif)} / order
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <span className="text-[11px] font-medium text-gray-500 block mb-1">Tingkat Sukses</span>
                  <p className="text-base font-bold text-gray-900">
                    {salesStats.totalOrders > 0 ? `${salesStats.successRate}%` : '0%'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {salesStats.batalCount} transaksi dibatalkan
                  </p>
                </div>
              </div>

              {/* Tabel Transaksi Terkini / Empty State */}
              {listingTransactions.length > 0 ? (
                <div>
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Nilai Bruto</th>
                          <th className="py-2.5 px-3 text-right">Agency Fee</th>
                          <th className="py-2.5 px-3 text-right">Net Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {listingTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                              {t.orderId}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                              {t.dateTime}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  t.status === 'Sukses'
                                    ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                                    : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                              {formatRupiah(t.orderValue)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-500 font-mono">
                              {formatRupiah(t.agencyFee)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                              {formatRupiah(
                                t.netSales ?? (t.orderValue - (t.orderCommission ?? 0))
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>Menampilkan {listingTransactions.length} transaksi terkait listing ini</span>
                    <Link
                      to="/transactions"
                      className="text-[#2563EB] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Lihat Semua di Explorer</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-dashed border-gray-200 text-center bg-gray-50/50">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-800">
                    Belum Ada Data Transaksi
                  </p>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto mt-1 mb-3">
                    Store ID {listing.storeId} belum memiliki catatan transaksi di siklus aktif. Transaksi akan terisi otomatis saat laporan omzet harian ditarik.
                  </p>
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
                  >
                    <span>Cari di Transaction Explorer</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </Link>
                </div>
              )}
            </div>

            {/* Konfigurasi Identitas Toko & Integrasi Aplikator */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2563EB]" />
                <span>Identitas Toko & URL Aplikator</span>
              </h2>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Nama Listing Aplikator</span>
                  <span className="sm:col-span-2 font-semibold text-gray-900">{listing.namaListing}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Platform Aplikator</span>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <PlatformBadge platform={listing.aplikator} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Store ID</span>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900">{listing.storeId}</span>
                    <button
                      onClick={() => copyToClipboard(listing.storeId, 'storeId_val')}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="Salin Store ID"
                    >
                      {copiedField === 'storeId_val' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Group ID</span>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <span className="font-mono font-medium text-gray-900">{listing.groupId || '-'}</span>
                    {listing.groupId && listing.groupId !== '-' && (
                      <button
                        onClick={() => copyToClipboard(listing.groupId, 'groupId_val')}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="Salin Group ID"
                      >
                        {copiedField === 'groupId_val' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Link Aplikator</span>
                  <div className="sm:col-span-2">
                    {listing.link && listing.link !== '#' ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={listing.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#2563EB] hover:underline truncate max-w-md inline-flex items-center gap-1.5"
                        >
                          <span className="truncate">{listing.link}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(listing.link, 'link_val')}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded shrink-0"
                          title="Salin Link"
                        >
                          {copiedField === 'link_val' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Belum terdata di DBR</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                  <span className="text-gray-500 font-medium">Alamat Cabang</span>
                  <span className="sm:col-span-2 text-gray-800">{listing.alamat || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial & Audit Status */}
          <div className="space-y-6">
            {/* Rekening Bank Penampung */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                <span>Rekening Pencairan Bank</span>
              </h2>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 mb-4">
                <span className="text-xs text-gray-400 font-medium block mb-1">Bank Mitra</span>
                <p className="text-base font-bold text-gray-900">{listing.namaBank}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60">
                  <span className="font-mono text-sm font-semibold text-gray-800">{listing.nomorRekening}</span>
                  <button
                    onClick={() => copyToClipboard(listing.nomorRekening, 'no_rek')}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Salin Nomor Rekening"
                  >
                    {copiedField === 'no_rek' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-xs text-gray-500 mt-1 block">a.n. {listing.namaPemilikRekening}</span>
              </div>

              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span>Biaya Agency per Order:</span>
                  <span className="font-bold text-gray-900">Rp {listing.tarif.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Siklus Penagihan:</span>
                  <span className="font-semibold text-gray-700">Mingguan (Weekly)</span>
                </div>
              </div>
            </div>

            {/* Audit Status Sinkronisasi DBR */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>Audit Status DBR</span>
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Terdaftar di Database DBR</p>
                    <p className="text-[11px] text-gray-500">Record listing terintegrasi secara sah dalam file master operasional.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50">
                  {listing.statusListing === 'Live' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Status Operasional Aplikator</p>
                    <p className="text-[11px] text-gray-500">
                      Status listing: <strong>{listing.statusListing}</strong> (Internal: {listing.statusInternal})
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50">
                  {listing.storeId && listing.storeId !== '-' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Store ID Terpetakan</p>
                    <p className="text-[11px] text-gray-500">
                      {listing.storeId !== '-' ? 'ID toko unik berhasil terverifikasi.' : 'Store ID belum diisi di DBR.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50">
                  {listing.nomorRekening && listing.nomorRekening !== '-' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Rekening Bank Pencairan</p>
                    <p className="text-[11px] text-gray-500">
                      {listing.nomorRekening !== '-' ? 'Nomor rekening valid terdata.' : 'Rekening belum terkonfigurasi.'}
                    </p>
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
