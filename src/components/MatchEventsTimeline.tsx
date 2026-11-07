'use client';

import React from 'react';
import { Match, MatchEvent } from '@/lib/types';
import { Shield } from 'lucide-react';

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
    <div className="relative py-4">
      {/* Center line for timeline on medium+ screens */}
      <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/40 via-white/10 to-transparent -translate-x-1/2 hidden sm:block" />

      <div className="space-y-4">
        {sortedEvents.map((ev, index) => {
          // For normal/penalty goals or cards: event is assigned to ev.team_id
          // For own_goal: ev.team_id is the team of the player who made the mistake,
          // which is visually tied to that team, but counts as a goal for the opponent!
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
              className="relative flex items-center sm:justify-between w-full group"
            >
              {/* Desktop Left (Home Event) */}
              <div className="hidden sm:flex sm:w-1/2 justify-end pr-8">
                {isHomeEvent && (
                  <div className="max-w-xs text-right space-y-1">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="font-bold text-white text-sm" dir="auto">
                        {ev.player_name || 'Player'}
                      </span>
                      <span className="text-base">
                        {isGoal ? (isOwnGoal ? '⚠️' : '⚽') : isYellow ? '🟨' : isRed ? '🟥' : '👟'}
                      </span>
                    </div>

                    {/* Sub details: Assist or Penalty or Own Goal */}
                    {isGoal && isOwnGoal && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.2 rounded-full">
                        Own Goal (o.g.)
                      </span>
                    )}

                    {isGoal && isPenalty && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.2 rounded-full">
                        Penalty Kick
                      </span>
                    )}

                    {isGoal && ev.assister_name && (
                      <div className="text-xs text-slate-400 flex items-center justify-end space-x-1" dir="auto">
                        <span className="text-[11px] text-blue-400 font-medium">Assist:</span>
                        <span>{ev.assister_name}</span>
                      </div>
                    )}

                    {isAssist && (
                      <div className="text-xs text-blue-400 font-medium">Goal Assist</div>
                    )}

                    {ev.detail && <p className="text-[11px] text-slate-500 italic">{ev.detail}</p>}
                  </div>
                )}
              </div>

              {/* Center Minute Bubble */}
              <div className="z-10 flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-pitch-darkest border-2 shadow-lg transition group-hover:scale-105"
                   style={{ borderColor: teamColor }}>
                <span className="font-mono font-black text-xs text-white">
                  {ev.minute ? `${ev.minute}'` : '⏱️'}
                </span>
              </div>

              {/* Desktop Right (Away Event) */}
              <div className="hidden sm:flex sm:w-1/2 justify-start pl-8">
                {!isHomeEvent && (
                  <div className="max-w-xs text-left space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">
                        {isGoal ? (isOwnGoal ? '⚠️' : '⚽') : isYellow ? '🟨' : isRed ? '🟥' : '👟'}
                      </span>
                      <span className="font-bold text-white text-sm" dir="auto">
                        {ev.player_name || 'Player'}
                      </span>
                    </div>

                    {isGoal && isOwnGoal && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.2 rounded-full">
                        Own Goal (o.g.)
                      </span>
                    )}

                    {isGoal && isPenalty && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.2 rounded-full">
                        Penalty Kick
                      </span>
                    )}

                    {isGoal && ev.assister_name && (
                      <div className="text-xs text-slate-400 flex items-center space-x-1" dir="auto">
                        <span className="text-[11px] text-blue-400 font-medium">Assist:</span>
                        <span>{ev.assister_name}</span>
                      </div>
                    )}

                    {isAssist && (
                      <div className="text-xs text-blue-400 font-medium">Goal Assist</div>
                    )}

                    {ev.detail && <p className="text-[11px] text-slate-500 italic">{ev.detail}</p>}
                  </div>
                )}
              </div>

              {/* Mobile View (All screens < sm) */}
              <div className="sm:hidden flex-1 ml-3 p-2.5 rounded-xl bg-pitch-darkest border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {isGoal ? (isOwnGoal ? '⚠️' : '⚽') : isYellow ? '🟨' : isRed ? '🟥' : '👟'}
                    </span>
                    <span className="font-bold text-white text-xs truncate" dir="auto">
                      {ev.player_name}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: `${teamColor}22`,
                      color: teamColor,
                      border: `1px solid ${teamColor}44`,
                    }}
                  >
                    {isHomeEvent ? match.home_team_name : match.away_team_name}
                  </span>
                </div>

                {isGoal && isOwnGoal && (
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.2 rounded">
                    Own Goal (o.g.)
                  </span>
                )}

                {isGoal && isPenalty && (
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.2 rounded">
                    Penalty Kick
                  </span>
                )}

                {isGoal && ev.assister_name && (
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1" dir="auto">
                    <span className="text-blue-400 font-semibold">Assist:</span>
                    <span>{ev.assister_name}</span>
                  </div>
                )}

                {isAssist && <div className="text-[11px] text-blue-400 font-medium">Goal Assist</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
