'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, Fuel, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function DebitNotePreviewContent() {
  const searchParams = useSearchParams();

  const toNumber = searchParams.get('to_number') || 'PREVIEW-VOUCHER';
  const orderDate = searchParams.get('order_date') || new Date().toISOString().split('T')[0];
  const plateNo = searchParams.get('plate_no') || 'A03843/*29988';
  const trailerPlateNo = searchParams.get('trailer_plate_no') || 'N/A';
  const carrierName = searchParams.get('carrier_name') || 'TAF Oil Fleet';
  const driverName = searchParams.get('driver_name') || 'N/A';
  const driverLicenceNo = searchParams.get('driver_licence_no') || 'N/A';
  const productCode = searchParams.get('product_item_number') || 'P07-0001';

  const startObservedLitres = Number(searchParams.get('start_observed_litres') || 48000);
  const startTemp = Number(searchParams.get('start_temp') || 19.5);
  const startDensity20 = Number(searchParams.get('start_density') || 788.6);
  const startFactor = Number(searchParams.get('start_factor') || 1.0005);
  const startVol20 = Number(searchParams.get('origin_vol20') || searchParams.get('start_vol20') || 48710);

  const finalVol20 = Number(searchParams.get('final_vol20') || 48640);
  const lossVolume = Number(searchParams.get('loss_volume') || 70);
  const allowableLossPct = Number(searchParams.get('allowable_loss_percent') || 0.12);
  const allowedLossVol = Number(searchParams.get('allowed_loss_volume') || 58);
  const allowedLoss2dp = Number(searchParams.get('allowed_loss_2dp') || 58.45);
  const debitVolume = Number(searchParams.get('debit_volume') || 11.55);
  const pricePerLitre = Number(searchParams.get('price_per_litre') || 319.76);
  const debitAmount = Number(searchParams.get('debit_amount') || 3693.23);

  const isBranch2 = lossVolume > 150;

  return (
    <div className="bg-slate-100 text-slate-900 min-h-screen p-4 md:p-10 font-sans antialiased">
      {/* Top Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
        <Button variant="outline" size="sm" asChild className="gap-2 bg-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </Button>
        <Button
          onClick={() => window.print()}
          className="gap-2 font-semibold shadow-sm"
        >
          <Printer className="h-4 w-4" />
          <span>Print Debit Note</span>
        </Button>
      </div>

      {/* Printable Debit Note Sheet */}
      <Card className="max-w-4xl mx-auto bg-white p-6 md:p-12 shadow-md border-slate-200 print-card space-y-8">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-6 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold uppercase px-2.5 py-1 rounded-md mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
            <span>PREVIEW MODE — LIVE UNCOMMITTED VALUES</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Fuel className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-slate-900">
              TAF OIL ETHIOPIA PLC
            </h1>
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Petroleum Product Shortage &amp; Debit Note Voucher
          </p>
          <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground font-mono">
            <Badge variant="outline" className="font-mono text-[10px] font-normal">
              MS Access RPTtempdebitnote Replacement
            </Badge>
          </div>
        </div>

        {/* Meta Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Debit Note No:
              </span>
              <strong className="font-mono text-base text-primary">
                DN-{toNumber}
              </strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Transfer Order Ref:
              </span>
              <span className="font-mono font-medium">{toNumber}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Transaction Date:
              </span>
              <span className="font-medium">{orderDate}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Truck Plate Number:
              </span>
              <strong className="font-mono text-base uppercase text-slate-900">
                {plateNo}
              </strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Trailer Plate:
              </span>
              <span className="font-mono font-medium">{trailerPlateNo}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Carrier / Transporter:
              </span>
              <span className="font-semibold text-slate-800">{carrierName}</span>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Driver Name:
              </span>
              <span className="font-bold text-slate-900">{driverName}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Driver Licence No:
              </span>
              <span className="font-mono font-semibold">{driverLicenceNo}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-bold block">
                Product Code:
              </span>
              <Badge variant="secondary" className="font-mono font-semibold">
                {productCode}
              </Badge>
            </div>
          </div>
        </div>

        {/* Measurements Breakdown Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold uppercase text-xs text-slate-700">Delivery Stage</TableHead>
                <TableHead className="font-bold uppercase text-xs text-slate-700 text-right">Observed (L)</TableHead>
                <TableHead className="font-bold uppercase text-xs text-slate-700 text-right">Temp (°C)</TableHead>
                <TableHead className="font-bold uppercase text-xs text-slate-700 text-right">Density @ 20°C</TableHead>
                <TableHead className="font-bold uppercase text-xs text-slate-700 text-right">VCF (20°C)</TableHead>
                <TableHead className="font-bold uppercase text-xs text-slate-700 text-right">Volume @ 20°C (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              <TableRow>
                <TableCell className="font-sans font-semibold">1. Origin / Truck Dip</TableCell>
                <TableCell className="text-right">
                  {startObservedLitres.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">{startTemp.toFixed(1)}</TableCell>
                <TableCell className="text-right">{startDensity20.toFixed(1)}</TableCell>
                <TableCell className="text-right">{startFactor.toFixed(6)}</TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {startVol20.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-semibold">2. Destination / Discharge</TableCell>
                <TableCell className="text-right">
                  {finalVol20.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">20.0</TableCell>
                <TableCell className="text-right">789.0</TableCell>
                <TableCell className="text-right">1.000000</TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {finalVol20.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Shortage & Debit Calculation Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">
              Physical Loss (|Start Vol20 - Final Vol20|):
            </span>
            <span className="font-mono font-bold text-slate-900">
              {lossVolume.toFixed(2)} L
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">
              Contract Allowable Loss ({allowableLossPct}%):
            </span>
            <span className="font-mono text-slate-700">
              {allowedLossVol} L ({allowedLoss2dp.toFixed(2)})
            </span>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-sm pt-1">
            <div>
              <span className="font-bold text-destructive block">
                Shortage Claimed (Debit Volume):
              </span>
              <span className="text-xs text-muted-foreground">
                {isBranch2
                  ? 'Branch 2 (> 150 L): Entire loss debited with no allowance deducted.'
                  : 'Branch 1 (≤ 150 L): Excess ≥ 0.5 L buffer applied.'}
              </span>
            </div>
            <span className="font-mono font-black text-xl text-destructive">
              {debitVolume.toFixed(2)} L
            </span>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-muted-foreground font-medium">
              Tariff Rate (Price per Litre):
            </span>
            <span className="font-mono text-slate-900 font-semibold">
              {pricePerLitre.toFixed(2)} ETB / L
            </span>
          </div>

          <div className="flex justify-between items-center text-lg bg-amber-50 p-4 rounded-lg border border-amber-300">
            <span className="font-black text-slate-900 uppercase tracking-wide text-sm md:text-base">
              Total Amount Payable:
            </span>
            <span className="font-mono font-black text-2xl text-amber-900">
              {debitAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ETB
            </span>
          </div>
        </div>

        {/* GL Coding */}
        <div className="border border-slate-200 rounded-lg p-4 text-xs font-mono space-y-1.5 bg-slate-50/50">
          <div className="flex items-center gap-1.5 font-sans font-bold text-slate-700 uppercase tracking-wider mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Sage 300 GL Coding:</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-800">Dr 122010-100 (Transporter Receivables)</span>
            <span className="font-bold">{debitAmount.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Cr 161022 (Inventory Loss Recovery)</span>
            <span>{debitAmount.toFixed(2)} ETB</span>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-8 pt-8 text-xs text-center">
          <div className="border-t border-slate-400 pt-3">
            <p className="font-bold text-slate-800">Prepared By</p>
            <p className="text-muted-foreground mt-6">Signature &amp; Date</p>
          </div>
          <div className="border-t border-slate-400 pt-3">
            <p className="font-bold text-slate-800">Verified By</p>
            <p className="text-muted-foreground mt-6">Depot Supervisor</p>
          </div>
          <div className="border-t border-slate-400 pt-3">
            <p className="font-bold text-slate-800">Transporter / Driver</p>
            <p className="text-muted-foreground mt-6">Acknowledged &amp; Signed</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function DebitNotePreviewPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-muted-foreground">Loading debit note preview...</div>}>
      <DebitNotePreviewContent />
    </Suspense>
  );
}
