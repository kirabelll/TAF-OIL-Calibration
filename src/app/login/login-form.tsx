'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  Fuel,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('operator@tafoil.et');
  const [password, setPassword] = useState('tafoil2026');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please provide both Operator ID / Email and password.');
      setIsLoading(false);
      return;
    }

    document.cookie = `taf_session=${encodeURIComponent(
      JSON.stringify({ user: email, role: 'Operator', loginAt: new Date().toISOString() })
    )}; path=/; max-age=86400; SameSite=Lax`;

    localStorage.setItem('taf_user', email);

    setTimeout(() => {
      router.push(callbackUrl);
      router.refresh();
    }, 300);
  };

  const handleQuickLogin = (roleUser: string) => {
    const userEmail = `${roleUser}@tafoil.et`;
    setEmail(userEmail);
    setPassword('tafoil2026');

    document.cookie = `taf_session=${encodeURIComponent(
      JSON.stringify({ user: userEmail, role: roleUser, loginAt: new Date().toISOString() })
    )}; path=/; max-age=86400; SameSite=Lax`;

    localStorage.setItem('taf_user', userEmail);

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-slate-200">
      <CardHeader className="text-center pb-4 pt-6 space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
          <Fuel className="w-6 h-6" />
        </div>
        <div>
          <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900">
            TAF OIL ETHIOPIA
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
            Petroleum Calibration &amp; Transhipment System
          </CardDescription>
        </div>
        <div className="flex justify-center">
          <Badge variant="outline" className="text-[10px] font-semibold text-slate-600">
            Terminal Access Portal
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Operator ID or Work Email</Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@tafoil.et"
                required
                className="pl-9 h-10 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Security Password</Label>
              <span className="text-[11px] text-slate-400 font-mono">Default: tafoil2026</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9 h-10 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-slate-900 h-3.5 w-3.5"
              />
              <span className="font-medium">Remember terminal</span>
            </label>
            <span className="text-slate-400 font-mono text-[10px]">Build 2.6.0</span>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow"
          >
            <span>Sign In to Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Separator className="my-2" />

          {/* Quick Demo Logins */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block text-center">
              One-Click Role Authentication
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('operator')}
                className="text-xs font-semibold gap-1.5 h-8 hover:border-amber-400"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Depot Operator</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('supervisor')}
                className="text-xs font-semibold gap-1.5 h-8 hover:border-indigo-400"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Supervisor</span>
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 flex justify-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-900 gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue without signing in</span>
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
