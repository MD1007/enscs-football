'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserPlus,
  GitBranch,
  Settings,
  Activity,
  LogOut,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface AdminNavClientProps {
  username: string;
}

export default function AdminNavClient({ username }: AdminNavClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Match Results', href: '/admin/matches', icon: Calendar },
    { label: 'Teams', href: '/admin/teams', icon: Users },
    { label: 'Players', href: '/admin/players', icon: UserPlus },
    { label: 'Knockout Stage', href: '/admin/knockout', icon: GitBranch },
    { label: 'Rules & Format', href: '/admin/rules', icon: Settings },
    { label: 'Activity Logs', href: '/admin/activity', icon: Activity },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <div className="bg-pitch-card border-b border-pitch-border">
      {/* Top micro bar for Admin identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Shield className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="font-bold text-white uppercase tracking-wider">ENSCS Tournament Admin Console</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            Signed in as <strong className="text-emerald-400 font-mono">@{username}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            href="/"
            target="_blank"
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition px-2 py-1 rounded hover:bg-white/5"
          >
            <span>View Public Platform</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation (Desktop) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 hidden md:block">
        <div className="flex items-center space-x-1 py-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-pitch-darkest' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Top Scrollable Pills */}
      <div className="md:hidden px-3 py-2 overflow-x-auto flex items-center space-x-1.5 border-t border-white/5 no-scrollbar">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition whitespace-nowrap ${
                active
                  ? 'bg-emerald-500 text-pitch-darkest shadow-sm'
                  : 'bg-pitch-darkest/70 text-slate-300 border border-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile Bottom Quick Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-pitch-darkest/95 backdrop-blur-2xl border-t border-pitch-border/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        {[
          { label: 'Overview', href: '/admin', icon: LayoutDashboard },
          { label: 'Matches', href: '/admin/matches', icon: Calendar },
          { label: 'Teams', href: '/admin/teams', icon: Users },
          { label: 'Players', href: '/admin/players', icon: UserPlus },
          { label: 'Playoffs', href: '/admin/knockout', icon: GitBranch },
        ].map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
                active ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

