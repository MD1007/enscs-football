'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Crown, Trophy, Award, Shield, Star, Sparkles, Flame, Zap, Info } from 'lucide-react';
import { Player } from '@/lib/types';

interface MvpItem {
  player: Player;
  mvps: number;
  rank: number;
}

interface OverallPlayerItem {
  player: Player;
  points: number;
  rank: number;
  goals: number;
  assists: number;
  mvps: number;
}

interface MvpTabsClientProps {
  topMvps: MvpItem[];
  playerOfTheTournament: OverallPlayerItem[];
}

export default function MvpTabsClient({ topMvps, playerOfTheTournament }: MvpTabsClientProps) {
  const [activeTab, setActiveTab] = useState<'mvps' | 'overall'>('overall');

  const mvpLeader = topMvps.length > 0 ? topMvps[0] : null;
  const overallLeader = playerOfTheTournament.length > 0 ? playerOfTheTournament[0] : null;

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-pitch-darkest/90 border border-white/10 shadow-lg">
          <button
            onClick={() => setActiveTab('overall')}
            className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition ${
              activeTab === 'overall'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-pitch-darkest shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>🏆 Player of Tournament</span>
          </button>
          <button
            onClick={() => setActiveTab('mvps')}
            className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition ${
              activeTab === 'mvps'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-pitch-darkest shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 fill-current" />
            <span>⭐ Match MVPs ({topMvps.length})</span>
          </button>
        </div>
      </div>

      {/* OVERALL PLAYER OF THE TOURNAMENT TAB */}
      {activeTab === 'overall' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Spotlight Hero Card */}
          {overallLeader && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-pitch-card to-teal-950/30 shadow-glow relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg text-3xl">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        #1 Tournament MVP Leader
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Rank #1</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1" dir="auto">
                      {overallLeader.player.name}
                    </h2>
                    {overallLeader.player.nicknames && overallLeader.player.nicknames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {overallLeader.player.nicknames.map((nick, nIdx) => (
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
                      <span dir="auto">{overallLeader.player.team_name}</span>
                    </div>
                  </div>
                </div>

                {/* Score breakdown badge */}
                <div className="flex flex-wrap items-center gap-3 sm:border-l sm:border-white/10 sm:pl-8">
                  <div className="text-center px-3 py-2 rounded-xl bg-pitch-darkest/60 border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Goals (x5)</span>
                    <span className="text-lg font-mono font-black text-white">{overallLeader.goals}</span>
                  </div>
                  <div className="text-center px-3 py-2 rounded-xl bg-pitch-darkest/60 border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Assists (x3)</span>
                    <span className="text-lg font-mono font-black text-white">{overallLeader.assists}</span>
                  </div>
                  <div className="text-center px-3 py-2 rounded-xl bg-pitch-darkest/60 border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">MVPs (x10)</span>
                    <span className="text-lg font-mono font-black text-amber-400">{overallLeader.mvps}</span>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-xs font-bold uppercase text-emerald-400 block">Overall Points</span>
                    <span className="font-mono font-black text-3xl sm:text-4xl text-emerald-400">
                      {overallLeader.points} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 bg-pitch-darkest/60 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Player of the Tournament Index</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Formula: Goals(×5) + Assists(×3) + MVPs(×10) − Cards
              </span>
            </div>

            {playerOfTheTournament.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="font-semibold text-sm">No player performance recorded yet.</p>
                <p className="text-xs text-slate-500">
                  Player of the Tournament ratings will calculate automatically as goals, assists, and MVPs are registered.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                      <th className="py-3 px-4 text-center w-14">Rank</th>
                      <th className="py-3 px-4">Player & Accolades</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-3 text-center">Goals</th>
                      <th className="py-3 px-3 text-center">Assists</th>
                      <th className="py-3 px-3 text-center">MVPs</th>
                      <th className="py-3 px-3 text-center">Discipline</th>
                      <th className="py-3 px-4 text-center font-black text-emerald-400">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {playerOfTheTournament.map((item, index) => {
                      const isTop = index === 0;
                      const yellowCards = item.player.yellow_cards || 0;
                      const redCards = item.player.red_cards || 0;

                      return (
                        <tr
                          key={item.player.id}
                          className={`transition hover:bg-white/[0.04] ${isTop ? 'bg-emerald-950/20' : ''}`}
                        >
                          <td className="py-3.5 px-4 text-center font-bold">
                            {isTop ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/50 text-xs font-black">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/50 text-xs font-black">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-400 border border-amber-600/40 text-xs font-black">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">{item.rank}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/players/${item.player.id}`}
                                className="hover:text-emerald-400 transition hover:underline font-bold"
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
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                            {item.goals}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                            {item.assists}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-400">
                            {item.mvps > 0 ? `${item.mvps} ⭐` : '0'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-xs">
                            {yellowCards > 0 || redCards > 0 ? (
                              <span className="text-slate-400">
                                {yellowCards > 0 && <span className="text-yellow-400 mr-1">{yellowCards}🟨</span>}
                                {redCards > 0 && <span className="text-red-400">{redCards}🟥</span>}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-base text-emerald-400">
                            {item.points} pts
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
      )}

      {/* MATCH MVPS TAB */}
      {activeTab === 'mvps' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Spotlight Hero Card */}
          {mvpLeader && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-pitch-card to-amber-950/30 shadow-glow relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg text-3xl">
                    👑
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      Most Match MVPs
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1" dir="auto">
                      {mvpLeader.player.name}
                    </h2>
                    {mvpLeader.player.nicknames && mvpLeader.player.nicknames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {mvpLeader.player.nicknames.map((nick, nIdx) => (
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
                      <span dir="auto">{mvpLeader.player.team_name}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-white/10 sm:pl-8">
                  <span className="text-xs font-bold uppercase text-slate-400">Match MVP Awards</span>
                  <div className="font-mono font-black text-4xl sm:text-5xl text-amber-400 flex items-center justify-end gap-1">
                    <span>{mvpLeader.mvps}</span>
                    <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Match MVP Leaderboard */}
          <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 bg-pitch-darkest/60 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Match MVP Awards Leaderboard</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {topMvps.length} Awarded Player{topMvps.length === 1 ? '' : 's'}
              </span>
            </div>

            {topMvps.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Star className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="font-semibold text-sm">No match MVPs awarded yet.</p>
                <p className="text-xs text-slate-500">
                  Official Man of the Match awards will appear here after matches are concluded.
                </p>
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
                    {topMvps.map((item, index) => {
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
                              <Link
                                href={`/players/${item.player.id}`}
                                className="hover:text-amber-400 transition hover:underline font-bold"
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
        </div>
      )}

      {/* Rules Explanatory Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">Official Tournament Accolades & Titles</span>
            <span className="text-slate-400">
              Players leading categories earn special honors: <span className="text-amber-300 font-bold">⚡ EL CYBER GOLEADOR</span> (Top Scorer), <span className="text-blue-300 font-bold">🪄 THE MASTER ARCHITECT</span> (Assist King), and <span className="text-purple-300 font-bold">👑 TOURNAMENT KINGPIN</span> (Most MVPs).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

