'use client';

import React from 'react';
import { Match, MatchEvent } from '@/lib/types';

interface MatchEventsTimelineProps {
  match: Match;
  events?: MatchEvent[];
}

export default function MatchEventsTimeline({ match, events }: MatchEventsTimelineProps) {
  const matchEvents = events || match.events || [];

  // Sort chronologically
  const sortedEvents = [...matchEvents].sort((a, b) => {
    const minA = a.minute ?? 999;
    const minB = b.minute ?? 999;
    return minA - minB;
  });

  if (sortedEvents.length === 0) {
    return (
      <div className="py-10 text-center rounded-2xl bg-pitch-darkest/60 border border-white/5 space-y-2">
        <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-500 text-lg">
          ⚽
        </div>
        <p className="text-sm font-semibold text-slate-400">No match events recorded</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Goals, assists, penalties, and disciplinary cards will appear on this timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative py-4 px-1 sm:px-4">
      {/* Center line for timeline on all screens */}
      <div className="absolute left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/40 via-white/10 to-transparent -translate-x-1/2" />

      <div className="space-y-4 sm:space-y-5">
        {sortedEvents.map((ev, index) => {
          const isHomeEvent = ev.team_id === match.home_team_id;
          const isGoal = ev.event_type === 'goal';
          const isOwnGoal = ev.sub_type === 'own_goal';
          const isPenalty = ev.sub_type === 'penalty';
          const isYellow = ev.event_type === 'yellow_card';
          const isRed = ev.event_type === 'red_card';
          const isAssist = ev.event_type === 'assist';

          const teamColor = isHomeEvent
            ? match.home_team_color || '#10B981'
            : match.away_team_color || '#3B82F6';

          return (
            <div
              key={ev.id || index}
              className="relative flex items-center justify-between w-full group"
            >
              {/* Left Column (Home Event) */}
              <div className="w-[calc(50%-22px)] sm:w-[calc(50%-28px)] flex justify-end pr-2 sm:pr-5 text-right">
                {isHomeEvent && (
                  <div className="space-y-0.5 max-w-full">
                    <div className="flex items-center justify-end space-x-1.5" dir="auto">
                      <span dir="auto" className="font-bold text-white text-xs sm:text-sm truncate">
                        {ev.player_name || 'Player'}
                      </span>
                      <span className="text-sm sm:text-base flex-shrink-0">
                        {isGoal ? (isOwnGoal ? '⚠️' : '⚽') : isYellow ? '🟨' : isRed ? '🟥' : '👟'}
                      </span>
                    </div>

                    {/* Sub details: Assist or Penalty or Own Goal */}
                    {isGoal && isOwnGoal && (
                      <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.2 rounded">
                        Own Goal (o.g.)
                      </span>
                    )}

                    {isGoal && isPenalty && (
                      <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.2 rounded">
                        Penalty
                      </span>
                    )}

                    {isGoal && ev.assister_name && (
                      <div className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-end space-x-1 truncate" dir="auto">
                        <span className="text-blue-400 font-medium">Assist:</span>
                        <span dir="auto" className="truncate">{ev.assister_name}</span>
                      </div>
                    )}

                    {isAssist && (
                      <div className="text-[10px] sm:text-xs text-blue-400 font-medium">Goal Assist</div>
                    )}

                    {ev.detail && <p className="text-[10px] text-slate-500 italic truncate">{ev.detail}</p>}
                  </div>
                )}
              </div>

              {/* Center Minute Bubble / Capsule */}
              <div
                className="z-10 flex-shrink-0 flex items-center justify-center w-9 sm:w-11 h-7 sm:h-8 rounded-lg sm:rounded-xl bg-pitch-darkest border-2 shadow-lg transition group-hover:scale-105"
                style={{ borderColor: teamColor }}
              >
                <span className="font-mono font-black text-[11px] sm:text-xs text-white">
                  {ev.minute ? `${ev.minute}'` : '⏱️'}
                </span>
              </div>

              {/* Right Column (Away Event) */}
              <div className="w-[calc(50%-22px)] sm:w-[calc(50%-28px)] flex justify-start pl-2 sm:pl-5 text-left">
                {!isHomeEvent && (
                  <div className="space-y-0.5 max-w-full">
                    <div className="flex items-center space-x-1.5" dir="auto">
                      <span className="text-sm sm:text-base flex-shrink-0">
                        {isGoal ? (isOwnGoal ? '⚠️' : '⚽') : isYellow ? '🟨' : isRed ? '🟥' : '👟'}
                      </span>
                      <span dir="auto" className="font-bold text-white text-xs sm:text-sm truncate">
                        {ev.player_name || 'Player'}
                      </span>
                    </div>

                    {/* Sub details: Assist or Penalty or Own Goal */}
                    {isGoal && isOwnGoal && (
                      <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.2 rounded">
                        Own Goal (o.g.)
                      </span>
                    )}

                    {isGoal && isPenalty && (
                      <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.2 rounded">
                        Penalty
                      </span>
                    )}

                    {isGoal && ev.assister_name && (
                      <div className="text-[10px] sm:text-xs text-slate-400 flex items-center space-x-1 truncate" dir="auto">
                        <span className="text-blue-400 font-medium">Assist:</span>
                        <span dir="auto" className="truncate">{ev.assister_name}</span>
                      </div>
                    )}

                    {isAssist && (
                      <div className="text-[10px] sm:text-xs text-blue-400 font-medium">Goal Assist</div>
                    )}

                    {ev.detail && <p className="text-[10px] text-slate-500 italic truncate">{ev.detail}</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
