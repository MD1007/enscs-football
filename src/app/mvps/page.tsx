import React from 'react';
import { getFullTournamentData } from '@/lib/tournamentService';
import { Crown, Trophy, Award, Shield, Star, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function MVPsPage() {
  const data = getFullTournamentData();
  const { top_mvps } = data;

  const leader = top_mvps.length > 0 ? top_mvps[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Official Awards
          </span>
          <span className="text-xs text-slate-400">• Man of the Match</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <span>Tournament MVP Rankings</span>
          <Crown className="w-8 h-8 text-amber-400" />
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Official ranking of the most decisive players in the ENSCS Football Tournament. Awarded match-by-match for outstanding individual impact.
        </p>
      </div>

      {/* Leading MVP Spotlight */}
      {leader && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-pitch-card to-amber-950/30 shadow-glow relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg text-3xl">
                👑
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Tournament MVP Leader
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1" dir="auto">
                  {leader.player.name}
                </h2>
                {leader.player.nicknames && leader.player.nicknames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {leader.player.nicknames.map((nick, nIdx) => (
                      <span
                        key={nIdx}
                        className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-pitch-darkest shadow-md flex items-center space-x-1"
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
              <span className="text-xs font-bold uppercase text-slate-400">Match MVP Awards</span>
              <div className="font-mono font-black text-4xl sm:text-5xl text-amber-400 flex items-center justify-end gap-1">
                <span>{leader.mvps}</span>
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 bg-pitch-darkest/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">MVP Leaderboard</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {top_mvps.length} Awarded Player{top_mvps.length === 1 ? '' : 's'}
          </span>
        </div>

        {top_mvps.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <Star className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-semibold text-sm">No match MVPs awarded yet.</p>
            <p className="text-xs text-slate-500">Official Man of the Match awards will appear here after matches are concluded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                  <th className="py-3 px-4 text-center w-16">Rank</th>
                  <th className="py-3 px-4">Player & Badges</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center font-black text-white">MVPs ⭐</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {top_mvps.map((item, index) => {
                  const isTop = index === 0;
                  return (
                    <tr
                      key={item.player.id}
                      className={`transition hover:bg-white/[0.04] ${isTop ? 'bg-amber-950/20' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50 text-xs font-black">
                            1
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">{item.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                        <div className="flex items-center space-x-2">
                          <span className="hover:text-amber-400 transition">{item.player.name}</span>
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
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30"
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
                      <td className="py-3.5 px-4 text-center font-mono font-black text-base text-amber-400">
                        {item.mvps} ⭐
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rules Explanatory Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">Official Tournament Accolades</span>
            <span className="text-slate-400">
              Players leading categories earn prestigious titles: <span className="text-amber-300 font-bold">⚡ EL CYBER GOLEADOR</span>, <span className="text-blue-300 font-bold">🪄 THE MASTER ARCHITECT</span>, and <span className="text-purple-300 font-bold">👑 TOURNAMENT KINGPIN</span>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

