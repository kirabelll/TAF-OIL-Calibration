import React from 'react';
import { getAllProducts, getAllTrucks, getAllTransferOrders } from '@/lib/db';
import DashboardLayout from '@/components/dashboard-layout';
import OperationsDashboard from '@/components/operations-dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = getAllProducts();
  const trucks = getAllTrucks();
  const allOrders = getAllTransferOrders();

  return (
    <DashboardLayout>
      <OperationsDashboard
        initialOrders={allOrders}
        products={products}
        trucks={trucks}
      />
    </DashboardLayout>
  );
}
