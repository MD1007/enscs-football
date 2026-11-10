import React from 'react';
import Link from 'next/link';
import { getFullTournamentData } from '@/lib/tournamentService';
import StatsTabs from '@/components/StatsTabs';
import { Award, Trophy, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AssistsPage() {
  const data = getFullTournamentData();
  const { top_assists } = data;

  const leader = top_assists.length > 0 ? top_assists[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Playmaker Award</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Top Assists</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Tournament playmakers providing decisive goal assists for their teammates.
        </p>
      </div>

      <StatsTabs active="assists" />

      {/* Leading Assister Spotlight */}
      {leader && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-pitch-card to-blue-900/20 shadow-glow-blue relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Award className="w-9 h-9 sm:w-11 sm:h-11 text-blue-400 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-400/15 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  Assist King
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1" dir="auto">
                  {leader.player.name}
                </h2>
                {leader.player.nicknames && leader.player.nicknames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {leader.player.nicknames.map((nick, nIdx) => (
                      <span
                        key={nIdx}
                        className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-blue-500 text-white shadow-md flex items-center space-x-1"
                        title={nick.subtitle}
                      >
                        <span>{nick.title}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center space-x-2 text-xs text-slate-300 mt-2">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="auto">{leader.player.team_name}</span>
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/10 sm:pl-8">
              <span className="text-xs font-bold uppercase text-slate-400">Total Assists</span>
              <div className="font-mono font-black text-4xl sm:text-5xl text-blue-400">
                {leader.assists}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 bg-pitch-darkest/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Assist Ranking</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {top_assists.length} Provider{top_assists.length === 1 ? '' : 's'} Registered
          </span>
        </div>

        {top_assists.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-semibold text-sm">No assists registered yet.</p>
            <p className="text-xs text-slate-500">Playmakers will appear here once assists are submitted by the administrator.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                  <th className="py-3 px-4 text-center w-16">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Apps</th>
                  <th className="py-3 px-4 text-center">A/M</th>
                  <th className="py-3 px-4 text-center font-black text-white">Assists 🎯</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {top_assists.map((item, index) => {
                  const isTop = index === 0;
                  return (
                    <tr
                      key={item.player.id}
                      className={`transition hover:bg-white/[0.04] ${isTop ? 'bg-blue-950/20' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50 text-xs font-black">
                            1
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">{item.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                        <div className="flex items-center space-x-2">
                          <Link dir="auto"
                            href={`/players/${item.player.id}`}
                            className="hover:text-blue-300 transition hover:underline font-bold"
                          >
                            {item.player.name}
                          </Link>
                          {item.player.is_captain && (
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-bold">
                              (C)
                            </span>
                          )}
                        </div>
                        {item.player.nicknames && item.player.nicknames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.player.nicknames.map((nick, nIdx) => (
                              <span
                                key={nIdx}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                title={nick.subtitle}
                              >
                                {nick.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs" dir="auto">
                        {item.player.team_name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {item.appearances}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300 font-semibold">
                        {item.assists_per_match.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-base text-blue-400">
                        {item.assists}
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

