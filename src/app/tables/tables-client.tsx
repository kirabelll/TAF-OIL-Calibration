'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme-toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

import {
  Database,
  Truck,
  Ruler,
  Fuel,
  FileText,
  Receipt,
  Thermometer,
  LineChart,
  ArrowLeft,
  Plus,
  Upload,
  Trash2,
  Search,
  Printer,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  trucks: any[];
  calibrations: any[];
  products: any[];
  orders: any[];
  debitNotes: any[];
  densitySample: any[];
  factorSample: any[];
  tableCounts: Record<string, number>;
}

function TablesClientContent({
  trucks,
  calibrations,
  products,
  orders,
  debitNotes,
  densitySample,
  factorSample,
  tableCounts,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTable = searchParams.get('table') || 'truck_headers';

  // Modal States
  const [showAddCalib, setShowAddCalib] = useState(false);
  const [showBulkCalib, setShowBulkCalib] = useState(false);
  const [showManualDebit, setShowManualDebit] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Calibration Point Handler
  const handleDeleteCalib = async (id: number) => {
    if (!confirm('Are you sure you want to delete this calibration point?')) return;
    try {
      const res = await fetch(`/api/truck-calibrations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete calibration point');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting point');
    }
  };

  const tabs = [
    { key: 'truck_headers', label: 'truck_headers', icon: Truck, count: tableCounts.truck_headers },
    { key: 'truck_calibrations', label: 'truck_calibrations', icon: Ruler, count: tableCounts.truck_calibrations },
    { key: 'allowable_loss_products', label: 'allowable_loss_products', icon: Fuel, count: tableCounts.allowable_loss_products },
    { key: 'transfer_orders', label: 'transfer_orders', icon: FileText, count: tableCounts.transfer_orders },
    { key: 'debit_notes', label: 'debit_notes', icon: Receipt, count: tableCounts.debit_notes, alert: true },
    { key: 'density_correct_20', label: 'density_correct_20', icon: Thermometer, count: tableCounts.density_correct_20 },
    { key: 'factor_correct_20', label: 'factor_correct_20', icon: LineChart, count: tableCounts.factor_correct_20 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-600 text-white rounded-lg shadow-sm">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-50">
              Petroleum Database Studio &amp; Lookups Inspector
            </h1>
            <p className="text-xs text-slate-500">
              SQLite tables, calibrated dip levels, tariff matrices, and ASTM 54B/D lookup grids.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Transhipment Order UI</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        {tabs.map((tab) => {
          const isActive = activeTable === tab.key;
          const Icon = tab.icon;
          return (
            <Link key={tab.key} href={`/tables?table=${tab.key}`}>
              <Button
                variant={isActive ? (tab.alert ? 'destructive' : 'default') : 'ghost'}
                size="sm"
                className="gap-2 font-semibold text-xs h-8"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <Badge
                  variant={isActive ? 'secondary' : 'outline'}
                  className="ml-1 text-[10px] px-1.5 py-0 h-4"
                >
                  {tab.count}
                </Badge>
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            type="text"
            placeholder={`Search in ${activeTable}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          {activeTable === 'truck_calibrations' && (
            <>
              <Button
                type="button"
                variant="amber"
                size="sm"
                onClick={() => setShowAddCalib(true)}
                className="gap-1.5 font-semibold text-xs h-9"
              >
                <Plus className="w-4 h-4" />
                <span>Add Calibration Point</span>
              </Button>
              <Button
                type="button"
                variant="indigo"
                size="sm"
                onClick={() => setShowBulkCalib(true)}
                className="gap-1.5 font-semibold text-xs h-9"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import</span>
              </Button>
            </>
          )}

          {activeTable === 'debit_notes' && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowManualDebit(true)}
              className="gap-1.5 font-semibold text-xs h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Create Manual Debit Note</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardContent className="p-0">
          {/* 1. TRUCK HEADERS */}
          {activeTable === 'truck_headers' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate No</TableHead>
                  <TableHead>Truck No</TableHead>
                  <TableHead>Trailer Plate</TableHead>
                  <TableHead>Carrier / Fleet</TableHead>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Licence No</TableHead>
                  <TableHead className="text-center">Comps</TableHead>
                  <TableHead className="text-right">Total Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks
                  .filter(
                    (t) =>
                      !searchTerm ||
                      t.plate_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (t.driver_name && t.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (t.carrier_name && t.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold text-indigo-950 font-mono">{t.plate_no}</TableCell>
                      <TableCell className="font-medium text-slate-600">{t.truck_no || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{t.trailer_plate_no || '—'}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{t.carrier_name}</TableCell>
                      <TableCell>{t.driver_name || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{t.driver_licence_no || 'N/A'}</TableCell>
                      <TableCell className="text-center font-bold">{t.compartment_count}</TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-900">
                        {Number(t.total_capacity).toLocaleString()} L
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {/* 2. TRUCK CALIBRATIONS */}
          {activeTable === 'truck_calibrations' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead className="text-center">Compartment</TableHead>
                  <TableHead className="text-right">Dip Measurement (mm)</TableHead>
                  <TableHead className="text-right">Calibrated Litres (L)</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calibrations
                  .filter(
                    (c) =>
                      !searchTerm ||
                      c.plate_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      String(c.compartment_no).includes(searchTerm)
                  )
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-indigo-950 font-mono">{c.plate_no}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold text-amber-700 bg-amber-50">
                          Comp #{c.compartment_no}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">{c.dip_mm} mm</TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-900">
                        {Number(c.litres).toLocaleString()} L
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCalib(c.id)}
                          className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {/* 3. ALLOWABLE LOSS PRODUCTS */}
          {activeTable === 'allowable_loss_products' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Petroleum Product</TableHead>
                  <TableHead className="text-right">Contract Allowable Loss %</TableHead>
                  <TableHead className="text-right">Tariff Rate (ETB / Litre)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-indigo-950 font-mono">{p.item_number}</TableCell>
                    <TableCell className="font-bold text-slate-900">{p.product_name}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-amber-800">
                      {(Number(p.allowable_loss_percent) || 0).toFixed(2)} %
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-900">
                      {Number(p.price_per_litre).toFixed(2)} ETB
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 4. TRANSFER ORDERS */}
          {activeTable === 'transfer_orders' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Start Vol20</TableHead>
                  <TableHead className="text-right">Final Vol20</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Amount (ETB)</TableHead>
                  <TableHead className="text-center">Voucher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-8 text-center text-slate-500">
                      No transfer orders saved yet. Create an order from the Transhipment Dashboard!
                    </TableCell>
                  </TableRow>
                ) : (
                  orders
                    .filter(
                      (o) =>
                        !searchTerm ||
                        o.to_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        o.plate_no.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-bold text-indigo-900 font-mono">{o.to_number}</TableCell>
                        <TableCell className="font-medium text-slate-600">{o.order_date}</TableCell>
                        <TableCell className="font-semibold uppercase">{o.plate_no}</TableCell>
                        <TableCell>{o.product_item_number}</TableCell>
                        <TableCell className="text-right font-mono">{Number(o.start_vol20).toFixed(0)}</TableCell>
                        <TableCell className="text-right font-mono">{Number(o.final_vol20).toFixed(0)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-900">
                          {Number(o.loss_volume).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-700">
                          {Number(o.debit_volume).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-amber-900">
                          {Number(o.debit_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/debit-note/${o.to_number}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">
                              <Printer className="w-3 h-3 mr-1 text-slate-500" />
                              <span>View Note</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}

          {/* 5. DEBIT NOTES */}
          {activeTable === 'debit_notes' && (
            <Table>
              <TableHeader className="bg-rose-50/70">
                <TableRow>
                  <TableHead className="text-rose-950">Debit Note #</TableHead>
                  <TableHead className="text-rose-950">Date</TableHead>
                  <TableHead className="text-rose-950">Truck Plate</TableHead>
                  <TableHead className="text-rose-950">Carrier</TableHead>
                  <TableHead className="text-rose-950">Driver</TableHead>
                  <TableHead className="text-rose-950 text-right">Physical Shortage (L)</TableHead>
                  <TableHead className="text-rose-950 text-right">Debit Volume (L)</TableHead>
                  <TableHead className="text-rose-950 text-right">Tariff (ETB)</TableHead>
                  <TableHead className="text-rose-950 text-right">Payable Amount (ETB)</TableHead>
                  <TableHead className="text-rose-950 text-center">Print Voucher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debitNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-8 text-center text-slate-500">
                      No debit notes recorded. When an order shortage exceeds contract tolerance, it appears here.
                    </TableCell>
                  </TableRow>
                ) : (
                  debitNotes.map((dn) => (
                    <TableRow key={dn.id} className="hover:bg-rose-50/30">
                      <TableCell className="font-bold text-rose-950 font-mono">DN-{dn.to_number}</TableCell>
                      <TableCell className="font-medium text-slate-600">{dn.order_date}</TableCell>
                      <TableCell className="font-semibold uppercase">{dn.plate_no}</TableCell>
                      <TableCell>{dn.carrier_name || 'Fleet'}</TableCell>
                      <TableCell>{dn.driver_name || 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-800">
                        {Number(dn.loss_volume).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-rose-700">
                        {Number(dn.debit_volume).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(dn.price_per_litre).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-amber-900 text-sm">
                        {Number(dn.debit_amount).toFixed(2)} ETB
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/debit-note/${dn.to_number}`}>
                          <Button variant="destructive" size="sm" className="h-7 text-xs font-semibold gap-1">
                            <Printer className="w-3 h-3" />
                            <span>Print Voucher</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* 6. DENSITY CORRECT 20 */}
          {activeTable === 'density_correct_20' && (
            <div className="space-y-2">
              <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900 font-semibold flex items-center space-x-2">
                <Thermometer className="w-4 h-4 text-amber-600" />
                <span>ASTM 54B Standard Density Correction to 20°C grid lookup table (100 sample rows).</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Observed Density (kg/m³)</TableHead>
                    <TableHead className="text-right">Temperature (°C)</TableHead>
                    <TableHead className="text-right">Corrected Density @ 20°C (kg/m³)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {densitySample.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-right font-mono font-bold">{Number(d.observed_density).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(d.temperature).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-indigo-900">
                        {Number(d.density_20).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 7. FACTOR CORRECT 20 */}
          {activeTable === 'factor_correct_20' && (
            <div className="space-y-2">
              <div className="p-3 bg-emerald-50/70 border-b border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center space-x-2">
                <LineChart className="w-4 h-4 text-emerald-600" />
                <span>ASTM 54D Standard Volume Correction Factor (VCF) to 20°C (100 sample rows).</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Temperature (°C)</TableHead>
                    <TableHead className="text-right">Density @ 20°C (kg/m³)</TableHead>
                    <TableHead className="text-right">Volume Factor (VCF)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factorSample.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-right font-mono font-medium">{Number(f.temperature).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{Number(f.density_20).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-emerald-800">
                        {Number(f.factor).toFixed(6)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: ADD SINGLE CALIBRATION POINT */}
      {showAddCalib && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Add Calibration Point
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowAddCalib(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </CardHeader>
            <form method="POST" action="/api/truck-calibrations">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label>Truck Plate No</Label>
                  <select
                    name="plate_no"
                    required
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold shadow-sm"
                  >
                    {trucks.map((t) => (
                      <option key={t.plate_no} value={t.plate_no}>
                        {t.plate_no}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Comp #</Label>
                    <Input
                      type="number"
                      name="compartment_no"
                      min="1"
                      max="10"
                      defaultValue="1"
                      required
                      className="font-bold text-center"
                    />
                  </div>
                  <div>
                    <Label>Dip (mm)</Label>
                    <Input
                      type="number"
                      name="dip_mm"
                      min="0"
                      placeholder="1500"
                      required
                      className="font-mono text-right"
                    />
                  </div>
                  <div>
                    <Label>Litres (L)</Label>
                    <Input
                      type="number"
                      name="litres"
                      min="0"
                      placeholder="11500"
                      required
                      className="font-mono text-right"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end space-x-2 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCalib(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="amber" size="sm" className="font-semibold">
                  Save Calibration Point
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: BULK CALIBRATION IMPORT */}
      {showBulkCalib && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Bulk Import Calibration Data
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowBulkCalib(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </CardHeader>
            <form method="POST" action="/api/truck-calibrations">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Truck Plate</Label>
                    <select
                      name="plate_no"
                      required
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold shadow-sm"
                    >
                      {trucks.map((t) => (
                        <option key={t.plate_no} value={t.plate_no}>
                          {t.plate_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Compartment Number</Label>
                    <Input
                      type="number"
                      name="compartment_no"
                      min="1"
                      max="10"
                      defaultValue="1"
                      required
                      className="font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <Label>Paste Calibration Data (dip_mm, litres)</Label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    Format: one entry per line (e.g. <code>1395, 11395</code> or separated by space/tab).
                  </p>
                  <textarea
                    name="bulk_data"
                    rows={8}
                    placeholder={`0, 0\n700, 5700\n1395, 11395`}
                    required
                    className="flex w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  ></textarea>
                </div>
              </CardContent>
              <div className="flex justify-end space-x-2 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkCalib(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="indigo" size="sm" className="font-semibold">
                  Import Points
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: CREATE MANUAL DEBIT NOTE */}
      {showManualDebit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Create Manual Debit Note
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowManualDebit(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </CardHeader>
            <form method="POST" action="/api/debit-notes/manual">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Truck Plate</Label>
                    <select
                      name="plate_no"
                      required
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold shadow-sm"
                    >
                      {trucks.map((t) => (
                        <option key={t.plate_no} value={t.plate_no}>
                          {t.plate_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      name="order_date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Carrier Name</Label>
                    <Input type="text" name="carrier_name" defaultValue="TAF Transporter" />
                  </div>
                  <div>
                    <Label>Driver Name</Label>
                    <Input type="text" name="driver_name" placeholder="Driver name" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Product</Label>
                    <select
                      name="product_item_number"
                      required
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold shadow-sm"
                    >
                      {products.map((p) => (
                        <option key={p.item_number} value={p.item_number}>
                          {p.product_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Origin Vol @ 20°C (L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      name="origin_vol20"
                      placeholder="48000"
                      required
                      className="text-right font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Loss Vol (L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      name="loss_volume"
                      placeholder="70"
                      required
                      className="text-right font-mono"
                    />
                  </div>
                  <div>
                    <Label>Debit Vol (L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      name="debit_volume"
                      placeholder="12"
                      required
                      className="text-right font-mono font-bold text-rose-700"
                    />
                  </div>
                  <div>
                    <Label>Tariff (ETB/L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      name="price_per_litre"
                      defaultValue="319.76"
                      required
                      className="text-right font-mono"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end space-x-2 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowManualDebit(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" size="sm" className="font-semibold">
                  Generate Debit Note
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TablesClient(props: Props) {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Loading Database Studio...</div>}>
      <TablesClientContent {...props} />
    </Suspense>
  );
}
