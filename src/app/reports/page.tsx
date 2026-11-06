import React from 'react';
import { getAllTransferOrders, getAllProducts, getAllTrucks } from '@/lib/db';
import DashboardLayout from '@/components/dashboard-layout';
import ReportsClient from './reports-client';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const orders = getAllTransferOrders();
  const products = getAllProducts();
  const trucks = getAllTrucks();

  return (
    <DashboardLayout>
      <ReportsClient
        initialOrders={orders}
        products={products}
        trucks={trucks}
      />
    </DashboardLayout>
  );
}
