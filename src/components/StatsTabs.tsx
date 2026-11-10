import React from 'react';
import Link from 'next/link';

const TABS = [
  { id: 'goals', label: 'Goals', icon: '⚽', href: '/scorers' },
  { id: 'assists', label: 'Assists', icon: '👟', href: '/assists' },
  { id: 'ga', label: 'G+A', icon: '🔥', href: '/contributions' },
] as const;

/** Switcher between the three attacking leaderboards. */
export default function StatsTabs({ active }: { active: (typeof TABS)[number]['id'] }) {
  return (
    <nav aria-label="Statistics leaderboards" className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-pitch-card border border-pitch-border max-w-md">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-[44px] rounded-xl flex items-center justify-center space-x-1.5 text-xs font-black uppercase tracking-wider transition ${
              isActive
                ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
