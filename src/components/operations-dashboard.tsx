'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TransferOrder, AllowableLossProduct, TruckHeader } from '@/lib/db';
import AreaTrendChart from '@/components/area-trend-chart';
import {
  Plus,
  ArrowUpRight,
  TrendingDown,
  Truck,
  Fuel,
  Receipt,
  FileText,
  Calculator,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  Database,
  BarChart3,
  Layers,
} from 'lucide-react';

interface Props {
  initialOrders: TransferOrder[];
  products: AllowableLossProduct[];
  trucks: TruckHeader[];
}

export default function OperationsDashboard({
  initialOrders,
  products,
  trucks,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregated KPI Stats
  const metrics = useMemo(() => {
    const totalDispatched = initialOrders.reduce(
      (sum, o) => sum + (Number(o.origin_vol20 || o.start_vol20) || 0),
      0
    );
    const totalReceived = initialOrders.reduce(
      (sum, o) => sum + (Number(o.final_vol20) || 0),
      0
    );
    const totalLoss = initialOrders.reduce(
      (sum, o) => sum + (Number(o.loss_volume) || 0),
      0
    );
    const totalDebitVol = initialOrders.reduce(
      (sum, o) => sum + (Number(o.debit_volume) || 0),
      0
    );
    const totalDebitAmt = initialOrders.reduce(
      (sum, o) => sum + (Number(o.debit_amount) || 0),
      0
    );

    const activeTrucks = trucks.length;
    const lossPercentage = totalDispatched > 0 ? (totalLoss / totalDispatched) * 100 : 0;
    const debitOrdersCount = initialOrders.filter((o) => Number(o.debit_volume) > 0).length;

    return {
      totalDispatched,
      totalReceived,
      totalLoss,
      totalDebitVol,
      totalDebitAmt,
      activeTrucks,
      lossPercentage,
      debitOrdersCount,
      ordersCount: initialOrders.length,
    };
  }, [initialOrders, trucks]);

  // Product volume breakdown
  const productDistribution = useMemo(() => {
    const map = new Map<string, { name: string; volume: number; count: number }>();
    for (const p of products) {
      map.set(p.item_number, { name: p.product_name, volume: 0, count: 0 });
    }

    for (const o of initialOrders) {
      const rec = map.get(o.product_item_number) || {
        name: o.product_item_number,
        volume: 0,
        count: 0,
      };
      rec.volume += Number(o.origin_vol20 || o.start_vol20) || 0;
      rec.count += 1;
      map.set(o.product_item_number, rec);
    }

    return Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  }, [initialOrders, products]);

  // Filtered recent orders
  const recentOrders = useMemo(() => {
    let list = [...initialOrders].sort(
      (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    );

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.to_number.toLowerCase().includes(q) ||
          o.plate_no.toLowerCase().includes(q) ||
          (o.driver_name || '').toLowerCase().includes(q) ||
          (o.carrier_name || '').toLowerCase().includes(q)
      );
    }

    return list.slice(0, 7);
  }, [initialOrders, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Operations Dashboard
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time transhipment monitoring, ASTM 54B/D volume correction & debit claim ledger.
          </p>
        </div>

        {/* Action Buttons: Quick Create + View Reports */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/workbench"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 font-semibold text-xs shadow-2xs transition-all dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Quick Create</span>
          </Link>

          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 text-xs font-semibold shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>View Reports</span>
          </Link>
        </div>
      </div>

      {/* Row of 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card 1: Total Volume */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Volume @ 20°C</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              +12.5%
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 font-mono tracking-tight">
            {metrics.totalDispatched.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">Trending up this month ↗</span>
            <p className="text-zinc-500 mt-0.5">Dispatched from Horizon Djibouti</p>
          </div>
        </div>

        {/* KPI Card 2: Transit Shortage Loss */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Transit Shortage Loss</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <TrendingDown className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              -20%
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 font-mono tracking-tight">
            {metrics.totalLoss.toFixed(2)} L
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Down 20% this period ↘</span>
            <p className="text-zinc-500 mt-0.5">Loss rate {metrics.lossPercentage.toFixed(3)}% (Cap 0.12%)</p>
          </div>
        </div>

        {/* KPI Card 3: Active Fleet */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Active Calibrated Fleet</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              +12.5%
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 font-mono tracking-tight">
            {metrics.activeTrucks} Trucks
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">100% Calibrated tanks ↗</span>
            <p className="text-zinc-500 mt-0.5">65 Certified dip compartments</p>
          </div>
        </div>

        {/* KPI Card 4: Shortage Debit Claims */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recoverable Debits</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              +4.5%
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 font-mono tracking-tight">
            {metrics.totalDebitAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Steady recovery rate ↗</span>
            <p className="text-zinc-500 mt-0.5">Meets recovery projections</p>
          </div>
        </div>
      </div>

      {/* Main Area Chart Card */}
      <AreaTrendChart orders={initialOrders} />

      {/* Two Column Grid: Recent Transhipment Orders & Product Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transhipment Orders */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Recent Transhipment Orders</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Latest truck consignments across the corridor</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter plate / TO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-2.5 py-1 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 w-36 sm:w-44 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:placeholder-zinc-500 dark:focus:border-zinc-700"
                />
              </div>

              <Link
                href="/reports"
                className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center gap-1 font-medium bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
              >
                <span>All Orders</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-400 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Truck Plate</th>
                  <th className="p-3">Product</th>
                  <th className="p-3 text-right">Vol @ 20°C</th>
                  <th className="p-3 text-right">Shortage</th>
                  <th className="p-3 text-right">Debit (ETB)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                {recentOrders.map((o) => {
                  const hasDebit = Number(o.debit_amount) > 0;
                  return (
                    <tr key={o.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3 font-semibold text-zinc-950 dark:text-white">
                        <div>{o.to_number}</div>
                        <span className="text-[10px] text-zinc-500 font-sans">{o.order_date}</span>
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        <div>{o.plate_no}</div>
                        <span className="text-[10px] text-zinc-500 font-sans">{o.carrier_name}</span>
                      </td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/60">
                          {o.product_item_number === 'P07-0001'
                            ? 'JET-A1'
                            : o.product_item_number === 'P01-0001'
                            ? 'AGO Diesel'
                            : o.product_item_number === 'P02-0001'
                            ? 'Gasoline'
                            : 'Kerosene'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">
                        {(Number(o.origin_vol20 || o.start_vol20) || 0).toLocaleString()} L
                      </td>
                      <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                        {(Number(o.loss_volume) || 0).toFixed(2)} L
                      </td>
                      <td className={`p-3 text-right font-bold ${hasDebit ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {(Number(o.debit_amount) || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            hasDebit
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                          }`}
                        >
                          {hasDebit ? 'Claimed' : 'Normal'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <Link
                          href={`/debit-note/preview?to_number=${encodeURIComponent(
                            o.to_number
                          )}&plate_no=${encodeURIComponent(
                            o.plate_no
                          )}&product_item_number=${encodeURIComponent(
                            o.product_item_number
                          )}&driver_name=${encodeURIComponent(
                            o.driver_name || ''
                          )}&carrier_name=${encodeURIComponent(
                            o.carrier_name || ''
                          )}&origin_vol20=${o.origin_vol20 || o.start_vol20}&start_vol20=${
                            o.start_vol20
                          }&final_vol20=${o.final_vol20}&loss_volume=${
                            o.loss_volume
                          }&allowable_loss_percent=${o.allowable_loss_percent}&allowed_loss_volume=${
                            o.allowed_loss_volume
                          }&allowed_loss_2dp=${o.allowed_loss_2dp}&debit_volume=${
                            o.debit_volume
                          }&price_per_litre=${o.price_per_litre}&debit_amount=${
                            o.debit_amount
                          }&order_date=${o.order_date}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-700 hover:text-zinc-950 font-medium bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors dark:text-zinc-300 dark:hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Voucher</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Petroleum Volume Breakdown & Quick Shortcuts */}
        <div className="space-y-6">
          {/* Petroleum Product Distribution Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-sm">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Volume by Petroleum Product</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total litres monitored across fuel types</p>
            </div>

            <div className="space-y-3 pt-1">
              {productDistribution.map((p) => {
                const pct = metrics.totalDispatched > 0 ? (p.volume / metrics.totalDispatched) * 100 : 0;
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{p.name}</span>
                      <span className="font-mono text-zinc-500 dark:text-zinc-400">
                        {p.volume.toLocaleString()} L ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Operations Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Quick Operations</h3>

            <div className="space-y-2 text-xs">
              <Link
                href="/workbench"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors group dark:bg-zinc-950/70 dark:border-zinc-800/80 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <div>
                    <div className="font-semibold text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                      New Transhipment Order
                    </div>
                    <p className="text-[11px] text-zinc-500">ASTM 54B & dip linear interpolation</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
              </Link>

              <Link
                href="/reports"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors group dark:bg-zinc-950/70 dark:border-zinc-800/80 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <div>
                    <div className="font-semibold text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                      Transhipment Reports
                    </div>
                    <p className="text-[11px] text-zinc-500">Loss reconciliation & CSV export</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
              </Link>

              <Link
                href="/tables"
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors group dark:bg-zinc-950/70 dark:border-zinc-800/80 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <div>
                    <div className="font-semibold text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                      Database Tables
                    </div>
                    <p className="text-[11px] text-zinc-500">Calibrations, fleet & lookups</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
