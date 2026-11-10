'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Match, Player } from '@/lib/types';
import LiveMinute from './LiveMinute';
import MatchDetailModal from './MatchDetailModal';
import { FormPills } from './MatchPreview';
import { getTeamForm, getMatchStakes, getFeaturedMatch } from '@/lib/matchPreview';
import {
  Calendar,
  Clock,
  Flame,
  Shield,
  Sparkles,
  ChevronRight,
  Trophy,
  Star,
  MapPin,
  Activity,
  Play,
  ArrowRight,
} from 'lucide-react';

interface FeaturedMatchBannerProps {
  matches: Match[];
  players?: Player[];
}

export default function FeaturedMatchBanner({ matches, players = [] }: FeaturedMatchBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { match, isLive } = getFeaturedMatch(matches);

  if (!match) return null;

  const isFinished = match.status === 'finished';
  const isUpcoming = match.status === 'upcoming' || match.status === 'postponed';

  const homeForm = match.home_team_id ? getTeamForm(match.home_team_id, matches, 3) : [];
  const awayForm = match.away_team_id ? getTeamForm(match.away_team_id, matches, 3) : [];

  const stakes = isUpcoming ? getMatchStakes(match, matches) : [];
  const mainStake = stakes.length > 0 ? stakes[0] : null;

  const formattedDate = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBD';

  const formattedTime = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Time TBD';

  const getStageLabel = () => {
    if (match.stage === 'group') return `Group ${match.group_id} • Matchday ${match.matchday || 1}`;
    if (match.stage === 'semi_final') return 'Semi-Final';
    if (match.stage === 'third_place') return '3rd Place Match';
    if (match.stage === 'final') return 'Grand Final 🏆';
    return match.stage;
  };

  const goalEvents = match.events ? match.events.filter((e) => e.event_type === 'goal') : [];
  const homeGoals = goalEvents.filter(
    (e) => (e.sub_type === 'own_goal' ? e.team_id !== match.home_team_id : e.team_id === match.home_team_id)
  );
  const awayGoals = goalEvents.filter(
    (e) => (e.sub_type === 'own_goal' ? e.team_id !== match.away_team_id : e.team_id === match.away_team_id)
  );

  return (
    <>
      <section className="space-y-3">
        {/* Section Header with live pulse */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isLive ? (
              <span className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/40 shadow-glow">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Live Action Center</span>
              </span>
            ) : isUpcoming ? (
              <span className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next Upcoming Match</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 px-3 py-1 rounded-full border border-blue-500/30">
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <span>Latest Matchday Result</span>
              </span>
            )}
            <span className="hidden sm:inline text-xs text-slate-400">
              • {isLive ? 'Currently playing on the pitch' : isUpcoming ? 'Next on the schedule' : 'Finished fixture'}
            </span>
          </div>

          <Link
            href="/matches"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center space-x-1"
          >
            <span>All Matches</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Featured Spotlight Card */}
        <div
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setModalOpen(true)}
          className={`group relative glass-panel rounded-3xl p-6 sm:p-8 border transition-all duration-300 cursor-pointer overflow-hidden ${
            isLive
              ? 'border-red-500/50 bg-gradient-to-r from-red-950/40 via-pitch-card to-emerald-950/30 shadow-glow hover:border-red-400'
              : 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-pitch-card to-teal-950/30 shadow-glow hover:border-emerald-400'
          }`}
        >
          {/* Subtle Ambient Background Lighting */}
          <div
            className={`absolute top-0 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
              isLive ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />

          <div className="relative z-10 space-y-6">
            {/* Top Bar: Stage & Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-pitch-darkest border border-white/10 text-emerald-300">
                  {getStageLabel()}
                </span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{match.venue || 'Terrain ENSCS'}</span>
                </span>
              </div>

              {isLive ? (
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-2 text-xs font-black text-red-300 bg-red-500/30 border border-red-500/50 px-3.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>LIVE</span>
                    <LiveMinute match={match} className="font-mono text-white ml-1 font-bold" />
                  </span>
                </div>
              ) : isFinished ? (
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Final Result
                </span>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formattedDate}</span>
                  <span className="text-slate-500">•</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{match.is_time_set ? formattedTime : 'Time TBD'}</span>
                </div>
              )}
            </div>

            {/* Central Scoreboard / Teams Face-Off */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
              {/* Home Team (Cols 1-3) */}
              <div className="md:col-span-3 flex md:flex-row-reverse items-center justify-between md:justify-start gap-4">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10"
                  style={{ backgroundColor: match.home_team_color || '#10B981' }}
                >
                  <Shield className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-white/20" />
                </div>
                <div className="md:text-right flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate group-hover:text-emerald-400 transition" dir="auto">
                    {match.home_team_name || 'Home Team'}
                  </h3>
                  {isUpcoming && homeForm.length > 0 && (
                    <div className="mt-2 flex items-center md:justify-end space-x-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Form:</span>
                      <FormPills form={homeForm} />
                    </div>
                  )}
                  {/* Goal events preview */}
                  {(isLive || isFinished) && homeGoals.length > 0 && (
                    <div className="mt-2 space-y-0.5 text-xs text-slate-300 md:text-right" dir="auto">
                      {homeGoals.map((g, idx) => (
                        <div key={idx} className="flex items-center md:justify-end space-x-1 text-[11px]">
                          <span>⚽ {g.player_name}</span>
                          <span className="font-mono text-emerald-400">({g.minute}&apos;)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Center Match Hub (Col 4) */}
              <div className="md:col-span-1 text-center py-2 md:py-0 flex flex-col items-center justify-center">
                {isLive || isFinished ? (
                  <div className="space-y-1">
                    <div className="font-mono font-black text-4xl sm:text-6xl text-white tracking-tight flex items-center justify-center space-x-3">
                      <span className={isLive ? 'text-emerald-400' : 'text-white'}>{match.home_score ?? 0}</span>
                      <span className="text-slate-600 font-sans">:</span>
                      <span className={isLive ? 'text-emerald-400' : 'text-white'}>{match.away_score ?? 0}</span>
                    </div>
                    {match.mvp_player_name && (
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>MVP: {match.mvp_player_name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-pitch-darkest border border-emerald-500/40 flex items-center justify-center font-black text-base text-emerald-400 shadow-glow">
                      VS
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kickoff Upcoming
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team (Cols 5-7) */}
              <div className="md:col-span-3 flex items-center justify-between md:justify-start gap-4">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10"
                  style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
                >
                  <Shield className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-white/20" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate group-hover:text-emerald-400 transition" dir="auto">
                    {match.away_team_name || 'Away Team'}
                  </h3>
                  {isUpcoming && awayForm.length > 0 && (
                    <div className="mt-2 flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Form:</span>
                      <FormPills form={awayForm} />
                    </div>
                  )}
                  {/* Goal events preview */}
                  {(isLive || isFinished) && awayGoals.length > 0 && (
                    <div className="mt-2 space-y-0.5 text-xs text-slate-300" dir="auto">
                      {awayGoals.map((g, idx) => (
                        <div key={idx} className="flex items-center space-x-1 text-[11px]">
                          <span>⚽ {g.player_name}</span>
                          <span className="font-mono text-emerald-400">({g.minute}&apos;)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Action & Context */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                {isLive ? (
                  <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>Real-time match events & player stats updating live</span>
                  </span>
                ) : mainStake ? (
                  <span className="line-clamp-1 text-slate-300">
                    <strong className="text-emerald-400 font-bold uppercase mr-1">Stakes:</strong>
                    {mainStake}
                  </span>
                ) : (
                  <span>Click to view head-to-head records and match analytics</span>
                )}
              </div>

              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/15 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 group-hover:border-emerald-500/50"
              >
                <span>{isLive ? 'Open Live Center' : isUpcoming ? 'Match Preview & H2H' : 'Match Center'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Match Details & Preview Modal */}
      {modalOpen && (
        <MatchDetailModal
          match={match}
          onClose={() => setModalOpen(false)}
          context={{ matches, players }}
        />
      )}
    </>
  );
}

