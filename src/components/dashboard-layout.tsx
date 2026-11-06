'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Truck,
  Users,
  Database,
  BarChart3,
  Receipt,
  MoreHorizontal,
  ChevronDown,
  Layers,
  Sparkles,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Fuel,
  ArrowUpRight,
  TrendingDown,
  Flame,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preset, setPreset] = useState<'neutral' | 'djibouti' | 'addis'>('neutral');

  const navHomeItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/' || pathname === '/dashboard',
    },
    {
      label: 'Transhipment Orders',
      href: '/workbench',
      icon: FileText,
      active: pathname === '/workbench',
    },
    {
      label: 'ASTM & Dip Calc',
      href: '/workbench?mode=calc',
      icon: Calculator,
      active: false,
    },
    {
      label: 'Calibrated Fleet',
      href: '/tables?tab=trucks',
      icon: Truck,
      active: pathname.startsWith('/tables') && pathname.includes('trucks'),
    },
    {
      label: 'Carriers & Drivers',
      href: '/reports?tab=carriers',
      icon: Users,
      active: false,
    },
  ];

  const navDocItems = [
    {
      label: 'Data Library',
      href: '/tables',
      icon: Database,
      active: pathname === '/tables',
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: BarChart3,
      active: pathname === '/reports',
      badge: 'New',
    },
    {
      label: 'Debit Vouchers',
      href: '/debit-note/preview',
      icon: Receipt,
      active: pathname.startsWith('/debit-note'),
    },
    {
      label: 'Database Tables',
      href: '/tables',
      icon: Layers,
      active: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-150">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/90 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Left: Mobile hamburger + Top Nav links */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Top Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === '/' || pathname === '/dashboard'
                    ? 'text-zinc-950 font-semibold bg-zinc-100 dark:text-white dark:bg-zinc-900/60 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/30'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/workbench"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === '/workbench'
                    ? 'text-zinc-950 font-semibold bg-zinc-100 dark:text-white dark:bg-zinc-900/60 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/30'
                }`}
              >
                Workbench
              </Link>
              <Link
                href="/reports"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  pathname === '/reports'
                    ? 'text-zinc-950 font-semibold bg-zinc-100 dark:text-white dark:bg-zinc-900/60 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/30'
                }`}
              >
                <span>Reports</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
              </Link>
              <Link
                href="/tables"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === '/tables'
                    ? 'text-zinc-950 font-semibold bg-zinc-100 dark:text-white dark:bg-zinc-900/60 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/30'
                }`}
              >
                Database
              </Link>
              <Link
                href="/debit-note/preview"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname.startsWith('/debit-note')
                    ? 'text-zinc-950 font-semibold bg-zinc-100 dark:text-white dark:bg-zinc-900/60 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/30'
                }`}
              >
                Debit Notes
              </Link>
            </nav>
          </div>

          {/* Right Header items (Neutral dropdown, Theme toggle, User avatar) */}
          <div className="flex items-center gap-2.5">
            {/* Preset Selector Dropdown */}
            <div className="relative hidden sm:block">
              <select
                aria-label="Preset selection"
                value={preset}
                onChange={(e) => setPreset(e.target.value as any)}
                className="appearance-none bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer shadow-2xs dark:bg-zinc-900/90 dark:border-zinc-800 dark:text-zinc-300 dark:focus:ring-zinc-700"
              >
                <option value="neutral">Neutral</option>
                <option value="djibouti">Horizon Djibouti</option>
                <option value="addis">TAF Addis Depot</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <ThemeToggle />

            {/* Operator Badge */}
            <Link
              href="/login"
              className="flex items-center gap-2 p-1 pl-2 rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold text-blue-600 dark:text-blue-300 dark:bg-blue-600/30 dark:border-blue-500/40">
                TO
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pr-1 hidden lg:inline">
                Operator
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop & Mobile) */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-zinc-200/90 bg-white flex flex-col justify-between p-4 transition-transform duration-200 md:static md:translate-x-0 dark:border-zinc-800/80 dark:bg-zinc-950/95 ${
            mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="space-y-6">
            {/* Top Workspace Brand */}
            <div className="flex items-center justify-between px-2 pt-1">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-7 h-7 rounded-full border border-zinc-300 bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:border-zinc-500 transition-colors shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-white">
                  <div className="w-3 h-3 rounded-full bg-zinc-900 dark:bg-white/90"></div>
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-1.5">
                    TAF OIL PLC
                  </h1>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Ethiopia Transhipment</p>
                </div>
              </Link>
            </div>

            {/* Nav Group: Home */}
            <div className="space-y-1">
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Home
              </p>
              {navHomeItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800/60'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Nav Group: Documents / Analytics */}
            <div className="space-y-1">
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Documents
              </p>
              {navDocItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200 shadow-2xs dark:bg-zinc-900 dark:text-white dark:border-zinc-800/60'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom Card: Corridor Status */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] space-y-1.5 dark:bg-zinc-900/70 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-800 dark:text-zinc-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Corridor
                </span>
                <span className="text-[10px] text-zinc-500">ASTM 54B</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-[10px] leading-relaxed">
                Horizon Djibouti → Addis Ababa Depot
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500">
                <span>Database: SQLite WAL</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">Synced</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 bg-slate-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
