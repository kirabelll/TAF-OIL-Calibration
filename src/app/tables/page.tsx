import { getDb, getTableCounts, toPlain } from '@/lib/db';
import TablesClient from './tables-client';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  const db = getDb();

  const trucks = toPlain(db.prepare('SELECT * FROM truck_headers ORDER BY plate_no ASC').all()) as any[];
  const calibrations = toPlain(db.prepare('SELECT * FROM truck_calibrations ORDER BY plate_no ASC, compartment_no ASC, dip_mm ASC').all()) as any[];
  const products = toPlain(db.prepare('SELECT * FROM allowable_loss_products ORDER BY item_number ASC').all()) as any[];
  const orders = toPlain(db.prepare('SELECT * FROM transfer_orders ORDER BY id DESC').all()) as any[];
  const debitNotes = toPlain(db.prepare('SELECT * FROM transfer_orders WHERE debit_volume > 0 ORDER BY id DESC').all()) as any[];
  const densitySample = toPlain(db.prepare('SELECT * FROM density_correct_20 ORDER BY observed_density ASC, temperature ASC LIMIT 100').all()) as any[];
  const factorSample = toPlain(db.prepare('SELECT * FROM factor_correct_20 ORDER BY temperature ASC, density_20 ASC LIMIT 100').all()) as any[];

  const counts = getTableCounts();

  return (
    <main className="p-3 md:p-6 bg-slate-200 min-h-screen dark:bg-slate-950">
      <TablesClient
        trucks={trucks}
        calibrations={calibrations}
        products={products}
        orders={orders}
        debitNotes={debitNotes}
        densitySample={densitySample}
        factorSample={factorSample}
        tableCounts={counts}
      />
    </main>
  );
}
