import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api, type PerformaDataRow } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const LaporanPerformaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramStart = searchParams.get('start_date');
  const paramEnd = searchParams.get('end_date');
  const paramTipe = searchParams.get('tipe_laporan');

  const [tipeLaporan, setTipeLaporan] = useState<'Bulanan' | 'Mingguan' | 'Harian'>(
    (paramTipe as any) || 'Bulanan'
  );
  const [owners, setOwners] = useState<string[]>([]);
  const [outlets, setOutlets] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(paramStart || '2026-04-01');
  const [endDate, setEndDate] = useState<string>(paramEnd || '2026-06-30');

  const [data, setData] = useState<PerformaDataRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(true);
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'orders'>('revenue');

  const [rankings, setRankings] = useState<any[]>([]);
  const [wowData, setWowData] = useState<any[]>([]);
  const [baselineData, setBaselineData] = useState<any[]>([]);

  const formatIDR = (val: number) => `Rp ${Math.round(Number(val || 0)).toLocaleString('id-ID')}`;

  const formatYAxisCurrency = (val: number) => {
    if (val === 0) return 'Rp 0';
    if (Math.abs(val) >= 1e9) return `Rp ${(val / 1e9).toFixed(1)} M`;
    if (Math.abs(val) >= 1e6) return `Rp ${(val / 1e6).toFixed(0)} Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const loadFilters = useCallback(async () => {
    try {
      const res = await api.getFilters();
      if (res.owners) setOwners(res.owners);
      if (res.outlets) setOutlets(res.outlets);
      if (res.brands) setBrands(res.brands);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [rankRes, wowRes, baseRes] = await Promise.all([
        api.getOrderRanking({ start_date: startDate, end_date: endDate, limit: '10' }),
        api.getWeekOverWeek(),
        api.getBaselineVsCurrent()
      ]);
      if (rankRes?.data) setRankings(rankRes.data);
      if (wowRes?.data) setWowData(wowRes.data);
      if (baseRes?.data) setBaselineData(baseRes.data);
    } catch (err) {
      console.error('Error loading matview analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [startDate, endDate]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        tipe_laporan: tipeLaporan,
        owner: selectedOwner,
        outlet: selectedOutlet,
        brand: selectedBrand,
        start_date: startDate,
        end_date: endDate
      };
      const res = await api.getLaporanPerforma(params);
      if (res.status === 'success') setData(res.data || []);
    } catch (err) {
      console.error('Error loading performa data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tipeLaporan, selectedOwner, selectedOutlet, selectedBrand, startDate, endDate]);

  useEffect(() => {
    loadFilters();
    loadAnalytics();
  }, [loadFilters, loadAnalytics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartRows = data.filter(r => r.periode_label !== 'Grand Total');

  return (
    <DashboardLayout
      title="Laporan Performa & Analitik Growth"
      subtitle="Analisis tren keuangan, order ranking, perbandingan Week-over-Week (WoW), dan Baseline Growth"
    >
      {/* Filter Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Tipe Laporan
            </label>
            <select
              value={tipeLaporan}
              onChange={(e: any) => setTipeLaporan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Bulanan">Bulanan</option>
              <option value="Mingguan">Mingguan</option>
              <option value="Harian">Harian</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Filter Owner
            </label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Owner</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Filter Outlet
            </label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Outlet</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Filter Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Brand</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Hingga Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* MatView Section 1: Order Ranking & Week-over-Week Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Order Ranking */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Peringkat Volume Pesanan</h2>
                <p className="text-xs text-slate-500">10 outlet dengan pesanan tertinggi pada periode aktif</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                Top Performers
              </span>
            </div>

            {isLoadingAnalytics ? (
              <div className="py-12 flex justify-center items-center text-xs text-slate-400">
                Memuat data peringkat...
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Tidak ada data peringkat ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <th className="p-2.5 w-12 text-center">POS</th>
                      <th className="p-2.5">OUTLET & BRAND</th>
                      <th className="p-2.5">PEMILIK</th>
                      <th className="p-2.5 text-right">ORDERS</th>
                      <th className="p-2.5 text-right">GMV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankings.map((r) => (
                      <tr key={r.store_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700 bg-slate-100">
                            #{r.rank}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900">{r.outlet_name}</div>
                          <div className="text-[10px] text-slate-500">{r.brand}</div>
                        </td>
                        <td className="p-2.5 text-slate-600">{r.owner_name}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">
                          {Number(r.total_orders).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                          {formatIDR(r.total_gmv)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Week-over-Week (WoW) Growth Comparison */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pertumbuhan Week-over-Week (WoW)</h2>
                <p className="text-xs text-slate-500">Evaluasi laju pesanan dan omzet antar pekan</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                Tren Mingguan
              </span>
            </div>

            {isLoadingAnalytics ? (
              <div className="py-12 flex justify-center items-center text-xs text-slate-400">
                Memuat data pertumbuhan mingguan...
              </div>
            ) : wowData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Tidak ada data mingguan ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <th className="p-2.5">MINGGU</th>
                      <th className="p-2.5 text-right">TOTAL ORDER</th>
                      <th className="p-2.5 text-right">WOW ORDER</th>
                      <th className="p-2.5 text-right">TOTAL GMV</th>
                      <th className="p-2.5 text-right">WOW GMV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wowData.slice(-8).reverse().map((w) => {
                      const isOrderPos = w.orders_wow_pct > 0;
                      const isGmvPos = w.gmv_wow_pct > 0;
                      return (
                        <tr key={w.minggu} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-semibold text-slate-900">
                            {w.minggu}
                            <div className="text-[10px] text-slate-500 font-normal">
                              {w.start_week} - {w.end_week}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">
                            {Number(w.total_orders).toLocaleString('id-ID')}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-block ${
                                isOrderPos
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : w.orders_wow_pct < 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {w.orders_wow_pct > 0 ? '+' : ''}{w.orders_wow_pct}%
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-semibold text-slate-800 tabular-nums">
                            {formatIDR(w.total_gmv)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-block ${
                                isGmvPos
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : w.gmv_wow_pct < 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {w.gmv_wow_pct > 0 ? '+' : ''}{w.gmv_wow_pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MatView Section 2: Baseline vs Current Growth Matrix */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Baseline Historis vs Posisi Terkini per Owner</h2>
            <p className="text-xs text-slate-500">Akumulasi performa awal sejak live date dibandingkan posisi berjalan</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
            Lifetime Snapshot
          </span>
        </div>

        {isLoadingAnalytics ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Memuat data baseline...
          </div>
        ) : baselineData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada data baseline pemilik.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {baselineData.slice(0, 6).map((b) => (
              <div
                key={b.owner_name}
                className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 truncate mr-2" title={b.owner_name}>
                      {b.owner_name}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {b.total_outlets} Outlet
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-3">
                    Live Sejak: <span className="font-semibold text-slate-700">{b.earliest_live || 'N/A'}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Orders</span>
                    <span className="font-bold text-slate-900 text-sm tabular-nums">
                      {Number(b.total_orders).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total GMV</span>
                    <span className="font-bold text-emerald-700 text-sm tabular-nums">
                      {formatIDR(b.total_gmv)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Hero Chart: Pendapatan vs Volume Pesanan */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Header with Title, Question, and Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {activeChartTab === 'revenue'
                ? 'Tren Pendapatan: Pendapatan Kotor vs Pendapatan Bersih'
                : 'Tren Volume Pesanan: Order Sukses vs Order Batal'}
            </h2>
            <p className="text-xs text-slate-500">
              {activeChartTab === 'revenue'
                ? 'Bagaimana perbandingan omzet bruto dengan penerimaan bersih setelah potongan ojol per periode?'
                : 'Berapa rasio dan efektivitas konversi pesanan sukses vs pesanan batal per periode?'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Legend Pills */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 mr-1">
              {activeChartTab === 'revenue' ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                    Pendapatan Kotor
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                    Pendapatan Bersih
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                    Order Sukses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#F43F5E]" />
                    Order Batal
                  </span>
                </>
              )}
            </div>

            {/* Segmented Control */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveChartTab('revenue')}
                className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                  activeChartTab === 'revenue'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendapatan
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('orders')}
                className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                  activeChartTab === 'orders'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Volume Order
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-80 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Memuat grafik performa...
            </div>
          ) : chartRows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Tidak ada data grafik untuk filter yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'revenue' ? (
                <BarChart data={chartRows} barGap={6} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="periode_label"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={formatYAxisCurrency}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0]?.payload as PerformaDataRow;
                        if (!item) return null;
                        const marginBersihPct =
                          item.pendapatan_kotor > 0
                            ? Math.round((item.pendapatan_bersih / item.pendapatan_kotor) * 100)
                            : 0;

                        return (
                          <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[210px]">
                            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                              <span>{label}</span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                                Margin: {marginBersihPct}%
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                  Pendapatan Kotor:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">
                                  {formatIDR(item.pendapatan_kotor)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                  Potongan Ojol:
                                </span>
                                <span className="font-medium text-amber-700 tabular-nums">
                                  -{formatIDR(item.potongan_ojol)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                  Pendapatan Bersih:
                                </span>
                                <span className="font-bold text-emerald-700 tabular-nums">
                                  {formatIDR(item.pendapatan_bersih)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="pendapatan_kotor"
                    name="Pendapatan Kotor"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="pendapatan_bersih"
                    name="Pendapatan Bersih"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              ) : (
                <BarChart data={chartRows} barGap={6} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="periode_label"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(v) => Number(v).toLocaleString('id-ID')}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0]?.payload as PerformaDataRow;
                        if (!item) return null;
                        const total = Number(item.total_order || 0);
                        const pctSukses = total > 0 ? Math.round((item.order_sukses / total) * 100) : 0;

                        return (
                          <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[195px]">
                            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                              <span>{label}</span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Total: {total.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                  Order Sukses:
                                </span>
                                <span className="font-bold text-emerald-700 tabular-nums">
                                  {Number(item.order_sukses).toLocaleString('id-ID')} ({pctSukses}%)
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                                  Order Batal:
                                </span>
                                <span className="font-bold text-rose-600 tabular-nums">
                                  {Number(item.order_batal).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="order_sukses"
                    name="Order Sukses"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="order_batal"
                    name="Order Batal"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Rincian Metrik Laporan Performa ({tipeLaporan})</h2>
            <p className="text-xs text-slate-500">Tabel komparasi lengkap pendapatan, potongan ojol, dan status order</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {data.length > 0 ? `${data.length - (data.some(d => d.periode_label === 'Grand Total') ? 1 : 0)} Periode` : '0 Periode'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <th className="p-3">PERIODE</th>
                <th className="p-3 text-right">PENDAPATAN KOTOR</th>
                <th className="p-3 text-right">POTONGAN OJOL</th>
                <th className="p-3 text-right">PENDAPATAN BERSIH</th>
                <th className="p-3 text-right">RATA-RATA ORDER</th>
                <th className="p-3 text-right">TOTAL ORDER</th>
                <th className="p-3 text-right">ORDER SUKSES</th>
                <th className="p-3 text-right">ORDER BATAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Memuat data performa...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada data ditemukan untuk kriteria filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r, i) => {
                  const isGrandTotal = r.periode_label === 'Grand Total';
                  return (
                    <tr
                      key={i}
                      className={
                        isGrandTotal
                          ? 'bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900'
                          : 'hover:bg-slate-50/80 transition-colors text-slate-800'
                      }
                    >
                      <td className="p-3 font-semibold text-slate-900">{r.periode_label}</td>
                      <td className="p-3 text-right tabular-nums">{formatIDR(r.pendapatan_kotor)}</td>
                      <td className="p-3 text-right tabular-nums text-amber-800">
                        {r.potongan_ojol > 0 ? `-${formatIDR(r.potongan_ojol)}` : formatIDR(0)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-emerald-800">
                        {formatIDR(r.pendapatan_bersih)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-slate-600">
                        {formatIDR(r.rata_rata_order_per_customer)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-slate-900">
                        {Number(r.total_order).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right tabular-nums text-emerald-700">
                        {Number(r.order_sukses).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right tabular-nums text-rose-600">
                        {Number(r.order_batal).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
