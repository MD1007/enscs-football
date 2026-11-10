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
  ArrowRight,
  Radio,
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
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            {isLive ? (
              <span className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/15 px-3 py-1 rounded-full border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Live Action Center</span>
              </span>
            ) : isUpcoming ? (
              <span className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next Upcoming Match</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 px-3 py-1 rounded-full border border-blue-500/30">
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <span>Latest Match Result</span>
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

        {/* Pro Stadium Match Card */}
        <div
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setModalOpen(true)}
          className={`group relative rounded-3xl p-4 sm:p-7 border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${
            isLive
              ? 'bg-gradient-to-b from-red-950/40 via-pitch-darkest/95 to-pitch-card/90 border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.2)] hover:border-red-400'
              : 'bg-gradient-to-b from-emerald-950/30 via-pitch-darkest/95 to-pitch-card/90 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.15)] hover:border-emerald-400'
          }`}
        >
          {/* Subtle Stadium Radial Lighting Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 rounded-full blur-3xl pointer-events-none opacity-25 ${
              isLive ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />

          <div className="relative z-10 space-y-4 sm:space-y-5">
            {/* Top Bar: Group Badge & Timing */}
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pitch-darkest/90 border border-white/10 text-emerald-300">
                {getStageLabel()}
              </span>

              <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">{match.venue || 'Terrain ENSCS'}</span>
                {!isLive && !isFinished && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-slate-300">{formattedDate}</span>
                  </>
                )}
              </div>
            </div>

            {/* Stadium Scoreboard: Horizontal Face-Off (Mobile-Perfect) */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-center py-1 sm:py-2">
              {/* Home Team (3 cols) */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/15 relative overflow-hidden group-hover:scale-105 transition-transform"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${match.home_team_color || '#10B981'}, #052e16)`,
                    boxShadow: `0 4px 18px ${match.home_team_color ? match.home_team_color + '35' : 'rgba(16,185,129,0.25)'}`,
                  }}
                >
                  <Shield className="w-8 h-8 sm:w-11 sm:h-11 text-white fill-white/20 drop-shadow" />
                </div>
                <div className="w-full">
                  <h3
                    className="font-black text-sm sm:text-xl text-white tracking-tight line-clamp-2 group-hover:text-emerald-400 transition"
                    dir="auto"
                  >
                    {match.home_team_name || 'Home Team'}
                  </h3>
                  {isUpcoming && homeForm.length > 0 && (
                    <div className="mt-1.5 flex items-center justify-center">
                      <FormPills form={homeForm} />
                    </div>
                  )}
                </div>
              </div>

              {/* Center Scoreboard / Live Hub (1 col) */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                {isLive ? (
                  <div className="flex flex-col items-center space-y-1">
                    {/* Live Ticking Minute Badge */}
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-red-500/25 border border-red-500/50 text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-wider animate-pulse whitespace-nowrap shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>LIVE</span>
                      <LiveMinute match={match} className="font-mono text-white font-black" />
                    </span>

                    {/* Big Bold Score */}
                    <div className="font-mono font-black text-3xl sm:text-5xl text-white tracking-tight flex items-center justify-center space-x-1 sm:space-x-2 py-0.5">
                      <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                        {match.home_score ?? 0}
                      </span>
                      <span className="text-slate-600 font-sans font-light">:</span>
                      <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                        {match.away_score ?? 0}
                      </span>
                    </div>
                  </div>
                ) : isFinished ? (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                      Full Time
                    </span>
                    <div className="font-mono font-black text-3xl sm:text-5xl text-white tracking-tight flex items-center justify-center space-x-1 sm:space-x-2">
                      <span>{match.home_score ?? 0}</span>
                      <span className="text-slate-600 font-sans">:</span>
                      <span>{match.away_score ?? 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pitch-darkest to-pitch-card border border-emerald-500/40 flex items-center justify-center font-black text-xs sm:text-sm text-emerald-400 shadow-glow">
                      VS
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {match.is_time_set ? formattedTime : 'Time TBD'}
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team (3 cols) */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/15 relative overflow-hidden group-hover:scale-105 transition-transform"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${match.away_team_color || '#3B82F6'}, #082f49)`,
                    boxShadow: `0 4px 18px ${match.away_team_color ? match.away_team_color + '35' : 'rgba(59,130,246,0.25)'}`,
                  }}
                >
                  <Shield className="w-8 h-8 sm:w-11 sm:h-11 text-white fill-white/20 drop-shadow" />
                </div>
                <div className="w-full">
                  <h3
                    className="font-black text-sm sm:text-xl text-white tracking-tight line-clamp-2 group-hover:text-emerald-400 transition"
                    dir="auto"
                  >
                    {match.away_team_name || 'Away Team'}
                  </h3>
                  {isUpcoming && awayForm.length > 0 && (
                    <div className="mt-1.5 flex items-center justify-center">
                      <FormPills form={awayForm} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Match MVP Pill if awarded */}
            {match.mvp_player_name && (
              <div className="flex justify-center">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] sm:text-xs font-bold shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Man of the Match: {match.mvp_player_name}</span>
                </div>
              </div>
            )}

            {/* Live Goalscorers Timeline (Split 2-Column Preview) */}
            {(isLive || isFinished) && goalEvents.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-pitch-darkest/70 border border-white/5 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div className="space-y-1 text-left sm:text-center" dir="auto">
                  {homeGoals.map((g, idx) => (
                    <div key={idx} className="truncate">
                      ⚽ <span className="font-semibold">{g.player_name}</span>{' '}
                      <span className="font-mono text-emerald-400 font-bold">{g.minute}&apos;</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-right sm:text-center" dir="auto">
                  {awayGoals.map((g, idx) => (
                    <div key={idx} className="truncate">
                      ⚽ <span className="font-semibold">{g.player_name}</span>{' '}
                      <span className="font-mono text-emerald-400 font-bold">{g.minute}&apos;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Bar & Full-Width Touch Button */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center text-center text-[11px] sm:text-xs text-slate-400">
                {isLive ? (
                  <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>Real-time pitch action & stats updated live</span>
                  </span>
                ) : mainStake ? (
                  <span className="line-clamp-1 text-slate-300">
                    <strong className="text-emerald-400 font-bold uppercase mr-1">Stakes:</strong>
                    {mainStake}
                  </span>
                ) : (
                  <span>Tap to open match timeline, head-to-head records & line-ups</span>
                )}
              </div>

              {/* High-Impact Mobile CTA Button */}
              <button
                type="button"
                className={`w-full min-h-[48px] sm:min-h-[52px] rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-glow flex items-center justify-center space-x-2 active:scale-[0.98] ${
                  isLive
                    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                <span>{isLive ? 'Open Live Match Center' : isUpcoming ? 'Match Preview & Analysis' : 'Open Match Center'}</span>
                <ArrowRight className="w-4 h-4" />
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
