import React from 'react';
import { getAllProducts, getAllTrucks, getAllTransferOrders } from '@/lib/db';
import DashboardLayout from '@/components/dashboard-layout';
import TranshipmentDashboard from '@/app/dashboard-client';

export const dynamic = 'force-dynamic';

export default async function WorkbenchPage() {
  const products = getAllProducts();
  const trucks = getAllTrucks();
  const allOrders = getAllTransferOrders();

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
    <DashboardLayout>
      <div className="space-y-6">
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
      </div>
    </DashboardLayout>
  );
}
