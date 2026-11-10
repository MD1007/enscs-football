'use client';

import React, { useState } from 'react';
import { Match, Player } from '@/lib/types';
import MatchDetailModal from './MatchDetailModal';
import LiveMinute from './LiveMinute';
import { FormPills } from './MatchPreview';
import { getTeamForm } from '@/lib/matchPreview';
import { Calendar, Clock, ChevronRight, Shield } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  /** Every match (enables the form guide on upcoming fixtures). */
  allMatches?: Match[];
  /** Every player (lets the preview open instantly, without another request). */
  allPlayers?: Player[];
}

export default function MatchCard({ match, allMatches, allPlayers }: MatchCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasBothTeams = Boolean(match.home_team_id && match.away_team_id);
  const isUpcoming = match.status === 'upcoming' || match.status === 'postponed';
  const showPreview = isUpcoming && hasBothTeams;
  const homeForm = showPreview && allMatches ? getTeamForm(match.home_team_id, allMatches) : null;
  const awayForm = showPreview && allMatches ? getTeamForm(match.away_team_id, allMatches) : null;

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

  const isClickable =
    match.status === 'finished' || match.status === 'live' || (match.events && match.events.length > 0) || showPreview;

  return (
    <>
      <div
        onClick={() => isClickable && setModalOpen(true)}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`relative glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border bg-pitch-card/75 transition-all duration-300 ${
          isClickable ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-glow focus:outline-none focus-visible:border-emerald-400' : ''
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
                <LiveMinute match={match} className="font-mono normal-case text-red-200" />
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
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Home Team */}
          <div className="flex-1 min-w-0 flex items-center justify-end space-x-2 sm:space-x-3 text-right">
            <span
              className="font-bold text-xs sm:text-base text-white tracking-tight leading-snug truncate"
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
          <div className="flex-shrink-0 px-1 sm:px-2 flex flex-col items-center justify-center">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center justify-center whitespace-nowrap font-mono font-black text-base sm:text-xl text-white px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-pitch-darkest border border-white/10 shadow-inner">
                  <span>{match.home_score ?? 0}</span>
                  <span className="text-emerald-400 mx-1.5 font-bold">:</span>
                  <span>{match.away_score ?? 0}</span>
                </div>
                {match.home_penalties !== null && match.away_penalties !== null && (
                  <span className="text-[9px] text-amber-400 font-mono mt-0.5 whitespace-nowrap">
                    ({match.home_penalties}-{match.away_penalties}p)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 whitespace-nowrap">
                VS
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 min-w-0 flex items-center justify-start space-x-2 sm:space-x-3 text-left">
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
            >
              <Shield className="w-4 h-4 opacity-90" />
            </div>
            <span
              className="font-bold text-xs sm:text-base text-white tracking-tight leading-snug truncate"
              dir="auto"
              title={match.away_team_name || 'TBD'}
            >
              {match.away_team_name || 'TBD'}
            </span>
          </div>
        </div>

        {/* MVP Badge if selected */}
        {match.mvp_player_name && (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-300">
              <span className="text-xs">⭐</span>
              <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400">MVP:</span>
              <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]" dir="auto">{match.mvp_player_name}</span>
            </div>
            {match.mvp_team_name && (
              <span className="text-[10px] text-slate-400 truncate max-w-[100px]" dir="auto">
                {match.mvp_team_name}
              </span>
            )}
          </div>
        )}

        {/* Form guide for upcoming fixtures (newest result first) */}
        {homeForm && awayForm && (homeForm.length > 0 || awayForm.length > 0) && (
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
            <FormPills form={homeForm} size="sm" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Form</span>
            <FormPills form={awayForm} size="sm" />
          </div>
        )}

        {/* Card Footer: Date, Venue, Details link */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-2.5 border-t border-white/5">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{match.is_time_set ? formattedDate : 'Schedule: Unassigned'}</span>
          </div>

          {isClickable ? (
            <span className="flex items-center space-x-0.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition">
              <span>{showPreview ? 'Match Preview' : 'Match Details'}</span>
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
      {modalOpen && (
        <MatchDetailModal
          match={match}
          onClose={() => setModalOpen(false)}
          context={allMatches && allPlayers ? { matches: allMatches, players: allPlayers } : null}
        />
      )}
    </>
  );
}

