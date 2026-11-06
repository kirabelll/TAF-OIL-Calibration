'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { TruckHeader, AllowableLossProduct, TransferOrder } from '@/lib/db';
import { DensityCalc } from '@/lib/density-calc';
import { TransferOrderCalculator, MeterReading } from '@/lib/transfer-order-calc';
import { TruckDipCalculator } from '@/lib/truck-dip-calc';

import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme-toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

import {
  Truck,
  Fuel,
  Calculator,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Database,
  Sparkles,
  History,
  User,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Scale,
  Receipt,
  Activity,
  Coins,
  TrendingDown,
  Gauge,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';

interface KPIStats {
  fleetCount: number;
  ordersCount: number;
  totalVol20: number;
  totalDebitVolume: number;
  totalDebitAmount: number;
}

interface Props {
  initialProducts: AllowableLossProduct[];
  initialTrucks: TruckHeader[];
  initialOrders: TransferOrder[];
  kpiStats: KPIStats;
}

export default function TranshipmentDashboard({
  initialProducts,
  initialTrucks,
  initialOrders,
  kpiStats,
}: Props) {
  const searchParams = useSearchParams();

  // Active tab state
  const [activeTab, setActiveTab] = useState<'workbench' | 'orders' | 'fleet' | 'tariffs'>('workbench');

  // Search filter for recent orders
  const [orderSearch, setOrderSearch] = useState('');

  // Flash message
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      const toNum = searchParams.get('to_number');
      const loss = searchParams.get('loss');
      const debit = searchParams.get('debit');
      const amt = searchParams.get('amount');
      setAlertMsg(
        `Transhipment Order #${toNum} successfully saved! Shortage: ${loss} L, Claimed Debit: ${debit} L (${amt} ETB)`
      );
    }
  }, [searchParams]);

  // Form State
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [toNumber, setToNumber] = useState('');

  // Ship From / Ship To
  const [shipFromStorage, setShipFromStorage] = useState('HORIZON DJIBOUTI TERMINAL');
  const [shipFromDate, setShipFromDate] = useState('2026-10-20');
  const [shipFromLoc, setShipFromLoc] = useState('DJIBOUTI');
  const [shipToDepot, setShipToDepot] = useState('TAF ADDIS DEPOT');
  const [shipToDate, setShipToDate] = useState('2026-10-26');
  const [shipToLoc, setShipToLoc] = useState('ADDIS ABABA');

  // Truck details
  const [selectedPlate, setSelectedPlate] = useState(initialTrucks[0]?.plate_no || '');
  const [trailerPlate, setTrailerPlate] = useState(initialTrucks[0]?.trailer_plate_no || '');
  const [carrierName, setCarrierName] = useState(initialTrucks[0]?.carrier_name || 'TAF Oil Fleet');
  const [driverName, setDriverName] = useState(initialTrucks[0]?.driver_name || '');
  const [driverLicence, setDriverLicence] = useState(initialTrucks[0]?.driver_licence_no || '');
  const [truckCapacity, setTruckCapacity] = useState(initialTrucks[0]?.total_capacity || 45000);
  const [compartmentCount, setCompartmentCount] = useState(initialTrucks[0]?.compartment_count || 5);

  // Compartments Dips (1 to 5)
  const [dips, setDips] = useState<number[]>([0, 0, 0, 0, 0]);
  const [compVols, setCompVols] = useState<number[]>([0, 0, 0, 0, 0]);

  // Product Selection
  const [productCode, setProductCode] = useState(initialProducts[0]?.item_number || 'P07-0001');
  const [productName, setProductName] = useState(initialProducts[0]?.product_name || 'JET-A1');
  const [allowableLossPct, setAllowableLossPct] = useState(initialProducts[0]?.allowable_loss_percent || 0.12);
  const [pricePerLitre, setPricePerLitre] = useState(initialProducts[0]?.price_per_litre || 319.76);

  // Measurements
  const [startObservedLitres, setStartObservedLitres] = useState(48000);
  const [startDensity, setStartDensity] = useState(789.0);
  const [startTemp, setStartTemp] = useState(19.5);
  const [originVol20, setOriginVol20] = useState<number | ''>(48710);

  // Meters
  const [useMetered, setUseMetered] = useState(true);
  const [mTo1, setMTo1] = useState<number | ''>(162856152);
  const [mFrom1, setMFrom1] = useState<number | ''>(162807512);
  const [drained1, setDrained1] = useState<number | ''>(0);

  const [mTo2, setMTo2] = useState<number | ''>(0);
  const [mFrom2, setMFrom2] = useState<number | ''>(0);
  const [drained2, setDrained2] = useState<number | ''>(0);

  const [finalObservedLitres, setFinalObservedLitres] = useState<number | ''>('');
  const [finalDensity, setFinalDensity] = useState(789.0);
  const [finalTemp, setFinalTemp] = useState(20.0);

  // SG Dj
  const [sgDj1, setSgDj1] = useState<number | ''>(0.7916);
  const [sgDj2, setSgDj2] = useState<number | ''>(0.7923);

  // Calculation Results
  const [results, setResults] = useState<{
    startD20: number;
    startFactor: number;
    finalD20: number;
    finalFactor: number;
    meteredTotal: number;
    startVol20: number;
    finalVol20: number;
    lossVolume: number;
    allowedLossVolume: number;
    allowedLoss2dp: number;
    debitVolume: number;
    debitAmount: number;
  }>({
    startD20: 788.6,
    startFactor: 1.0005,
    finalD20: 789.0,
    finalFactor: 1.0,
    meteredTotal: 48640,
    startVol20: 48710,
    finalVol20: 48640,
    lossVolume: 70,
    allowedLossVolume: 58,
    allowedLoss2dp: 58.45,
    debitVolume: 11.55,
    debitAmount: 3693.23,
  });

  // Calculate whenever dependencies change
  const runCalculation = () => {
    const sD20 = DensityCalc.density20(startDensity, startTemp);
    const sFactor = DensityCalc.vcf20(sD20, startTemp);

    const fDens = finalDensity || startDensity;
    const fTemp = finalTemp || startTemp;
    const fD20 = DensityCalc.density20(fDens, fTemp);
    const fFactor = DensityCalc.vcf20(fD20, fTemp);

    const netM1 = (Number(mTo1) || 0) - (Number(mFrom1) || 0) + (Number(drained1) || 0);
    const netM2 = (Number(mTo2) || 0) - (Number(mFrom2) || 0) + (Number(drained2) || 0);
    const meteredTotal = netM1 + netM2;

    const meters: MeterReading[] = [];
    if (useMetered && (mTo1 !== '' || mTo2 !== '')) {
      if (mTo1 !== '') {
        meters.push({ from_meter: Number(mFrom1) || 0, to_meter: Number(mTo1) || 0, drained: Number(drained1) || 0 });
      }
      if (mTo2 !== '') {
        meters.push({ from_meter: Number(mFrom2) || 0, to_meter: Number(mTo2) || 0, drained: Number(drained2) || 0 });
      }
    }

    const calc = TransferOrderCalculator.evaluateTransferOrder({
      start_observed_litres: startObservedLitres,
      start_factor: sFactor,
      final_observed_litres: Number(finalObservedLitres) || meteredTotal,
      final_factor: fFactor,
      meters,
      allowable_loss_percent: allowableLossPct,
      price_per_litre: pricePerLitre,
      use_metered: meters.length > 0,
    });

    let sVol20 = calc.start_vol20;
    if (originVol20 && Number(originVol20) > 0) {
      sVol20 = Number(originVol20);
      const loss = TransferOrderCalculator.calculateLoss(sVol20, calc.final_vol20);
      const allowedVol = TransferOrderCalculator.calculateAllowedLoss(sVol20, allowableLossPct);
      const allowed2dp = TransferOrderCalculator.calculateAllowedLoss2dp(sVol20, allowableLossPct);
      const debitVol = TransferOrderCalculator.calculateDebitVolume(loss, sVol20, allowableLossPct);
      const debitAmt = TransferOrderCalculator.calculateDebitAmount(debitVol, pricePerLitre);

      calc.start_vol20 = sVol20;
      calc.loss_volume = Math.round((loss + Number.EPSILON) * 100) / 100;
      calc.allowed_loss_volume = allowedVol;
      calc.allowed_loss_2dp = allowed2dp;
      calc.debit_volume = debitVol;
      calc.debit_amount = debitAmt;
    }

    setResults({
      startD20: sD20,
      startFactor: sFactor,
      finalD20: fD20,
      finalFactor: fFactor,
      meteredTotal,
      startVol20: calc.start_vol20,
      finalVol20: calc.final_vol20,
      lossVolume: calc.loss_volume,
      allowedLossVolume: calc.allowed_loss_volume,
      allowedLoss2dp: calc.allowed_loss_2dp,
      debitVolume: calc.debit_volume,
      debitAmount: calc.debit_amount,
    });
  };

  useEffect(() => {
    runCalculation();
  }, [
    startObservedLitres,
    startDensity,
    startTemp,
    originVol20,
    finalDensity,
    finalTemp,
    finalObservedLitres,
    mTo1,
    mFrom1,
    drained1,
    mTo2,
    mFrom2,
    drained2,
    useMetered,
    allowableLossPct,
    pricePerLitre,
  ]);

  // Truck Change
  const handleTruckChange = (plate: string) => {
    setSelectedPlate(plate);
    const truck = initialTrucks.find((t) => t.plate_no === plate);
    if (!truck) return;

    setTrailerPlate(truck.trailer_plate_no || '');
    setCarrierName(truck.carrier_name || 'TAF Oil Fleet');
    setDriverName(truck.driver_name || '');
    setDriverLicence(truck.driver_licence_no || '');
    setTruckCapacity(truck.total_capacity || 45000);
    setCompartmentCount(truck.compartment_count || 5);

    const cleanDate = orderDate.replace(/-/g, '');
    setToNumber(`TO-${cleanDate}-${truck.plate_no.split('/')[0]}`);
  };

  // Product Change
  const handleProductChange = (code: string) => {
    setProductCode(code);
    const p = initialProducts.find((prod) => prod.item_number === code);
    if (!p) return;
    setProductName(p.product_name);
    setAllowableLossPct(p.allowable_loss_percent);
    setPricePerLitre(p.price_per_litre);
  };

  // Compartment Dip Change with server API interpolation
  const handleDipChange = async (compIndex: number, mm: number) => {
    const newDips = [...dips];
    newDips[compIndex] = mm;
    setDips(newDips);

    if (mm <= 0) {
      const newVols = [...compVols];
      newVols[compIndex] = 0;
      setCompVols(newVols);
      setStartObservedLitres(newVols.reduce((a, b) => a + b, 0));
      return;
    }

    try {
      const res = await fetch(
        `/api/calculate-dip?plate=${encodeURIComponent(selectedPlate)}&comp=${compIndex + 1}&dip=${mm}`
      );
      if (res.ok) {
        const data = await res.json();
        const newVols = [...compVols];
        newVols[compIndex] = data.litres;
        setCompVols(newVols);
        setStartObservedLitres(newVols.reduce((a, b) => a + b, 0));
      }
    } catch (err) {
      console.error('Error fetching dip volume:', err);
    }
  };

  // Load Presets
  const loadPreset1 = () => {
    handleTruckChange('FDC-99995/10444');
    setToNumber('TO-20261026-FDC99995');
    setOrderDate('2026-10-26');
    setReference('FDC-99995');
    setCarrierName('TAF Fleet Logistics');
    setDriverName('Mohammed Ahmed');
    setDriverLicence('DL-78901');

    handleProductChange('P07-0001');

    const presetDips = [1420, 1910, 2750, 4420, 0];
    const presetVols = [11420, 11910, 12750, 14420, 0];
    setDips(presetDips);
    setCompVols(presetVols);
    setStartObservedLitres(presetVols.reduce((a, b) => a + b, 0));

    setStartDensity(789.0);
    setStartTemp(19.5);
    setOriginVol20(48710);

    setMTo1(162856152);
    setMFrom1(162807512);
    setDrained1(0);
    setMTo2(0);
    setMFrom2(0);
    setDrained2(0);

    setSgDj1(0.7916);
    setSgDj2(0.7923);
  };

  const loadPreset2 = () => {
    handleTruckChange('A40983/ET9981');
    setToNumber('TO-20261026-A40983');
    setOrderDate('2026-10-26');
    setReference('ET-WAY-8841');
    setCarrierName('National Petroleum Transport');
    setDriverName('Kebede Tadesse');
    setDriverLicence('DL-55219');

    handleProductChange('P07-0002');

    const presetDips = [1395, 1850, 2667, 4381, 0];
    const presetVols = [11395, 11850, 12667, 14381, 0];
    setDips(presetDips);
    setCompVols(presetVols);
    setStartObservedLitres(presetVols.reduce((a, b) => a + b, 0));

    setStartDensity(787.0);
    setStartTemp(20.0);
    setOriginVol20(49829);

    setMTo1(162906459);
    setMFrom1(162856672);
    setDrained1(0);
    setMTo2(0);
    setMFrom2(0);
    setDrained2(0);

    setSgDj1(0.7916);
    setSgDj2(0.7907);
  };

  const sgDiff = (Number(sgDj1) || 0) - (Number(sgDj2) || 0);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return initialOrders;
    const q = orderSearch.toLowerCase();
    return initialOrders.filter(
      (o) =>
        o.to_number.toLowerCase().includes(q) ||
        o.plate_no.toLowerCase().includes(q) ||
        (o.driver_name && o.driver_name.toLowerCase().includes(q)) ||
        (o.reference && o.reference.toLowerCase().includes(q))
    );
  }, [initialOrders, orderSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Application Global Nav Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-lg shadow-sm">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                TAF OIL ETHIOPIA PLC
              </h1>
              <Badge variant="outline" className="text-[10px] bg-slate-50 font-bold border-slate-300">
                Depot Operations OS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Petroleum Transhipment &amp; ASTM 54B/D Automated Calibration System
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2 flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
              Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                loadPreset1();
                setActiveTab('workbench');
              }}
              className="text-xs h-7 bg-white dark:bg-slate-900 font-semibold"
            >
              Photo 1 (FDC-99995)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                loadPreset2();
                setActiveTab('workbench');
              }}
              className="text-xs h-7 bg-white dark:bg-slate-900 font-semibold ml-1"
            >
              Photo 2 (A40983)
            </Button>
          </div>

          <Link href="/tables">
            <Button variant="secondary" size="sm" className="h-8 gap-1.5 font-semibold text-xs border border-slate-200">
              <Database className="w-3.5 h-3.5" />
              <span>Database Tables</span>
            </Button>
          </Link>

          <Link href="/login">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 font-semibold text-xs">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Operator Profile</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Flash Alert */}
      {alertMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl shadow-sm text-sm flex items-center justify-between">
          <div className="flex items-center space-x-3 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{alertMsg}</span>
          </div>
          <button
            onClick={() => setAlertMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Dashboard Headline Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Operations Dashboard
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Monitor Djibouti-to-Addis transhipments, ASTM 54B/D volume correction, and shortage claims.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setActiveTab('workbench')}
            className="gap-1.5 font-semibold shadow-sm"
          >
            <Calculator className="w-4 h-4" />
            <span>New Transhipment Order</span>
          </Button>
          <Link
            href={`/debit-note/preview?to_number=${encodeURIComponent(
              toNumber || 'PREVIEW'
            )}&plate_no=${encodeURIComponent(selectedPlate)}&product_item_number=${encodeURIComponent(
              productCode
            )}&driver_name=${encodeURIComponent(driverName)}&carrier_name=${encodeURIComponent(
              carrierName
            )}&origin_vol20=${originVol20 || results.startVol20}&start_observed_litres=${startObservedLitres}&start_temp=${startTemp}&start_density=${startDensity}&start_vol20=${results.startVol20}&final_vol20=${results.finalVol20}&loss_volume=${results.lossVolume}&allowable_loss_percent=${allowableLossPct}&allowed_loss_volume=${results.allowedLossVolume}&allowed_loss_2dp=${results.allowedLoss2dp}&debit_volume=${results.debitVolume}&price_per_litre=${pricePerLitre}&debit_amount=${results.debitAmount}&order_date=${orderDate}`}
            target="_blank"
          >
            <Button variant="outline" size="sm" className="gap-1.5 font-semibold bg-white">
              <Printer className="w-4 h-4" />
              <span>Preview Voucher</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards (The Shadcn Dashboard Metric Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card 1: Active Fleet */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Calibrated Fleet
            </CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-md">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {kpiStats.fleetCount} Trucks
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                100% Calibrated
              </Badge>
              <p className="text-xs text-muted-foreground">
                65 Compartments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI Card 2: Total Volume Monitored */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Volume @ 20°C Monitored
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-md">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {Math.round(kpiStats.totalVol20).toLocaleString()} L
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] font-semibold">
                ASTM 54B/D
              </Badge>
              <p className="text-xs text-muted-foreground">
                {kpiStats.ordersCount} Transfer Orders
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI Card 3: Shortage Loss Audit */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Claimed Shortage Volume
            </CardTitle>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-md">
              <Scale className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-700">
              {kpiStats.totalDebitVolume.toFixed(2)} L
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="destructive" className="text-[10px] font-semibold">
                Excess Loss
              </Badge>
              <p className="text-xs text-muted-foreground">
                Allowance: {allowableLossPct}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI Card 4: Debit Amount Payable */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Shortage Debited
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-md">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-900">
              {kpiStats.totalDebitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[10px] font-mono text-slate-700 bg-amber-50/60 border-amber-300">
                Sage 300 GL 122010
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <TabsList className="bg-slate-100 p-1 border border-slate-200">
            <TabsTrigger value="workbench" className="gap-2">
              <Calculator className="h-3.5 w-3.5" />
              <span>Transhipment Workbench</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <History className="h-3.5 w-3.5" />
              <span>Recent Orders ({initialOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Truck className="h-3.5 w-3.5" />
              <span>Fleet Registry ({initialTrucks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tariffs" className="gap-2">
              <Database className="h-3.5 w-3.5" />
              <span>Tariffs &amp; ASTM 54B</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'orders' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search orders, plates, drivers..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>
          )}
        </div>

        {/* TAB 1: WORKBENCH */}
        <TabsContent value="workbench" className="space-y-6 pt-2">
          {/* Main Order Form */}
          <form method="POST" action="/api/transfer-orders" className="space-y-6">
            {/* Section 1: Order Routing & Metadata */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-800">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      Order Identification &amp; Routing
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Supply origin terminal, destination depot, order sequence number, and Djibouti waybill reference.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                    {orderDate}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Ship From */}
                <div className="md:col-span-4 space-y-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-800 font-bold">Origin Storage Point</Label>
                    <Badge variant="secondary" className="text-[10px]">Supply</Badge>
                  </div>
                  <Input
                    type="text"
                    name="ship_from_storage_point"
                    value={shipFromStorage}
                    onChange={(e) => setShipFromStorage(e.target.value)}
                    className="font-medium uppercase"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Dispatch Date</Label>
                      <Input
                        type="date"
                        name="ship_from_date"
                        value={shipFromDate}
                        onChange={(e) => setShipFromDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Location</Label>
                      <Input
                        type="text"
                        name="ship_from_loc"
                        value={shipFromLoc}
                        onChange={(e) => setShipFromLoc(e.target.value)}
                        className="uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* TO Number & Waybill */}
                <div className="md:col-span-4 space-y-3 bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-amber-950 font-bold">Transfer Order Ref</Label>
                    <Badge variant="warning" className="text-[10px]">Active Order</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Order Number</Label>
                      <Input
                        type="text"
                        name="to_number"
                        value={toNumber || `TO-${orderDate.replace(/-/g, '')}-${selectedPlate.split('/')[0] || 'TRK'}`}
                        onChange={(e) => setToNumber(e.target.value)}
                        required
                        yellowHighlight
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Order Date</Label>
                      <Input
                        type="date"
                        name="order_date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">Djibouti Waybill Ref</Label>
                    <Input
                      type="text"
                      name="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. FDC-99995"
                      className="font-bold text-indigo-950"
                    />
                  </div>
                </div>

                {/* Ship To */}
                <div className="md:col-span-4 space-y-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-800 font-bold">Destination Depot</Label>
                    <Badge variant="secondary" className="text-[10px]">Discharge</Badge>
                  </div>
                  <Input
                    type="text"
                    name="ship_to_depot"
                    value={shipToDepot}
                    onChange={(e) => setShipToDepot(e.target.value)}
                    className="font-medium uppercase"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Arrival Date</Label>
                      <Input
                        type="date"
                        name="ship_to_date"
                        value={shipToDate}
                        onChange={(e) => setShipToDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Location</Label>
                      <Input
                        type="text"
                        name="ship_to_loc"
                        value={shipToLoc}
                        onChange={(e) => setShipToLoc(e.target.value)}
                        className="uppercase"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Fleet, Driver & Product Configuration */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-800">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Fleet, Transporter &amp; Product Specification
                </CardTitle>
                <CardDescription className="text-xs">
                  Vehicle plate calibration mapping, assigned driver credentials, and contract product tariff.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Truck Selector */}
                <div className="md:col-span-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-900 font-bold">1. Truck Plate Selector</Label>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {Number(truckCapacity).toLocaleString()} L ({compartmentCount} Comps)
                    </Badge>
                  </div>
                  <select
                    value={selectedPlate}
                    onChange={(e) => handleTruckChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    {initialTrucks.map((t) => (
                      <option key={t.plate_no} value={t.plate_no}>
                        {t.plate_no} — {t.carrier_name || 'Fleet'} ({t.driver_name || 'Driver N/A'})
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="plate_no" value={selectedPlate} />
                  <input type="hidden" name="trailer_plate_no" value={trailerPlate} />
                  <input type="hidden" name="carrier_name" value={carrierName} />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Trailer Plate</Label>
                      <Input type="text" value={trailerPlate} readOnly className="bg-slate-100 font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Transporter</Label>
                      <Input type="text" value={carrierName} readOnly className="bg-slate-100 font-medium text-xs" />
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="md:col-span-4 space-y-3">
                  <Label className="text-slate-900 font-bold">2. Driver Credentials</Label>
                  <div>
                    <Label className="text-[10px]">Driver Full Name</Label>
                    <Input
                      type="text"
                      name="driver_name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Driver Licence Number</Label>
                    <Input
                      type="text"
                      name="driver_licence_no"
                      value={driverLicence}
                      onChange={(e) => setDriverLicence(e.target.value)}
                      className="font-mono text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Product & Tariffs */}
                <div className="md:col-span-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-900 font-bold">3. Product &amp; Tariffs</Label>
                    <Badge variant="outline" className="font-mono text-primary font-bold">
                      {productCode}
                    </Badge>
                  </div>
                  <select
                    value={productCode}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    {initialProducts.map((p) => (
                      <option key={p.item_number} value={p.item_number}>
                        {p.product_name} ({p.item_number}) - Loss {p.allowable_loss_percent}%
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="product_item_number" value={productCode} />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Allowable Loss %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        name="allowable_loss_percent"
                        value={allowableLossPct}
                        onChange={(e) => setAllowableLossPct(Number(e.target.value))}
                        yellowHighlight
                        className="text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Price / Litre (ETB)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        name="price_per_litre"
                        value={pricePerLitre}
                        onChange={(e) => setPricePerLitre(Number(e.target.value))}
                        yellowHighlight
                        className="text-right font-mono"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: 5-Compartment Dip Calibration Panel */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-800">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Compartment Dips &amp; Calibrated Volumes (mm &rarr; Litres)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Straight-line linear interpolation against truck calibration chart points.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Total Dip: {startObservedLitres.toLocaleString()} L
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="font-bold text-xs text-slate-700">Comp #{idx + 1}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {compVols[idx] > 0 ? `${compVols[idx]} L` : 'Empty'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-[10px]">Dip (mm)</Label>
                        <Input
                          type="number"
                          value={dips[idx] || ''}
                          onChange={(e) => handleDipChange(idx, Number(e.target.value))}
                          placeholder="0"
                          className="font-mono font-bold text-right"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Volume (L)</Label>
                        <Input
                          type="number"
                          value={compVols[idx] || ''}
                          readOnly
                          className="bg-white font-mono font-semibold text-right text-indigo-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Origin Waybill vs Discharge Metering */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Origin Side */}
              <Card className="md:col-span-6">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>Origin Measurements</span>
                    <Badge variant="outline" className="text-[10px]">Horizon Waybill</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px]">Observed Litres</Label>
                      <Input
                        type="number"
                        name="start_observed_litres"
                        value={startObservedLitres}
                        onChange={(e) => setStartObservedLitres(Number(e.target.value))}
                        required
                        className="font-bold text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Obs Density (kg/m³)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        name="start_density"
                        value={startDensity}
                        onChange={(e) => setStartDensity(Number(e.target.value))}
                        required
                        className="font-bold text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Obs Temp (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        name="start_temperature"
                        value={startTemp}
                        onChange={(e) => setStartTemp(Number(e.target.value))}
                        required
                        className="font-bold text-right font-mono"
                      />
                    </div>
                  </div>

                  {/* ASTM 54B Calculated Grid */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <Label className="text-[10px]">ASTM Density @ 20°C</Label>
                      <Input
                        type="text"
                        value={results.startD20.toFixed(2)}
                        readOnly
                        className="bg-white text-right font-mono font-bold text-indigo-900"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">VCF Factor (20°C)</Label>
                      <Input
                        type="text"
                        value={results.startFactor.toFixed(6)}
                        readOnly
                        className="bg-white text-right font-mono font-bold text-indigo-900"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Calculated Vol 20</Label>
                      <Input
                        type="text"
                        value={Math.round(startObservedLitres ? results.startVol20 : 0).toLocaleString()}
                        readOnly
                        className="bg-white text-right font-mono font-bold text-indigo-900"
                      />
                    </div>
                  </div>

                  {/* Priority Waybill Origin Vol 20 */}
                  <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-amber-950 font-bold">
                        Origin Vol @ 20°C (Djibouti Waybill Specified)
                      </Label>
                      <Badge variant="warning" className="text-[9px]">Priority Base</Badge>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      name="origin_vol20"
                      value={originVol20}
                      onChange={(e) => setOriginVol20(e.target.value ? Number(e.target.value) : '')}
                      placeholder="48710"
                      yellowHighlight
                      className="text-right font-mono font-black text-base"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Discharge Side */}
              <Card className="md:col-span-6">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Discharge &amp; Meter Readings
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="use_metered_check"
                        name="use_metered"
                        value="1"
                        checked={useMetered}
                        onChange={(e) => setUseMetered(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <Label htmlFor="use_metered_check" className="text-xs cursor-pointer">
                        Use Meters
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {/* Meter 1 */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase block">Meter Line #1</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">To Reading</Label>
                        <Input
                          type="number"
                          name="meter_to_1"
                          value={mTo1}
                          onChange={(e) => setMTo1(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">From Reading</Label>
                        <Input
                          type="number"
                          name="meter_from_1"
                          value={mFrom1}
                          onChange={(e) => setMFrom1(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Drained (L)</Label>
                        <Input
                          type="number"
                          name="drained_1"
                          value={drained1}
                          onChange={(e) => setDrained1(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Meter 2 */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase block">Meter Line #2</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">To Reading</Label>
                        <Input
                          type="number"
                          name="meter_to_2"
                          value={mTo2}
                          onChange={(e) => setMTo2(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">From Reading</Label>
                        <Input
                          type="number"
                          name="meter_from_2"
                          value={mFrom2}
                          onChange={(e) => setMFrom2(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Drained (L)</Label>
                        <Input
                          type="number"
                          name="drained_2"
                          value={drained2}
                          onChange={(e) => setDrained2(e.target.value ? Number(e.target.value) : '')}
                          className="text-right font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metered Total */}
                  <div className="flex justify-between items-center bg-indigo-50/70 border border-indigo-200 p-3 rounded-lg">
                    <div>
                      <span className="text-xs font-bold uppercase text-indigo-950 block">
                        Discharge Metered Total:
                      </span>
                      <span className="text-[10px] text-indigo-700">Sum (Line 1 + Line 2)</span>
                    </div>
                    <span className="font-mono font-black text-lg text-indigo-900">
                      {results.meteredTotal.toLocaleString()} L
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 5: SG @ 15 Djibouti Analysis */}
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Label className="text-slate-900 font-bold">SG @ 15 Djibouti Analysis:</Label>
                  <span className="text-xs text-muted-foreground">Sample 1 vs Sample 2 Difference Verification</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5">
                    <Label className="text-xs">SG 1:</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      name="sg_15_dj_1"
                      value={sgDj1}
                      onChange={(e) => setSgDj1(e.target.value ? Number(e.target.value) : '')}
                      className="w-24 text-right font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Label className="text-xs">SG 2:</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      name="sg_15_dj_2"
                      value={sgDj2}
                      onChange={(e) => setSgDj2(e.target.value ? Number(e.target.value) : '')}
                      className="w-24 text-right font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Label className="text-xs">Diff:</Label>
                    <Badge
                      variant={sgDiff < 0 ? 'destructive' : 'success'}
                      className="font-mono font-bold text-xs"
                    >
                      {sgDiff > 0 ? '+' : ''}
                      {sgDiff.toFixed(4)}
                    </Badge>
                    <input type="hidden" name="sg_15_diff" value={sgDiff.toFixed(4)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Real-Time Shortage & Debit Evaluation Banner */}
            <Card className="bg-slate-950 text-white border-slate-800 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-amber-400">
                      Live Shortage &amp; Debit Evaluation Engine
                    </CardTitle>
                  </div>
                  <div>
                    {results.lossVolume > 150 ? (
                      <Badge variant="destructive" className="font-bold text-xs">
                        Branch 2 (&gt; 150 L): Full loss debited (No Allowance)
                      </Badge>
                    ) : results.debitVolume > 0 ? (
                      <Badge variant="warning" className="font-bold text-xs text-amber-950 bg-amber-400">
                        Branch 1 (&le; 150 L): Excess &ge; 0.5 L Buffer Applied
                      </Badge>
                    ) : (
                      <Badge variant="success" className="font-bold text-xs">
                        No Debit (Loss &le; Allowed Tolerance)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Origin Vol @ 20°C</span>
                    <span className="font-mono text-base font-black text-white">
                      {Math.round(results.startVol20).toLocaleString()} L
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Discharge Vol @ 20°C</span>
                    <span className="font-mono text-base font-black text-white">
                      {Math.round(results.finalVol20).toLocaleString()} L
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Physical Shortage</span>
                    <span className="font-mono text-base font-black text-amber-400">
                      {results.lossVolume.toFixed(2)} L
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Contract Tolerance ({allowableLossPct}%)
                    </span>
                    <span className="font-mono text-base font-bold text-slate-300">
                      {results.allowedLossVolume} L ({results.allowedLoss2dp})
                    </span>
                  </div>

                  <div className="bg-rose-950/80 p-3 rounded-lg border border-rose-800">
                    <span className="text-[10px] text-rose-300 uppercase font-bold block">Shortage Claimed</span>
                    <span className="font-mono text-xl font-black text-rose-400">
                      {results.debitVolume.toFixed(2)} L
                    </span>
                  </div>

                  <div className="bg-amber-950/80 p-3 rounded-lg border border-amber-600">
                    <span className="text-[10px] text-amber-300 uppercase font-bold block">Total Payable (ETB)</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {results.debitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 7: Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <Button
                  type="submit"
                  variant="emerald"
                  size="default"
                  className="gap-2 font-bold shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Transhipment Order</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={runCalculation}
                  className="gap-1.5 font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recalculate</span>
                </Button>
              </div>

              <div>
                <Link
                  href={`/debit-note/preview?to_number=${encodeURIComponent(
                    toNumber || 'PREVIEW'
                  )}&plate_no=${encodeURIComponent(selectedPlate)}&product_item_number=${encodeURIComponent(
                    productCode
                  )}&driver_name=${encodeURIComponent(driverName)}&carrier_name=${encodeURIComponent(
                    carrierName
                  )}&origin_vol20=${originVol20 || results.startVol20}&start_observed_litres=${startObservedLitres}&start_temp=${startTemp}&start_density=${startDensity}&start_vol20=${results.startVol20}&final_vol20=${results.finalVol20}&loss_volume=${results.lossVolume}&allowable_loss_percent=${allowableLossPct}&allowed_loss_volume=${results.allowedLossVolume}&allowed_loss_2dp=${results.allowedLoss2dp}&debit_volume=${results.debitVolume}&price_per_litre=${pricePerLitre}&debit_amount=${results.debitAmount}&order_date=${orderDate}`}
                  target="_blank"
                >
                  <Button variant="indigo" size="default" className="gap-2 font-bold shadow-md">
                    <Printer className="w-4 h-4" />
                    <span>Print / Preview Debit Note Voucher</span>
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: RECENT ORDERS */}
        <TabsContent value="orders" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Recent Transhipment Orders &amp; Debit Notes
                </CardTitle>
                <CardDescription className="text-xs">
                  Review calculated loss volumes, shortage allowances, and issued debit notes.
                </CardDescription>
              </div>
              <Link href="/tables?table=transfer_orders">
                <Button variant="ghost" size="sm" className="text-xs gap-1 font-semibold text-primary">
                  <span>Full Table View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Origin (L@20°)</TableHead>
                    <TableHead className="text-right">Final (L@20°)</TableHead>
                    <TableHead className="text-right">Loss (L)</TableHead>
                    <TableHead className="text-right">Debit (L)</TableHead>
                    <TableHead className="text-right">Payable (ETB)</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        No transhipment orders found matching "{orderSearch}".
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((ord) => (
                      <TableRow key={ord.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-bold text-primary font-mono text-xs">
                          {ord.to_number}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">
                          {ord.order_date}
                        </TableCell>
                        <TableCell className="font-semibold text-xs uppercase font-mono">
                          {ord.plate_no}
                        </TableCell>
                        <TableCell className="text-xs">
                          {ord.driver_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(ord.start_vol20).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(ord.final_vol20).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {Number(ord.loss_volume).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-rose-700">
                          {Number(ord.debit_volume).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-amber-900">
                          {Number(ord.debit_amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/debit-note/${ord.to_number}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold gap-1 bg-white">
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>Voucher</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: FLEET REGISTRY */}
        <TabsContent value="fleet" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialTrucks.map((truck) => (
              <Card key={truck.plate_no} className="shadow-sm border-slate-200 hover:border-primary/40 transition">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base font-black font-mono text-slate-900">
                      {truck.plate_no}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium">
                      Trailer: {truck.trailer_plate_no || 'N/A'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    {truck.compartment_count} Comps
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier:</span>
                    <span className="font-semibold text-slate-800">{truck.carrier_name || 'TAF Oil Fleet'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-semibold text-slate-800">{truck.driver_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Licence No:</span>
                    <span className="font-mono">{truck.driver_licence_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-muted-foreground font-semibold">Total Capacity:</span>
                    <span className="font-mono font-black text-primary text-sm">
                      {Number(truck.total_capacity).toLocaleString()} L
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5"
                    onClick={() => {
                      handleTruckChange(truck.plate_no);
                      setActiveTab('workbench');
                    }}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Select for Order Workbench</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: TARIFFS & ASTM 54B */}
        <TabsContent value="tariffs" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {initialProducts.map((prod) => (
              <Card key={prod.item_number} className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-black text-slate-900">
                      {prod.product_name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {prod.item_number}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                      Contract Allowable Loss
                    </span>
                    <span className="font-mono text-xl font-black text-slate-900">
                      {prod.allowable_loss_percent}%
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                      Tariff Rate (Price / L)
                    </span>
                    <span className="font-mono text-lg font-black text-amber-900">
                      {Number(prod.price_per_litre).toFixed(2)} ETB
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    Shortage claims apply Branch 1 buffer (&le;150L) or full loss debit (&gt;150L).
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                ASTM 54B/D Standard Reference Calibration Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Pre-seeded standard petroleum correction tables operating inside Node.js SQLite.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-700">
              <p>
                The ASTM 54B &amp; 54D correction algorithms standardize observed volume at any operational temperature and density to standard standard <strong>20°C</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-xs text-slate-600 pl-2">
                <li>Density @ 20°C Matrix: 770.0 kg/m³ to 840.0 kg/m³ with straight-line interpolation</li>
                <li>VCF Factor Matrix: Volume Correction Factor calculated via <code>VCF = exp(-α * ΔT * (1 + 0.8 * α * ΔT))</code></li>
                <li>GL Accounting Coding: Dr 122010-100 (Transporter Receivables) / Cr 161022 (Inventory Loss Recovery)</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
