import { getAllProducts, getAllTrucks, getAllTransferOrders } from '@/lib/db';
import TranshipmentDashboard from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = getAllProducts();
  const trucks = getAllTrucks();
  const allOrders = getAllTransferOrders();

  // Aggregate Fleet & Operations KPIs
  const fleetCount = trucks.length;
  const ordersCount = allOrders.length;
  const totalVol20 = allOrders.reduce(
    (sum, o) => sum + (Number(o.start_vol20) || 0),
    0
  );
  const totalDebitVolume = allOrders.reduce(
    (sum, o) => sum + (Number(o.debit_volume) || 0),
    0
  );
  const totalDebitAmount = allOrders.reduce(
    (sum, o) => sum + (Number(o.debit_amount) || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50/60 pb-12 dark:bg-slate-950">
      <TranshipmentDashboard
        initialProducts={products}
        initialTrucks={trucks}
        initialOrders={allOrders}
        kpiStats={{
          fleetCount,
          ordersCount,
          totalVol20,
          totalDebitVolume,
          totalDebitAmount,
        }}
      />
    </main>
  );
}
