import React from 'react';
import Link from 'next/link';
import { getFullTournamentData } from '@/lib/tournamentService';
import {
  Trophy,
  Award,
  Crown,
  Star,
  Users,
  Shield,
  Sparkles,
  Flame,
  Lock,
  ChevronRight,
  Medal,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AwardsPublicPage() {
  const data = getFullTournamentData({ isAdmin: false });
  const { awards, top_scorers, top_assists, top_mvps } = data;

  const potRevealed = Boolean(awards?.pot_revealed);
  const tottRevealed = Boolean(awards?.tott_revealed);
  const anyRevealed = potRevealed || tottRevealed;

  const potWinner = awards?.pot_winner;
  const tottData = awards?.tott_data;

  // Category leaders
  const topScorer = top_scorers.length > 0 ? top_scorers[0] : null;
  const topAssister = top_assists.length > 0 ? top_assists[0] : null;
  const topMVP = top_mvps.length > 0 ? top_mvps[0] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" />
          <span>ENSCS Football Tournament 2026</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Official Tournament Awards
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          The highest individual and collective honors awarded by the official tournament technical committee.
        </p>
      </div>

      {/* LOCKED CEREMONY STATE: When awards have not been revealed yet */}
      {!anyRevealed && (
        <div className="glass-panel rounded-3xl p-8 sm:p-16 border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-pitch-card to-pitch-darkest text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/40 flex items-center justify-center text-4xl sm:text-5xl shadow-glow">
            <Lock className="w-12 h-12 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Official Ceremony Awaits
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              THE AWARDS WILL BE REVEALED AFTER THE FINAL
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Following the conclusion of the Grand Final, the tournament committee will officially announce the
              <strong> Player of the Tournament (Golden Ball)</strong>, the <strong>Team of the Tournament (Best 7)</strong>, and all tournament accolades.
            </p>
          </div>

          {/* Locked Honors Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 border-t border-white/5">
            <div className="p-4 rounded-2xl bg-pitch-darkest/70 border border-white/5 space-y-2">
              <Crown className="w-6 h-6 text-amber-400/50 mx-auto" />
              <span className="text-xs font-bold text-slate-300 uppercase block">Player of Tournament</span>
              <span className="text-[10px] text-amber-400 font-mono">🔒 Sealed Until Final</span>
            </div>

            <div className="p-4 rounded-2xl bg-pitch-darkest/70 border border-white/5 space-y-2">
              <Users className="w-6 h-6 text-emerald-400/50 mx-auto" />
              <span className="text-xs font-bold text-slate-300 uppercase block">Team of Tournament (Best 7)</span>
              <span className="text-[10px] text-emerald-400 font-mono">🔒 5 Starters + 2 Subs</span>
            </div>

            <div className="p-4 rounded-2xl bg-pitch-darkest/70 border border-white/5 space-y-2">
              <Flame className="w-6 h-6 text-red-400/50 mx-auto" />
              <span className="text-xs font-bold text-slate-300 uppercase block">Category Accolades</span>
              <span className="text-[10px] text-red-400 font-mono">🔒 Top Scorer & Assister</span>
            </div>
          </div>
        </div>
      )}

      {/* REVEALED 1: PLAYER OF THE TOURNAMENT */}
      {potRevealed && potWinner && (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-pitch-card to-amber-950/30 shadow-glow relative overflow-hidden space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-pitch-darkest flex items-center justify-center font-black">
                👑
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                  Official Golden Ball
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase">Player of the Tournament</h2>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-300/80 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Official Award Winner
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
              {/* Golden Trophy Avatar */}
              <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-3xl p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-glow flex flex-col justify-between items-center flex-shrink-0">
                <div className="w-full flex items-center justify-between px-3 pt-2 text-[10px] font-black uppercase text-pitch-darkest">
                  <span>POT</span>
                  <span>👑</span>
                </div>
                <div className="w-20 h-20 rounded-full bg-pitch-darkest flex items-center justify-center text-3xl font-black text-amber-400 border border-amber-400/50 shadow-inner">
                  {potWinner.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="pb-2 text-center">
                  <span className="font-mono font-black text-xs text-pitch-darkest bg-amber-300 px-2 py-0.5 rounded-full">
                    {potWinner.overall_points || 0} POT
                  </span>
                </div>
              </div>

              {/* Winner Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Grand Champion Award
                  </span>
                  {potWinner.is_captain && (
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-bold">
                      Captain (C)
                    </span>
                  )}
                </div>

                <Link
                  href={`/players/${potWinner.id}`}
                  className="text-2xl sm:text-4xl font-black text-white hover:text-amber-400 transition tracking-tight block"
                  dir="auto"
                >
                  {potWinner.name}
                </Link>

                <div className="flex items-center justify-center sm:justify-start space-x-2 text-sm text-slate-300">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span dir="auto">{potWinner.team_name}</span>
                </div>

                <Link
                  href={`/players/${potWinner.id}`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition pt-2"
                >
                  <span>View Full Player Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Performance Stats Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8 text-center">
              <div className="p-3 rounded-2xl bg-pitch-darkest/70 border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Matches</span>
                <span className="text-2xl font-mono font-black text-white">{potWinner.matches_played || 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-pitch-darkest/70 border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Goals</span>
                <span className="text-2xl font-mono font-black text-emerald-400">{potWinner.goals || 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-pitch-darkest/70 border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assists</span>
                <span className="text-2xl font-mono font-black text-blue-400">{potWinner.assists || 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-pitch-darkest/70 border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">MVPs</span>
                <span className="text-2xl font-mono font-black text-amber-400">{potWinner.mvps || 0} ⭐</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVEALED 2: TEAM OF THE TOURNAMENT (BEST 5 + 2 SUBSTITUTES) */}
      {tottRevealed && tottData && (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-emerald-500/50 bg-pitch-card/90 space-y-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-400 text-pitch-darkest flex items-center justify-center font-black">
                ⭐
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  Official Best 7 Selection
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase">
                  Team of the Tournament ({tottData.formation || '1-2-1'})
                </h2>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              5 Starters on Pitch • 2 Substitutes on Bench
            </span>
          </div>

          {/* Visual 5-a-side Football Pitch */}
          <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden border-4 border-emerald-500/50 shadow-2xl bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-emerald-950/90">
            {/* Markings */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-28 h-28 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 border-b border-x border-white/20 rounded-b-xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-x border-white/25 rounded-t-xl" />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/40 rounded-full" />

            {/* Starting 5 Player Cards */}
            {(tottData.starters || []).map((slot: any) => (
              <div
                key={slot.slot_id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition hover:scale-110"
                style={{ left: `${slot.pitch_x}%`, top: `${slot.pitch_y}%` }}
              >
                <Link href={`/players/${slot.player_id}`}>
                  <div className="w-24 sm:w-28 p-2 rounded-2xl border border-emerald-400/70 bg-pitch-darkest/90 text-center shadow-glow backdrop-blur-md transition hover:border-emerald-300">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full bg-emerald-500 text-pitch-darkest">
                      {slot.position_label}
                    </span>
                    <div className="w-10 h-10 mx-auto my-1 rounded-full bg-pitch-card border border-white/20 flex items-center justify-center font-black text-xs text-white">
                      {slot.player_name
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="text-[11px] font-bold text-white truncate" dir="auto">
                      {slot.player_name}
                    </div>
                    <div className="text-[9px] text-slate-300 font-mono truncate">
                      {slot.player_team_name}
                    </div>
                    <div className="text-[8px] text-amber-300 font-bold font-mono">
                      {slot.goals > 0 && `${slot.goals}G `}
                      {slot.assists > 0 && `${slot.assists}A `}
                      {slot.mvps > 0 && `${slot.mvps}⭐`}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Substitutes Bench (2 Players) */}
          <div className="p-4 sm:p-6 rounded-2xl bg-pitch-darkest/90 border border-white/10 space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Official Substitutes Bench
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(tottData.substitutes || []).map((slot: any) => (
                <Link key={slot.slot_id} href={`/players/${slot.player_id}`}>
                  <div className="p-3 rounded-xl bg-pitch-card border border-white/10 hover:border-emerald-400/50 transition flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 flex-shrink-0">
                        {slot.position_label}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block hover:text-emerald-400 transition" dir="auto">
                          {slot.player_name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block" dir="auto">
                          {slot.player_team_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 font-mono text-[11px] text-amber-300 font-bold">
                      {slot.goals > 0 && `${slot.goals}G `}
                      {slot.assists > 0 && `${slot.assists}A `}
                      {slot.mvps > 0 && `${slot.mvps}⭐`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVEALED 3: INDIVIDUAL CATEGORY HONORS */}
      {anyRevealed && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Medal className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Individual Accolades</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Scorer */}
            {topScorer && (
              <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-pitch-card/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    ⚡ El Cyber Goleador
                  </span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <Link
                    href={`/players/${topScorer.player.id}`}
                    className="text-lg font-black text-white hover:text-amber-400 transition truncate block"
                    dir="auto"
                  >
                    {topScorer.player.name}
                  </Link>
                  <span className="text-xs text-slate-400" dir="auto">{topScorer.player.team_name}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono">
                  <span className="text-xs text-slate-400">Total Goals</span>
                  <span className="text-xl font-black text-amber-400">{topScorer.goals} ⚽</span>
                </div>
              </div>
            )}

            {/* Top Assister */}
            {topAssister && (
              <div className="glass-panel rounded-2xl p-5 border border-blue-500/30 bg-pitch-card/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-400/15 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    🪄 The Master Architect
                  </span>
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <Link
                    href={`/players/${topAssister.player.id}`}
                    className="text-lg font-black text-white hover:text-blue-400 transition truncate block"
                    dir="auto"
                  >
                    {topAssister.player.name}
                  </Link>
                  <span className="text-xs text-slate-400" dir="auto">{topAssister.player.team_name}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono">
                  <span className="text-xs text-slate-400">Total Assists</span>
                  <span className="text-xl font-black text-blue-400">{topAssister.assists} 👟</span>
                </div>
              </div>
            )}

            {/* Most MVPs */}
            {topMVP && (
              <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 bg-pitch-card/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    👑 Tournament Kingpin
                  </span>
                  <Crown className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <Link
                    href={`/players/${topMVP.player.id}`}
                    className="text-lg font-black text-white hover:text-purple-300 transition truncate block"
                    dir="auto"
                  >
                    {topMVP.player.name}
                  </Link>
                  <span className="text-xs text-slate-400" dir="auto">{topMVP.player.team_name}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono">
                  <span className="text-xs text-slate-400">Match MVP Awards</span>
                  <span className="text-xl font-black text-amber-400">{topMVP.mvps} ⭐</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
