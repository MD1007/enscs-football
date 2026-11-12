import React from 'react';
import Link from 'next/link';
import { getFullTournamentData } from '@/lib/tournamentService';
import FanZonePolls from '@/components/FanZonePolls';
import { Vote, ChevronLeft, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Fan Zone – ENSCS Football Tournament 2026',
  description: 'Predict match winners and vote for Man of the Match. Fan polls for the ENSCS Football Tournament.',
};

export default function FanZonePage() {
  const data = getFullTournamentData();
  const { matches, summary } = data;

  return (
    <div className="min-h-screen pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden pt-8 pb-10 border-b border-pitch-border bg-gradient-to-b from-purple-950/40 via-pitch-darkest to-pitch-darkest">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-gradient-to-b from-purple-500/15 via-amber-500/10 to-transparent blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 transition mb-4"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>

          <div className="text-center space-y-3">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/30 shadow-lg mx-auto">
              <Vote className="w-7 h-7 text-purple-400" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Fan Predictions</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Fan <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400">Zone</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
                Predict match winners, vote for Man of the Match, and see what other fans think.
                Just for fun — no accounts, no money, no effect on stats.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-4 text-xs pt-2">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="font-mono font-bold text-emerald-400">{summary.matches_remaining}</span>
                <span>matches remaining</span>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="font-mono font-bold text-amber-400">{summary.total_goals}</span>
                <span>goals scored</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Polls Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <FanZonePolls matches={matches} />
      </div>
    </div>
  );
}

