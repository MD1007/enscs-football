'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Calendar,
  Table,
  GitBranch,
  Flame,
  Award,
  ShieldAlert,
  Users,
  BookOpen,
  Crown,
  Lock,
  Menu,
  X,
  Clock,
  Vote,
} from 'lucide-react';

interface NavbarProps {
  nextMatchTime?: string | null;
}

export default function Navbar({ nextMatchTime }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  const navItems = [
    { label: 'Overview', href: '/', icon: Trophy },
    { label: 'Matches', href: '/matches', icon: Calendar },
    { label: 'Standings', href: '/standings', icon: Table },
    { label: 'Awards', href: '/awards', icon: Trophy },
    { label: 'Knockout Stage', href: '/knockout', icon: GitBranch },
    { label: 'Top Scorers', href: '/scorers', icon: Flame },
    { label: 'Top Assists', href: '/assists', icon: Award },
    { label: 'G+A', href: '/contributions', icon: Flame },
    { label: 'MVPs', href: '/mvps', icon: Crown },
    { label: 'Cards', href: '/cards', icon: ShieldAlert },
    { label: 'Fan Zone', href: '/fan-zone', icon: Vote },
    { label: 'Teams & Players', href: '/teams', icon: Users },
    { label: 'Rules', href: '/rules', icon: BookOpen },
  ];

  // Countdown to next match
  useEffect(() => {
    if (!nextMatchTime) return;

    const target = new Date(nextMatchTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('Match in progress or ready');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${mins}m`);
      } else {
        setCountdown(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMatchTime]);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-pitch-darkest/90 border-b border-pitch-border/80">
      {/* Top micro bar for ENSCS & Countdown */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-pitch-darkest to-blue-950/60 border-b border-white/5 py-1 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold tracking-wider text-emerald-400 uppercase text-[10px] sm:text-xs">
              École Nationale Supérieure de Cybersécurité (ENSCS)
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Algeria Official Tournament</span>
          </div>

          <div className="flex items-center space-x-3">
            {countdown && (
              <div className="flex items-center space-x-1.5 text-slate-300 bg-pitch-card/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[11px]">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-400">Next Kickoff:</span>
                <span className="font-mono font-bold text-emerald-300">{countdown}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-700 p-0.5 shadow-glow transition group-hover:scale-105">
              <div className="w-full h-full bg-pitch-darkest rounded-[10px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white uppercase">
                  ENSCS <span className="text-emerald-400">Champions</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-1 font-medium tracking-wide">
                Football Tournament Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Mobile Hamburger */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-pitch-card border border-pitch-border text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-pitch-border bg-pitch-dark/95 backdrop-blur-2xl px-4 pt-2 pb-6 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

