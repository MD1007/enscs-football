'use client';

import React, { useState } from 'react';
import { Match } from '@/lib/types';
import MatchDetailModal from './MatchDetailModal';
import { Trophy, Clock, Shield, Sparkles, AlertCircle } from 'lucide-react';

interface KnockoutBracketProps {
  matches: Match[];
  isComplete: boolean;
  totalGroupMatches: number;
  finishedGroupMatches: number;
}

export default function KnockoutBracket({
  matches,
  isComplete,
  totalGroupMatches,
  finishedGroupMatches,
}: KnockoutBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const sf1 = matches.find((m) => m.stage === 'semi_final' && m.id % 2 !== 0) || matches.filter(m => m.stage === 'semi_final')[0];
  const sf2 = matches.find((m) => m.stage === 'semi_final' && m.id !== sf1?.id) || matches.filter(m => m.stage === 'semi_final')[1];
  const thirdPlace = matches.find((m) => m.stage === 'third_place');
  const finalMatch = matches.find((m) => m.stage === 'final');

  const hasAnyKnockoutTeam = matches.some(
    (m) => m.stage !== 'group' && (m.home_team_id !== null || m.away_team_id !== null)
  );

  // If group stage is incomplete and no knockout teams set yet
  if (!isComplete && !hasAnyKnockoutTeam) {
    const progressPercent = totalGroupMatches > 0 ? Math.round((finishedGroupMatches / totalGroupMatches) * 100) : 0;

    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-14 text-center border border-pitch-border max-w-3xl mx-auto my-8 shadow-2xl relative overflow-hidden">
        {/* Pitch light aesthetic */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-emerald-500/10 to-blue-500/20 border border-amber-400/30 flex items-center justify-center mx-auto shadow-glow">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Knockout Stage Preview
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              The Road To The Final
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              Qualified teams will appear here once the group stage is completed.
            </p>
          </div>

          {/* Group Stage Progress Bar */}
          <div className="bg-pitch-darkest/60 border border-white/5 rounded-2xl p-5 max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Group Stage Matches Played</span>
              <span className="text-emerald-400 font-bold font-mono">
                {finishedGroupMatches} / {totalGroupMatches} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-pitch-card rounded-full h-3 overflow-hidden border border-white/5 p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-glow"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Qualification: 1st place in Group A, B, C + the Best 2nd-place team across all groups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-slate-400 max-w-xl mx-auto">
            <div className="p-3 rounded-xl bg-pitch-card border border-emerald-500/20">
              <span className="block text-emerald-400 font-bold mb-1">Group A Winner</span>
              <span className="text-slate-500 text-[11px]">To Semi-Final 1</span>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-blue-500/20">
              <span className="block text-blue-400 font-bold mb-1">Group B & C Winners</span>
              <span className="text-slate-500 text-[11px]">To Semi-Final 2</span>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-amber-500/20">
              <span className="block text-amber-400 font-bold mb-1">Best 2nd Place</span>
              <span className="text-slate-500 text-[11px]">Wildcard Semi-Finalist</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderBracketMatch = (match?: Match, title?: string, placeholderHome?: string, placeholderAway?: string) => {
    if (!match) return null;

    const hasTeams = match.home_team_name && match.away_team_name;
    const isFinished = match.status === 'finished';
    const isLive = match.status === 'live';

    return (
      <div
        onClick={() => (isFinished || isLive) && setSelectedMatch(match)}
        className={`glass-card rounded-2xl p-4 border border-pitch-border bg-pitch-card/80 transition-all ${
          isFinished || isLive ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-glow' : ''
        }`}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">{title}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isLive
                ? 'bg-red-500 text-white animate-pulse'
                : isFinished
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            {match.status}
          </span>
        </div>

        {/* Team 1 */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center space-x-2.5 truncate">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: match.home_team_color || '#10B981' }}
            />
            <span
              className={`text-sm font-semibold truncate ${
                isFinished && match.winner_team_id === match.home_team_id ? 'text-emerald-400 font-bold' : 'text-white'
              }`}
              dir="auto"
            >
              {match.home_team_name || placeholderHome || 'Qualified Team'}
            </span>
          </div>
          <div className="font-mono font-bold text-sm text-white ml-2">
            {isFinished || isLive ? match.home_score ?? 0 : '-'}
            {match.home_penalties !== null && isFinished && (
              <span className="text-[10px] text-amber-400 ml-1">({match.home_penalties}p)</span>
            )}
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2.5 truncate">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
            />
            <span
              className={`text-sm font-semibold truncate ${
                isFinished && match.winner_team_id === match.away_team_id ? 'text-emerald-400 font-bold' : 'text-white'
              }`}
              dir="auto"
            >
              {match.away_team_name || placeholderAway || 'Qualified Team'}
            </span>
          </div>
          <div className="font-mono font-bold text-sm text-white ml-2">
            {isFinished || isLive ? match.away_score ?? 0 : '-'}
            {match.away_penalties !== null && isFinished && (
              <span className="text-[10px] text-amber-400 ml-1">({match.away_penalties}p)</span>
            )}
          </div>
        </div>

        <div className="pt-2.5 mt-1 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{new Date(match.scheduled_time).toLocaleDateString()}</span>
          <span>{match.venue || 'Terrain ENSCS'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ENSCS Championship Bracket</span>
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Knockout Stage</h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Single elimination bracket. In case of a draw, matches are decided immediately by a penalty shootout.
        </p>
      </div>

      {/* Bracket Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Semi-Finals Column */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center lg:justify-start space-x-2">
              <span>Semi-Finals</span>
            </h3>
          </div>
          {renderBracketMatch(sf1, 'Semi-Final 1', '1st Place Group A', 'Best 2nd Place Team')}
          {renderBracketMatch(sf2, 'Semi-Final 2', '1st Place Group B', '1st Place Group C')}
        </div>

        {/* Center: Grand Final Column */}
        <div className="space-y-6 lg:-mt-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 p-0.5 mx-auto mb-2 shadow-glow">
              <div className="w-full h-full bg-pitch-darkest rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h3 className="text-lg font-black text-amber-400 uppercase tracking-tight">Grand Final</h3>
            <p className="text-xs text-slate-400">ENSCS Champions 2026</p>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-400/40 via-emerald-500/30 to-blue-500/30 shadow-2xl">
            {renderBracketMatch(finalMatch, 'Grand Final 🏆', 'Winner SF 1', 'Winner SF 2')}
          </div>
        </div>

        {/* 3rd Place Match Column */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center justify-center lg:justify-start space-x-2">
              <span>Bronze Match</span>
            </h3>
          </div>
          {renderBracketMatch(thirdPlace, '3rd Place Playoff 🥉', 'Loser SF 1', 'Loser SF 2')}

          <div className="glass-panel p-4 rounded-2xl border border-pitch-border text-xs text-slate-400 space-y-2">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span>Progression Rules</span>
            </div>
            <p>
              • Winners of SF1 & SF2 contest the Grand Final.
            </p>
            <p>
              • Runner-ups compete for the Bronze 3rd-place trophy.
            </p>
            <p>
              • Penalty shootouts resolve any draw after regulation time.
            </p>
          </div>
        </div>
      </div>

      {/* Selected match modal */}
      {selectedMatch && <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  );
}

