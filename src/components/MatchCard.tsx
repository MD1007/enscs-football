'use client';

import React, { useState } from 'react';
import { Match } from '@/lib/types';
import MatchDetailModal from './MatchDetailModal';
import { Calendar, Clock, ChevronRight, Shield } from 'lucide-react';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const formattedDate = new Date(match.scheduled_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = new Date(match.scheduled_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getGroupBadgeColor = (group?: string | null) => {
    switch (group) {
      case 'A':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'B':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'C':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  const getStageLabel = () => {
    if (match.stage === 'group') return `Group ${match.group_id} • J${match.matchday || 1}`;
    if (match.stage === 'semi_final') return 'Semi-Final';
    if (match.stage === 'third_place') return '3rd Place';
    if (match.stage === 'final') return 'Final 🏆';
    return match.stage;
  };

  const isClickable = match.status === 'finished' || match.status === 'live' || (match.events && match.events.length > 0);

  return (
    <>
      <div
        onClick={() => isClickable && setModalOpen(true)}
        className={`relative glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border bg-pitch-card/75 transition-all duration-300 ${
          isClickable ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-glow' : ''
        }`}
      >
        {/* Card Header: Group & Status */}
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getGroupBadgeColor(
                match.group_id
              )}`}
            >
              {getStageLabel()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {match.status === 'live' && (
              <span className="flex items-center space-x-1.5 text-[10px] font-bold text-red-400 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                <span>LIVE</span>
              </span>
            )}
            {match.status === 'finished' && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Finished
              </span>
            )}
            {match.status === 'upcoming' && (
              <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-medium">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{match.is_time_set ? formattedTime : 'Time TBD'}</span>
              </div>
            )}
            {match.status === 'postponed' && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase">
                Postponed
              </span>
            )}
          </div>
        </div>

        {/* Teams and Score Body */}
        <div className="grid grid-cols-12 items-center gap-2 py-1">
          {/* Home Team */}
          <div className="col-span-5 flex items-center justify-end space-x-2 sm:space-x-3 text-right">
            <span
              className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug truncate"
              dir="auto"
              title={match.home_team_name || 'TBD'}
            >
              {match.home_team_name || 'TBD'}
            </span>
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: match.home_team_color || '#10B981' }}
            >
              <Shield className="w-4 h-4 opacity-90" />
            </div>
          </div>

          {/* Score or VS */}
          <div className="col-span-2 flex flex-col items-center justify-center">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="flex flex-col items-center">
                <div className="font-mono font-black text-lg sm:text-xl text-white px-2.5 py-1 rounded-lg bg-pitch-darkest border border-white/10 shadow-inner">
                  {match.home_score ?? 0} : {match.away_score ?? 0}
                </div>
                {match.home_penalties !== null && match.away_penalties !== null && (
                  <span className="text-[9px] text-amber-400 font-mono mt-0.5">
                    ({match.home_penalties}-{match.away_penalties}p)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1 rounded bg-white/5">
                VS
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="col-span-5 flex items-center justify-start space-x-2 sm:space-x-3 text-left">
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
            >
              <Shield className="w-4 h-4 opacity-90" />
            </div>
            <span
              className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug truncate"
              dir="auto"
              title={match.away_team_name || 'TBD'}
            >
              {match.away_team_name || 'TBD'}
            </span>
          </div>
        </div>

        {/* Card Footer: Date, Venue, Details link */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-2.5 border-t border-white/5">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{match.is_time_set ? formattedDate : 'Schedule: Unassigned'}</span>
          </div>

          {isClickable ? (
            <span className="flex items-center space-x-0.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition">
              <span>Match Details</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
              {match.venue || 'Terrain ENSCS'}
            </span>
          )}
        </div>
      </div>

      {/* Details modal */}
      {modalOpen && <MatchDetailModal match={match} onClose={() => setModalOpen(false)} />}
    </>
  );
}

