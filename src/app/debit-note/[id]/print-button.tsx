'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="gap-2 font-semibold shadow-sm"
    >
      <Printer className="h-4 w-4" />
      <span>Print Debit Note</span>
    </Button>
  );
}
