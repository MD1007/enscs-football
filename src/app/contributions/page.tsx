import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getFullTournamentData } from '@/lib/tournamentService';
import StatsTabs from '@/components/StatsTabs';
import { Flame, Trophy, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'G+A Leaderboard | ENSCS Football Tournament',
  description: 'Goals plus assists: every player ranked by total goal contributions.',
};

const MEDALS: Record<number, { badge: string; row: string; label: string }> = {
  1: { badge: 'bg-amber-400 text-pitch-darkest border-amber-200', row: 'bg-amber-950/25', label: 'Gold' },
  2: { badge: 'bg-slate-300 text-pitch-darkest border-white', row: 'bg-slate-500/10', label: 'Silver' },
  3: { badge: 'bg-orange-600 text-white border-orange-300', row: 'bg-orange-950/20', label: 'Bronze' },
};

export default function ContributionsPage() {
  const data = getFullTournamentData();

  const sorted = data.players
    .map((p) => ({ player: p, goals: p.goals || 0, assists: p.assists || 0, total: (p.goals || 0) + (p.assists || 0) }))
    .filter((r) => r.total > 0)
    .sort(
      (a, b) =>
        b.total - a.total || b.goals - a.goals || (b.player.mvps || 0) - (a.player.mvps || 0) || a.player.name.localeCompare(b.player.name)
    );

  // Players level on G+A share a rank (1, 2, 2, 4, ...).
  const ranked = sorted.map((row, index) => ({
    ...row,
    rank: sorted.findIndex((r) => r.total === row.total) + 1,
    index,
  }));

  const leader = ranked[0] || null;
  const coLeaders = leader ? ranked.filter((r) => r.total === leader.total).length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Contributions</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">G+A Leaderboard</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Goals plus assists for every player in the tournament. Own goals are not counted. Players level on total share a rank.
        </p>
      </div>

      <StatsTabs active="ga" />

      {/* Leader spotlight */}
      {leader && (
        <div className="glass-panel rounded-3xl p-5 sm:p-8 border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-pitch-card to-teal-900/20 shadow-glow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-emerald-400/20 border-2 border-emerald-400/50 flex items-center justify-center flex-shrink-0">
                <Flame className="w-8 h-8 sm:w-11 sm:h-11 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-300 bg-emerald-400/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  {coLeaders > 1 ? `Joint leader (${coLeaders} level)` : 'Most decisive player'}
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1.5 break-words" dir="auto">
                  <Link href={`/players/${leader.player.id}`} className="hover:text-emerald-300 transition">
                    {leader.player.name}
                  </Link>
                </h2>
                <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span dir="auto" className="truncate">
                    {leader.player.team_name}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono whitespace-nowrap">
                    {leader.goals}G + {leader.assists}A
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">G+A</span>
              <div className="font-mono font-black text-4xl sm:text-6xl text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.65)]">
                {leader.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 bg-pitch-darkest/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Total Contributions</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {ranked.length} Player{ranked.length === 1 ? '' : 's'}
          </span>
        </div>

        {ranked.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <Flame className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-semibold text-sm">No goals or assists recorded yet.</p>
            <p className="text-xs text-slate-500">Players appear here as soon as match results are entered.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                  <th scope="col" className="py-3 pl-3 pr-1 sm:px-4 text-center w-12 sm:w-16">
                    Rank
                  </th>
                  <th scope="col" className="py-3 px-2 sm:px-4">
                    Player
                  </th>
                  <th scope="col" className="py-3 px-4 hidden sm:table-cell">
                    Team
                  </th>
                  <th scope="col" className="py-3 px-2 sm:px-4 text-center" title="Goals">
                    G
                  </th>
                  <th scope="col" className="py-3 px-2 sm:px-4 text-center" title="Assists">
                    A
                  </th>
                  <th scope="col" className="py-3 pl-2 pr-3 sm:px-4 text-center font-black text-white">
                    G+A
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranked.map((row) => {
                  const medal = MEDALS[row.rank];
                  return (
                    <tr key={row.player.id} className={`transition hover:bg-white/[0.04] ${medal ? medal.row : ''}`}>
                      <td className="py-3.5 pl-3 pr-1 sm:px-4 text-center">
                        {medal ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-black ${medal.badge}`}
                            aria-label={`Rank ${row.rank}, ${medal.label}`}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">#{row.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 sm:px-4 font-semibold text-white">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Link
                            dir="auto"
                            href={`/players/${row.player.id}`}
                            className="hover:text-emerald-300 transition hover:underline font-bold break-words"
                          >
                            {row.player.name}
                          </Link>
                          {row.player.is_captain && (
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 rounded font-bold" title="Captain">
                              (C)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 sm:hidden mt-0.5" dir="auto">
                          {row.player.team_name}
                        </div>
                        {row.player.nicknames && row.player.nicknames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.player.nicknames.map((nick, nIdx) => (
                              <span
                                key={nIdx}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                title={nick.subtitle}
                              >
                                {nick.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs hidden sm:table-cell" dir="auto">
                        {row.player.team_name}
                      </td>
                      <td className="py-3.5 px-2 sm:px-4 text-center font-mono text-sm text-amber-300 font-bold">{row.goals}</td>
                      <td className="py-3.5 px-2 sm:px-4 text-center font-mono text-sm text-blue-300 font-bold">{row.assists}</td>
                      <td className="py-3.5 pl-2 pr-3 sm:px-4 text-center">
                        <span className="font-mono font-black text-xl text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]">
                          {row.total}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
