import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './login-form';
import ThemeToggle from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Sign In - TAF OIL Ethiopia Transhipment System',
  description: 'Operator authentication portal for TAF Oil Calibration & Transhipment platform.',
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-slate-200 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Suspense fallback={<div className="p-10 text-center font-bold text-slate-600">Loading sign-in form...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
