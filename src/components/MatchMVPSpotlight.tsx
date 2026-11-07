'use client';

import React from 'react';
import { Match, Player } from '@/lib/types';
import { Crown, Star, Shield, Flame, Award, Sparkles } from 'lucide-react';

interface MatchMVPSpotlightProps {
  match: Match;
  player?: Player | null;
}

export default function MatchMVPSpotlight({ match, player }: MatchMVPSpotlightProps) {
  if (!match.mvp_player_name && !player) return null;

  const playerName = player ? player.name : match.mvp_player_name;
  const teamName = player ? player.team_name : match.mvp_team_name;
  const isCaptain = player?.is_captain;

  // Calculate goals and assists for this MVP in this match
  const events = match.events || [];
  const playerId = player ? player.id : match.mvp_player_id;

  const matchGoals = events.filter(
    (e) => e.player_id === playerId && e.event_type === 'goal' && e.sub_type !== 'own_goal'
  ).length;

  const matchAssists = events.filter(
    (e) => (e.player_id === playerId && e.event_type === 'assist') || e.assister_id === playerId
  ).length;

  const isManual = match.mvp_mode === 'manual';

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-pitch-darkest to-purple-950/30 shadow-glow">
      {/* Background ambient gold aura */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          {/* Avatar / Trophy Emblem */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-3xl shadow-xl border-2 border-amber-300/60 flex-shrink-0 animate-pulse">
            👑
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-pitch-darkest bg-amber-400 px-2.5 py-0.5 rounded-full shadow-sm flex items-center space-x-1">
                <Star className="w-3 h-3 fill-pitch-darkest" />
                <span>OFFICIAL MATCH MVP</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isManual ? '🔒 Admin Override' : '⚡ Performance Ranked'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2" dir="auto">
              <span>{playerName}</span>
              {isCaptain && (
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">
                  (C)
                </span>
              )}
            </h3>

            {teamName && (
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold" dir="auto">{teamName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Pill / Score */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end sm:border-l sm:border-white/10 sm:pl-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
          {matchGoals > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-pitch-card border border-amber-500/30 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Goals</span>
              <span className="font-mono font-black text-amber-400 text-sm">{matchGoals} ⚽</span>
            </div>
          )}

          {matchAssists > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-pitch-card border border-blue-500/30 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Assists</span>
              <span className="font-mono font-black text-blue-400 text-sm">{matchAssists} 👟</span>
            </div>
          )}

          {match.mvp_score !== null && match.mvp_score !== undefined && (
            <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-center">
              <span className="text-[10px] font-black uppercase text-amber-300 block">Rating</span>
              <span className="font-mono font-black text-amber-300 text-lg">{match.mvp_score} PTS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

