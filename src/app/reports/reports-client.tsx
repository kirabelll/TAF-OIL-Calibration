'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TransferOrder, AllowableLossProduct, TruckHeader } from '@/lib/db';
import {
  FileText,
  Printer,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Truck,
  Fuel,
  Receipt,
  Scale,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface Props {
  initialOrders: TransferOrder[];
  products: AllowableLossProduct[];
  trucks: TruckHeader[];
}

export default function ReportsClient({ initialOrders, products, trucks }: Props) {
  // Filters State
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '30d' | 'quarter'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'carriers' | 'audit' | 'charts'>('reconciliation');

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    return initialOrders.filter((o) => {
      // Date filter
      if (dateFilter !== 'all') {
        const orderDate = new Date(o.order_date).getTime();
        const now = new Date('2026-11-06').getTime();
        const daysDiff = (now - orderDate) / (1000 * 3600 * 24);

        if (dateFilter === 'month' && daysDiff > 31) return false;
        if (dateFilter === '30d' && daysDiff > 30) return false;
        if (dateFilter === 'quarter' && daysDiff > 90) return false;
      }

      // Product filter
      if (selectedProduct !== 'all' && o.product_item_number !== selectedProduct) {
        return false;
      }

      // Carrier filter
      if (selectedCarrier !== 'all' && o.carrier_name !== selectedCarrier) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'debit' && (Number(o.debit_volume) || 0) <= 0) {
        return false;
      }
      if (selectedStatus === 'clean' && (Number(o.debit_volume) || 0) > 0) {
        return false;
      }

      // Text search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const match =
          (o.to_number || '').toLowerCase().includes(q) ||
          (o.plate_no || '').toLowerCase().includes(q) ||
          (o.driver_name || '').toLowerCase().includes(q) ||
          (o.carrier_name || '').toLowerCase().includes(q) ||
          (o.ship_to_depot || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [initialOrders, dateFilter, selectedProduct, selectedCarrier, selectedStatus, searchQuery]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    const totalDispatched = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.origin_vol20 || o.start_vol20) || 0),
      0
    );
    const totalReceived = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.final_vol20) || 0),
      0
    );
    const totalShortage = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.loss_volume) || 0),
      0
    );
    const totalAllowed = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.allowed_loss_2dp || o.allowed_loss_volume) || 0),
      0
    );
    const totalDebitVol = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.debit_volume) || 0),
      0
    );
    const totalDebitAmt = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.debit_amount) || 0),
      0
    );

    const lossRate = totalDispatched > 0 ? (totalShortage / totalDispatched) * 100 : 0;
    const debitOrdersCount = filteredOrders.filter((o) => Number(o.debit_volume) > 0).length;

    return {
      orderCount: filteredOrders.length,
      totalDispatched,
      totalReceived,
      totalShortage,
      totalAllowed,
      totalDebitVol,
      totalDebitAmt,
      lossRate,
      debitOrdersCount,
    };
  }, [filteredOrders]);

  // Product Grouping Breakdown
  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        item_number: string;
        name: string;
        trips: number;
        dispatched: number;
        received: number;
        shortage: number;
        allowed: number;
        debitVol: number;
        debitAmt: number;
        price: number;
        allowPct: number;
      }
    >();

    for (const p of products) {
      map.set(p.item_number, {
        item_number: p.item_number,
        name: p.product_name,
        trips: 0,
        dispatched: 0,
        received: 0,
        shortage: 0,
        allowed: 0,
        debitVol: 0,
        debitAmt: 0,
        price: p.price_per_litre,
        allowPct: p.allowable_loss_percent,
      });
    }

    for (const o of filteredOrders) {
      let rec = map.get(o.product_item_number);
      if (!rec) {
        rec = {
          item_number: o.product_item_number,
          name: o.product_item_number,
          trips: 0,
          dispatched: 0,
          received: 0,
          shortage: 0,
          allowed: 0,
          debitVol: 0,
          debitAmt: 0,
          price: o.price_per_litre,
          allowPct: o.allowable_loss_percent,
        };
        map.set(o.product_item_number, rec);
      }

      rec.trips += 1;
      rec.dispatched += Number(o.origin_vol20 || o.start_vol20) || 0;
      rec.received += Number(o.final_vol20) || 0;
      rec.shortage += Number(o.loss_volume) || 0;
      rec.allowed += Number(o.allowed_loss_2dp || o.allowed_loss_volume) || 0;
      rec.debitVol += Number(o.debit_volume) || 0;
      rec.debitAmt += Number(o.debit_amount) || 0;
    }

    return Array.from(map.values()).filter((p) => p.trips > 0);
  }, [filteredOrders, products]);

  // Carrier Grouping Breakdown
  const carrierSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        carrier_name: string;
        trips: number;
        dispatched: number;
        received: number;
        shortage: number;
        debitVol: number;
        debitAmt: number;
        debitTrips: number;
      }
    >();

    for (const o of filteredOrders) {
      const carrier = o.carrier_name || 'Unassigned Carrier';
      if (!map.has(carrier)) {
        map.set(carrier, {
          carrier_name: carrier,
          trips: 0,
          dispatched: 0,
          received: 0,
          shortage: 0,
          debitVol: 0,
          debitAmt: 0,
          debitTrips: 0,
        });
      }
      const rec = map.get(carrier)!;
      rec.trips += 1;
      rec.dispatched += Number(o.origin_vol20 || o.start_vol20) || 0;
      rec.received += Number(o.final_vol20) || 0;
      rec.shortage += Number(o.loss_volume) || 0;
      rec.debitVol += Number(o.debit_volume) || 0;
      rec.debitAmt += Number(o.debit_amount) || 0;
      if (Number(o.debit_volume) > 0) {
        rec.debitTrips += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.dispatched - a.dispatched);
  }, [filteredOrders]);

  // Unique carriers list for filter
  const carriersList = useMemo(() => {
    const set = new Set<string>();
    for (const o of initialOrders) {
      if (o.carrier_name) set.add(o.carrier_name);
    }
    return Array.from(set);
  }, [initialOrders]);

  // Export to CSV Function
  const exportCSV = () => {
    const headers = [
      'TO Number',
      'Date',
      'Plate No',
      'Trailer',
      'Carrier',
      'Driver',
      'Product Code',
      'Origin Storage',
      'Destination Depot',
      'Start Vol 20 (L)',
      'Final Vol 20 (L)',
      'Shortage Loss (L)',
      'Allowable %',
      'Allowed Loss (L)',
      'Debit Volume (L)',
      'Price Per Litre (ETB)',
      'Debit Amount (ETB)',
      'Status',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.to_number}"`,
      `"${o.order_date}"`,
      `"${o.plate_no}"`,
      `"${o.trailer_plate_no || ''}"`,
      `"${o.carrier_name || ''}"`,
      `"${o.driver_name || ''}"`,
      `"${o.product_item_number}"`,
      `"${o.ship_from_storage_point || ''}"`,
      `"${o.ship_to_depot || ''}"`,
      (Number(o.origin_vol20 || o.start_vol20) || 0).toFixed(2),
      (Number(o.final_vol20) || 0).toFixed(2),
      (Number(o.loss_volume) || 0).toFixed(2),
      (Number(o.allowable_loss_percent) || 0).toFixed(4),
      (Number(o.allowed_loss_2dp || o.allowed_loss_volume) || 0).toFixed(2),
      (Number(o.debit_volume) || 0).toFixed(2),
      (Number(o.price_per_litre) || 0).toFixed(2),
      (Number(o.debit_amount) || 0).toFixed(2),
      `"${o.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `TAF_OIL_Transhipment_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1 dark:text-zinc-400">
            <span>DOCUMENTS</span>
            <span>/</span>
            <span className="text-zinc-800 dark:text-zinc-200">ANALYTICS & RECONCILIATION</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Transhipment & Loss Report
          </h1>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Reconciliation of Djibouti-to-Addis shipments, ASTM 54B/D volume correction, and carrier debit notes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 shadow-2xs transition-all cursor-pointer dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold shadow-2xs transition-all cursor-pointer dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume Shipped */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Volume @ 20°C</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              +12.5%
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-white mt-1 font-mono">
            {summary.totalDispatched.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">Trending up this month ↗</span>
            <p className="text-zinc-500 mt-0.5">{summary.orderCount} transhipment dispatches</p>
          </div>
        </div>

        {/* Card 2: Net Shortage Litres */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Transit Shortage Loss</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <TrendingDown className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              -20%
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-white mt-1 font-mono">
            {summary.totalShortage.toFixed(2)} L
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Down 20% this period ↘</span>
            <p className="text-zinc-500 mt-0.5">Average loss rate: {summary.lossRate.toFixed(3)}%</p>
          </div>
        </div>

        {/* Card 3: Recoverable Debit Volume */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Claimed Debit Volume</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              {summary.debitOrdersCount} Claims
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-white mt-1 font-mono">
            {summary.totalDebitVol.toFixed(2)} L
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-800 dark:text-zinc-300 font-medium">Excess over allowable contract</span>
            <p className="text-zinc-500 mt-0.5">Contract threshold: 0.08% - 0.12%</p>
          </div>
        </div>

        {/* Card 4: Total Debit Amount */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Debit Recoverable</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              +4.5%
            </span>
          </div>
          <div className="text-2xl font-black text-zinc-950 dark:text-white mt-1 font-mono">
            {summary.totalDebitAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Auto-invoiced to carriers ↗</span>
            <p className="text-zinc-500 mt-0.5">ASTM 54B evaluated tariffs</p>
          </div>
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search TO #, truck plate, driver, depot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:border-zinc-600"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Date Range Filter */}
            <select
              aria-label="Filter by date range"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none shadow-2xs dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300"
            >
              <option value="all">All Dates</option>
              <option value="month">This Month</option>
              <option value="30d">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>

            {/* Product Filter */}
            <select
              aria-label="Filter by product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none shadow-2xs dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300"
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.item_number} value={p.item_number}>
                  {p.product_name}
                </option>
              ))}
            </select>

            {/* Carrier Filter */}
            <select
              aria-label="Filter by carrier"
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none shadow-2xs dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300"
            >
              <option value="all">All Carriers</option>
              {carriersList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by loss status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none shadow-2xs dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300"
            >
              <option value="all">All Statuses</option>
              <option value="debit">Claims Only (Debit &gt; 0)</option>
              <option value="clean">Within Allowance</option>
            </select>

            {/* Reset Filters button */}
            {(dateFilter !== 'all' ||
              selectedProduct !== 'all' ||
              selectedCarrier !== 'all' ||
              selectedStatus !== 'all' ||
              searchQuery !== '') && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setSelectedProduct('all');
                  setSelectedCarrier('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="text-xs text-zinc-600 hover:text-zinc-950 px-2 py-1 rounded bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-800/60 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800/60 dark:text-zinc-400">
          <div>
            Showing <span className="font-semibold text-zinc-800 dark:text-zinc-200">{filteredOrders.length}</span> of{' '}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{initialOrders.length}</span> total orders
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Within Allowance: {filteredOrders.length - summary.debitOrdersCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Debit Incurred: {summary.debitOrdersCount}
            </span>
          </div>
        </div>
      </div>

      {/* Report View Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-medium pb-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Product Reconciliation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carriers')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'carriers'
                ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Carrier Accountability</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Transhipment Audit Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Visual Charts</span>
          </button>
        </div>

        {/* TAB 1: Product Shortage Reconciliation */}
        {activeTab === 'reconciliation' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Petroleum Product Shortage & Tariff Ledger</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Shortage volumes compared against contractual allowable limits (0.12% for JET-A1, 0.08% for AGO/MGR/KERO)
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200 dark:text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800">
                ASTM 54B VCF Standards
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-400 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Dispatches</th>
                    <th className="p-3 text-right">Dispatched (L @ 20°C)</th>
                    <th className="p-3 text-right">Received (L @ 20°C)</th>
                    <th className="p-3 text-right">Shortage (L)</th>
                    <th className="p-3 text-right">Allowed Limit</th>
                    <th className="p-3 text-right">Debit Vol (L)</th>
                    <th className="p-3 text-right">Tariff (ETB/L)</th>
                    <th className="p-3 text-right">Total Debit (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                  {productSummary.map((p) => {
                    const hasDebit = p.debitAmt > 0;
                    return (
                      <tr key={p.item_number} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-sans font-medium text-zinc-950 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <div>
                            <div>{p.name}</div>
                            <span className="text-[10px] text-zinc-500 font-mono">{p.item_number}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-sans text-zinc-700 dark:text-zinc-300">{p.trips}</td>
                        <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">
                          {p.dispatched.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">
                          {p.received.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                          {p.shortage.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-zinc-500 dark:text-zinc-400">
                          {p.allowed.toFixed(2)} ({p.allowPct}%)
                        </td>
                        <td className={`p-3 text-right font-bold ${hasDebit ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {p.debitVol.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">
                          {p.price.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right font-bold ${hasDebit ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {p.debitAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-zinc-50 font-mono font-bold text-xs text-zinc-950 border-t border-zinc-200 dark:bg-zinc-950 dark:text-white dark:border-zinc-800">
                  <tr>
                    <td className="p-3 font-sans">TOTAL SUMMARY</td>
                    <td className="p-3 text-center font-sans">{summary.orderCount}</td>
                    <td className="p-3 text-right">
                      {summary.totalDispatched.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right">
                      {summary.totalReceived.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right text-amber-600 dark:text-amber-400">
                      {summary.totalShortage.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-zinc-500 dark:text-zinc-400">
                      {summary.totalAllowed.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                      {summary.totalDebitVol.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-zinc-400">—</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                      {summary.totalDebitAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Carrier Accountability */}
        {activeTab === 'carriers' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Transporter & Carrier Accountability Matrix</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Performance audit of transit shortage and claimed debit deductions by transporter
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-400 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Carrier / Fleet Name</th>
                    <th className="p-3 text-center">Completed Trips</th>
                    <th className="p-3 text-right">Transported Vol (L)</th>
                    <th className="p-3 text-right">Total Shortage (L)</th>
                    <th className="p-3 text-right">Avg Loss / Trip</th>
                    <th className="p-3 text-center">Debit Trips</th>
                    <th className="p-3 text-right">Claimed Debit (L)</th>
                    <th className="p-3 text-right">Debit Charge (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                  {carrierSummary.map((c) => {
                    const avgLoss = c.trips > 0 ? c.shortage / c.trips : 0;
                    return (
                      <tr key={c.carrier_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-sans font-medium text-zinc-950 dark:text-white flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{c.carrier_name}</span>
                        </td>
                        <td className="p-3 text-center font-sans text-zinc-700 dark:text-zinc-300">{c.trips}</td>
                        <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">
                          {c.dispatched.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                          {c.shortage.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">
                          {avgLoss.toFixed(2)} L
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.debitTrips > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            }`}
                          >
                            {c.debitTrips} of {c.trips}
                          </span>
                        </td>
                        <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                          {c.debitVol.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          {c.debitAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Full Transhipment Orders Audit Trail */}
        {activeTab === 'audit' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Transhipment Order Ledger</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Granular audit records including density @ 20°C, temperature, ASTM factor, and vouchers
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-400 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">TO Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Truck Plate</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Start Vol20</th>
                    <th className="p-3 text-right">Final Vol20</th>
                    <th className="p-3 text-right">Shortage</th>
                    <th className="p-3 text-right">Debit ETB</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                  {filteredOrders.map((o) => {
                    const hasDebit = Number(o.debit_amount) > 0;
                    return (
                      <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-semibold text-zinc-950 dark:text-white">{o.to_number}</td>
                        <td className="p-3 text-zinc-500 dark:text-zinc-400 font-sans">{o.order_date}</td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-300">{o.plate_no}</td>
                        <td className="p-3 font-sans text-zinc-500 dark:text-zinc-400">{o.driver_name || '—'}</td>
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
                        <td className="p-3 text-right text-zinc-800 dark:text-zinc-300">
                          {(Number(o.origin_vol20 || o.start_vol20) || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-zinc-800 dark:text-zinc-300">
                          {(Number(o.final_vol20) || 0).toLocaleString()}
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
                            {hasDebit ? 'Claim Incurred' : 'Normal'}
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
        )}

        {/* TAB 4: Visual Analytics */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Shortage by Product */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/50">
              <div>
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white">Shortage Litres by Product</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Comparison of transit shrinkage across petroleum grades</p>
              </div>

              <div className="space-y-3 pt-2">
                {productSummary.map((p) => {
                  const pct = summary.totalShortage > 0 ? (p.shortage / summary.totalShortage) * 100 : 0;
                  return (
                    <div key={p.item_number} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{p.name}</span>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">
                          {p.shortage.toFixed(1)} L ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
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

            {/* Chart 2: Debits by Carrier */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/50">
              <div>
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white">Debit Deductions by Carrier</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Recoverable shortage costs billed to transporters</p>
              </div>

              <div className="space-y-3 pt-2">
                {carrierSummary.map((c) => {
                  const pct = summary.totalDebitAmt > 0 ? (c.debitAmt / summary.totalDebitAmt) * 100 : 0;
                  return (
                    <div key={c.carrier_name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.carrier_name}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {c.debitAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
