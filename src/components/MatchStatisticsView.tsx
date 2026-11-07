'use client';

import React from 'react';
import { Match } from '@/lib/types';
import { BarChart3 } from 'lucide-react';

interface MatchStatisticsViewProps {
  match: Match;
}

export default function MatchStatisticsView({ match }: MatchStatisticsViewProps) {
  const homeColor = match.home_team_color || '#10B981';
  const awayColor = match.away_team_color || '#3B82F6';

  const hasPossession =
    match.possession_home !== null &&
    match.possession_home !== undefined &&
    match.possession_away !== null &&
    match.possession_away !== undefined;

  const hasShots =
    match.shots_home !== null &&
    match.shots_home !== undefined &&
    match.shots_away !== null &&
    match.shots_away !== undefined;

  const hasShotsOnTarget =
    match.shots_on_target_home !== null &&
    match.shots_on_target_home !== undefined &&
    match.shots_on_target_away !== null &&
    match.shots_on_target_away !== undefined;

  const hasFouls =
    match.fouls_home !== null &&
    match.fouls_home !== undefined &&
    match.fouls_away !== null &&
    match.fouls_away !== undefined;

  // Derive cards from match events
  const events = match.events || [];
  const yellowHome = events.filter((e) => e.team_id === match.home_team_id && e.event_type === 'yellow_card').length;
  const yellowAway = events.filter((e) => e.team_id === match.away_team_id && e.event_type === 'yellow_card').length;
  const redHome = events.filter((e) => e.team_id === match.home_team_id && e.event_type === 'red_card').length;
  const redAway = events.filter((e) => e.team_id === match.away_team_id && e.event_type === 'red_card').length;

  const hasAnyCustomStats = hasPossession || hasShots || hasShotsOnTarget || hasFouls;

  if (!hasAnyCustomStats && match.status !== 'finished' && match.status !== 'live') {
    return (
      <div className="p-6 text-center rounded-2xl bg-pitch-darkest/60 border border-white/5 text-slate-500 text-xs italic">
        Match statistics will be available once the match begins.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Team Headers */}
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2 text-left" dir="auto">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }}></span>
          <span className="text-white truncate max-w-[140px] sm:max-w-none">{match.home_team_name}</span>
        </div>
        <span className="text-slate-500 text-[10px]">TEAM COMPARISON</span>
        <div className="flex items-center space-x-2 text-right" dir="auto">
          <span className="text-white truncate max-w-[140px] sm:max-w-none">{match.away_team_name}</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: awayColor }}></span>
        </div>
      </div>

      {/* Stats Rows */}
      <div className="space-y-4 text-xs">
        {/* Possession */}
        <div>
          <div className="flex items-center justify-between mb-1.5 font-bold font-mono">
            <span className="text-white">{hasPossession ? `${match.possession_home}%` : 'N/A'}</span>
            <span className="text-[11px] font-sans uppercase tracking-wider text-slate-400 font-bold">
              Possession
            </span>
            <span className="text-white">{hasPossession ? `${match.possession_away}%` : 'N/A'}</span>
          </div>
          {hasPossession ? (
            <div className="w-full h-2 rounded-full bg-pitch-darkest overflow-hidden flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${match.possession_home}%`,
                  backgroundColor: homeColor,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${match.possession_away}%`,
                  backgroundColor: awayColor,
                }}
              />
            </div>
          ) : (
            <div className="w-full h-1.5 rounded-full bg-white/5" />
          )}
        </div>

        {/* Total Shots */}
        <div>
          <div className="flex items-center justify-between mb-1.5 font-bold font-mono">
            <span className="text-white">{hasShots ? match.shots_home : 'N/A'}</span>
            <span className="text-[11px] font-sans uppercase tracking-wider text-slate-400 font-bold">
              Total Shots
            </span>
            <span className="text-white">{hasShots ? match.shots_away : 'N/A'}</span>
          </div>
          {hasShots ? (
            <div className="w-full h-2 rounded-full bg-pitch-darkest overflow-hidden flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.shots_home! / ((match.shots_home! + match.shots_away!) || 1)) * 100
                  }%`,
                  backgroundColor: homeColor,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.shots_away! / ((match.shots_home! + match.shots_away!) || 1)) * 100
                  }%`,
                  backgroundColor: awayColor,
                }}
              />
            </div>
          ) : (
            <div className="w-full h-1.5 rounded-full bg-white/5" />
          )}
        </div>

        {/* Shots on Target */}
        <div>
          <div className="flex items-center justify-between mb-1.5 font-bold font-mono">
            <span className="text-white">{hasShotsOnTarget ? match.shots_on_target_home : 'N/A'}</span>
            <span className="text-[11px] font-sans uppercase tracking-wider text-slate-400 font-bold">
              Shots on Target
            </span>
            <span className="text-white">{hasShotsOnTarget ? match.shots_on_target_away : 'N/A'}</span>
          </div>
          {hasShotsOnTarget ? (
            <div className="w-full h-2 rounded-full bg-pitch-darkest overflow-hidden flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.shots_on_target_home! /
                      ((match.shots_on_target_home! + match.shots_on_target_away!) || 1)) *
                    100
                  }%`,
                  backgroundColor: homeColor,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.shots_on_target_away! /
                      ((match.shots_on_target_home! + match.shots_on_target_away!) || 1)) *
                    100
                  }%`,
                  backgroundColor: awayColor,
                }}
              />
            </div>
          ) : (
            <div className="w-full h-1.5 rounded-full bg-white/5" />
          )}
        </div>

        {/* Fouls */}
        {hasFouls && (
          <div>
            <div className="flex items-center justify-between mb-1.5 font-bold font-mono">
              <span className="text-white">{match.fouls_home}</span>
              <span className="text-[11px] font-sans uppercase tracking-wider text-slate-400 font-bold">
                Fouls
              </span>
              <span className="text-white">{match.fouls_away}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-pitch-darkest overflow-hidden flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.fouls_home! / ((match.fouls_home! + match.fouls_away!) || 1)) * 100
                  }%`,
                  backgroundColor: homeColor,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${
                    (match.fouls_away! / ((match.fouls_home! + match.fouls_away!) || 1)) * 100
                  }%`,
                  backgroundColor: awayColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Cards Disciplinary Row */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-amber-400 font-bold">🟨 {yellowHome}</span>
              <span className="text-red-400 font-bold">🟥 {redHome}</span>
            </div>
            <span className="text-[10px] font-sans uppercase tracking-wider text-slate-400 font-bold">
              Discipline
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-amber-400 font-bold">🟨 {yellowAway}</span>
              <span className="text-red-400 font-bold">🟥 {redAway}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasAnyCustomStats && (
        <p className="text-[11px] text-slate-500 italic text-center pt-2">
          Note: Possession and shots are recorded when detailed tracking is submitted by the referee/admin.
        </p>
      )}
    </div>
  );
}
