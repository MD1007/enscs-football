'use client';

import React from 'react';
import Link from 'next/link';
import { X, Shield, Calendar, MapPin, Award } from 'lucide-react';
import { Match, MatchEvent } from '@/lib/types';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export default function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  if (!match) return null;

  const events = match.events || [];
  const goals = events.filter((e) => e.event_type === 'goal');
  const assists = events.filter((e) => e.event_type === 'assist');
  const yellowCards = events.filter((e) => e.event_type === 'yellow_card');
  const redCards = events.filter((e) => e.event_type === 'red_card');

  const formattedDate = new Date(match.scheduled_time).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

  const getStageName = () => {
    if (match.stage === 'group') return `Group ${match.group_id} • Matchday ${match.matchday || 1}`;
    if (match.stage === 'semi_final') return 'Semi-Final';
    if (match.stage === 'third_place') return '3rd Place Playoff';
    if (match.stage === 'final') return 'Grand Final 🏆';
    return match.stage;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-pitch-darkest border border-pitch-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-950/40 via-pitch-card to-blue-950/40 p-6 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 mb-4">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getGroupBadgeColor(
                match.group_id
              )}`}
            >
              {getStageName()}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                match.status === 'live'
                  ? 'bg-red-500 text-white animate-pulse'
                  : match.status === 'finished'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700/50 text-slate-300'
              }`}
            >
              {match.status}
            </span>
          </div>

          {/* Teams and Score Display */}
          <div className="grid grid-cols-5 items-center gap-4 py-2">
            {/* Home Team */}
            <div className="col-span-2 text-right">
              <div
                className="font-bold text-lg sm:text-2xl text-white tracking-tight break-words"
                dir="auto"
              >
                {match.home_team_name || 'TBD'}
              </div>
              <span className="text-xs text-slate-400 font-medium">Home Team</span>
            </div>

            {/* Score */}
            <div className="col-span-1 text-center flex items-center justify-center">
              {match.status === 'finished' || match.status === 'live' ? (
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white px-3 sm:px-4 py-1 rounded-xl bg-pitch-dark border border-white/10 shadow-inner whitespace-nowrap inline-flex items-center justify-center gap-1.5">
                    <span>{match.home_score ?? 0}</span>
                    <span className="text-emerald-400 font-bold">:</span>
                    <span>{match.away_score ?? 0}</span>
                  </div>
                  {match.home_penalties !== null && match.away_penalties !== null && (
                    <div className="text-[11px] font-semibold text-amber-400 mt-1 whitespace-nowrap">
                      (Pen: {match.home_penalties} - {match.away_penalties})
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-400 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5 whitespace-nowrap">
                  VS
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-2 text-left">
              <div
                className="font-bold text-lg sm:text-2xl text-white tracking-tight break-words"
                dir="auto"
              >
                {match.away_team_name || 'TBD'}
              </div>
              <span className="text-xs text-slate-400 font-medium">Away Team</span>
            </div>
          </div>

          {/* Date & Venue */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{match.venue || 'Terrain ENSCS'}</span>
            </div>
          </div>
        </div>

        {/* Match Events Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Award className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-sm">No detailed match events recorded yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Goalscorers, assists, and disciplinary cards will appear here once entered by the administrator.
              </p>
            </div>
          ) : (
            <>
              {/* Goals Section */}
              {goals.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2 mb-3">
                    <span>⚽</span>
                    <span>Goals Scored ({goals.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-card border border-pitch-border text-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {goal.minute ? `${goal.minute}'` : '⚽'}
                          </span>
                          <span className="font-semibold text-white" dir="auto">
                            {goal.player_name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400" dir="auto">
                          {goal.team_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assists Section */}
              {assists.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-2 mb-3">
                    <span>👟</span>
                    <span>Assists ({assists.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {assists.map((assist) => (
                      <div
                        key={assist.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-card border border-pitch-border text-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-blue-400 font-mono font-bold text-xs bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            👟
                          </span>
                          <span className="font-semibold text-white" dir="auto">
                            {assist.player_name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400" dir="auto">
                          {assist.team_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disciplinary Cards Section */}
              {(yellowCards.length > 0 || redCards.length > 0) && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2 mb-3">
                    <span>🟨 🟥</span>
                    <span>Disciplinary Cards</span>
                  </h4>
                  <div className="space-y-2">
                    {yellowCards.map((yc) => (
                      <div
                        key={yc.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-card border border-amber-500/20 text-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-3.5 h-5 bg-amber-400 rounded-sm inline-block shadow-sm"></span>
                          <span className="font-semibold text-white" dir="auto">
                            {yc.player_name}
                          </span>
                          {yc.minute && <span className="text-xs text-slate-400 font-mono">({yc.minute}')</span>}
                        </div>
                        <span className="text-xs text-slate-400" dir="auto">
                          {yc.team_name}
                        </span>
                      </div>
                    ))}
                    {redCards.map((rc) => (
                      <div
                        key={rc.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-card border border-red-500/30 text-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-3.5 h-5 bg-red-600 rounded-sm inline-block shadow-sm animate-pulse"></span>
                          <span className="font-semibold text-white" dir="auto">
                            {rc.player_name}
                          </span>
                          {rc.minute && <span className="text-xs text-slate-400 font-mono">({rc.minute}')</span>}
                        </div>
                        <span className="text-xs text-slate-400" dir="auto">
                          {rc.team_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-pitch-dark border-t border-pitch-border flex items-center justify-between">
          <Link
            href={`/matches/${match.id}`}
            className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>Open Dedicated Match Page</span>
            <span>↗</span>
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold tracking-wide transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

