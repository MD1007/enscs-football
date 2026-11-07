'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Match } from '@/lib/types';
import MatchEventsTimeline from './MatchEventsTimeline';
import MatchStatisticsView from './MatchStatisticsView';
import {
  X,
  Shield,
  Calendar,
  MapPin,
  Activity,
  BarChart3,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export default function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');

  if (!match) return null;

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
    <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn flex min-h-full items-start sm:items-center justify-center">
      <div
        className="relative w-full max-w-2xl bg-pitch-darkest border border-pitch-border rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-950/40 via-pitch-card to-blue-950/40 p-5 sm:p-6 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
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
          <div className="grid grid-cols-5 items-center gap-2 sm:gap-4 py-2">
            {/* Home Team */}
            <div className="col-span-2 text-right">
              <div
                className="font-bold text-base sm:text-2xl text-white tracking-tight break-words truncate"
                dir="auto"
              >
                {match.home_team_name || 'TBD'}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Home Team</span>
            </div>

            {/* Score */}
            <div className="col-span-1 text-center flex items-center justify-center">
              {match.status === 'finished' || match.status === 'live' ? (
                <div className="flex flex-col items-center">
                  <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-white px-2.5 sm:px-4 py-1 rounded-xl bg-pitch-dark border border-white/10 shadow-inner whitespace-nowrap inline-flex items-center justify-center gap-1.5">
                    <span>{match.home_score ?? 0}</span>
                    <span className="text-emerald-400 font-bold">:</span>
                    <span>{match.away_score ?? 0}</span>
                  </div>
                  {match.home_penalties !== null && match.away_penalties !== null && (
                    <div className="text-[10px] font-semibold text-amber-400 mt-1 whitespace-nowrap">
                      ({match.home_penalties}-{match.away_penalties}p)
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-400 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5 whitespace-nowrap">
                  VS
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-2 text-left">
              <div
                className="font-bold text-base sm:text-2xl text-white tracking-tight break-words truncate"
                dir="auto"
              >
                {match.away_team_name || 'TBD'}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Away Team</span>
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

          {/* Official MVP Highlight */}
          {match.mvp_player_name && (
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-base">
                  ⭐
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Man of the Match (MVP)
                  </span>
                  <span className="text-sm font-black text-white" dir="auto">
                    {match.mvp_player_name}
                  </span>
                </div>
              </div>
              {match.mvp_team_name && (
                <span className="text-xs font-semibold text-slate-300 px-2.5 py-1 rounded-lg bg-pitch-darkest border border-white/10" dir="auto">
                  {match.mvp_team_name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Modal Tabs Navigation: Timeline vs Stats */}
        <div className="flex items-center border-b border-white/10 px-5 bg-pitch-darkest/90">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'stats'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistics</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 max-h-[50vh] overflow-y-auto">
          {activeTab === 'timeline' ? (
            <MatchEventsTimeline match={match} />
          ) : (
            <MatchStatisticsView match={match} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-pitch-darkest border-t border-pitch-border flex items-center justify-between">
          <Link
            href={`/matches/${match.id}`}
            className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>Open Full Match Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold tracking-wide transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
