import React from 'react';
import { getFullTournamentData } from '@/lib/tournamentService';
import MvpTabsClient from '@/components/MvpTabsClient';
import { Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function MVPsPage() {
  const data = getFullTournamentData();
  const { top_mvps, player_of_tournament } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Official Accolades
          </span>
          <span className="text-xs text-slate-400">• Performance & MVP Rankings</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <span>Tournament Awards Hub</span>
          <Crown className="w-8 h-8 text-amber-400" />
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Official rankings for Man of the Match awards and overall Player of the Tournament performance in the ENSCS Football Tournament.
        </p>
      </div>

      {/* Tabs & Leaderboards */}
      <MvpTabsClient
        topMvps={top_mvps || []}
        playerOfTheTournament={player_of_tournament || []}
      />
    </div>
  );
}
