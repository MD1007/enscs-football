import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFullTournamentData } from '@/lib/tournamentService';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import MatchStatisticsView from '@/components/MatchStatisticsView';
import MatchMVPSpotlight from '@/components/MatchMVPSpotlight';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Award,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MatchPageProps {
  params: {
    id: string;
  };
}

export default function MatchDetailPage({ params }: MatchPageProps) {
  const matchId = Number(params.id);
  const data = getFullTournamentData();

  const match = data.matches.find((m) => m.id === matchId);
  if (!match) return notFound();

  const homeTeam = data.teams.find((t) => t.id === match.home_team_id);
  const awayTeam = data.teams.find((t) => t.id === match.away_team_id);

  const homePlayers = data.players.filter((p) => p.team_id === match.home_team_id);
  const awayPlayers = data.players.filter((p) => p.team_id === match.away_team_id);

  const mvpPlayer = data.players.find((p) => p.id === match.mvp_player_id);

  const allMatches = data.matches;
  const currentIndex = allMatches.findIndex((m) => m.id === matchId);
  const prevMatch = currentIndex > 0 ? allMatches[currentIndex - 1] : null;
  const nextMatch = currentIndex < allMatches.length - 1 ? allMatches[currentIndex + 1] : null;

  const formattedDate = new Date(match.scheduled_time).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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

  const getStageTitle = () => {
    if (match.stage === 'group') return `Group ${match.group_id} • Matchday ${match.matchday || 1}`;
    if (match.stage === 'semi_final') return 'Semi-Final Match';
    if (match.stage === 'third_place') return '3rd Place Bronze Playoff';
    if (match.stage === 'final') return 'Grand Final 🏆';
    return match.stage;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/matches"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-pitch-card border border-pitch-border"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Matches</span>
        </Link>

        <div className="flex items-center space-x-2">
          {prevMatch && (
            <Link
              href={`/matches/${prevMatch.id}`}
              className="p-1.5 rounded-xl bg-pitch-card border border-pitch-border text-slate-400 hover:text-white text-xs"
              title="Previous Match"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}

          <span
            className={`text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${getGroupBadgeColor(
              match.group_id
            )}`}
          >
            {getStageTitle()}
          </span>

          {nextMatch && (
            <Link
              href={`/matches/${nextMatch.id}`}
              className="p-1.5 rounded-xl bg-pitch-card border border-pitch-border text-slate-400 hover:text-white text-xs"
              title="Next Match"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Stadium Scoreboard Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-pitch-border bg-gradient-to-r from-emerald-950/40 via-pitch-card to-blue-950/40 relative overflow-hidden shadow-2xl">
        <div className="text-center pb-6 border-b border-white/5">
          <span
            className={`inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${
              match.status === 'live'
                ? 'bg-red-500 text-white animate-pulse'
                : match.status === 'finished'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/10 text-slate-300'
            }`}
          >
            {match.status}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{match.venue || 'Terrain ENSCS'}</span>
            </div>
          </div>
        </div>

        {/* Big Teams & Score Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6 py-8">
          {/* Home Team */}
          <div className="md:col-span-2 flex flex-col items-center md:items-end text-center md:text-right space-y-3">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: match.home_team_color || '#10B981' }}
            >
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-90" />
            </div>
            <div>
              <Link
                href={homeTeam ? `/teams/${homeTeam.id}` : '#'}
                className="text-xl sm:text-3xl font-black text-white hover:text-emerald-400 transition"
                dir="auto"
              >
                {match.home_team_name || 'TBD'}
              </Link>
              {homeTeam?.name_ar && (
                <p className="text-xs sm:text-sm text-slate-400 font-ar" dir="rtl">
                  {homeTeam.name_ar}
                </p>
              )}
            </div>
          </div>

          {/* Center Score */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="text-center">
                <div className="font-mono font-black text-3xl sm:text-6xl text-white px-4 sm:px-6 py-2 rounded-2xl bg-pitch-darkest border border-white/10 shadow-inner whitespace-nowrap inline-flex items-center justify-center gap-2">
                  <span>{match.home_score ?? 0}</span>
                  <span className="text-emerald-400">:</span>
                  <span>{match.away_score ?? 0}</span>
                </div>
                {match.home_penalties !== null && match.away_penalties !== null && (
                  <span className="text-xs text-amber-400 font-mono font-bold mt-2 block">
                    Penalties: {match.home_penalties} - {match.away_penalties}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-400 text-sm">
                VS
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="md:col-span-2 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
            >
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-90" />
            </div>
            <div>
              <Link
                href={awayTeam ? `/teams/${awayTeam.id}` : '#'}
                className="text-xl sm:text-3xl font-black text-white hover:text-emerald-400 transition"
                dir="auto"
              >
                {match.away_team_name || 'TBD'}
              </Link>
              {awayTeam?.name_ar && (
                <p className="text-xs sm:text-sm text-slate-400 font-ar" dir="rtl">
                  {awayTeam.name_ar}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Match MVP Showcase */}
      {(match.mvp_player_name || mvpPlayer) && (
        <MatchMVPSpotlight match={match} player={mvpPlayer} />
      )}

      {/* EA Sports FC Inspired Match Events Timeline */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pitch-border bg-pitch-card/80 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight">
                Match Events Timeline
              </h3>
              <p className="text-xs text-slate-400">
                Chronological sequence of goals, assists, and disciplinary cards
              </p>
            </div>
          </div>
        </div>

        <MatchEventsTimeline match={match} />
      </div>

      {/* Match Statistics & Comparison */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pitch-border bg-pitch-card/80 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight">
                Match Statistics
              </h3>
              <p className="text-xs text-slate-400">
                In-depth performance breakdown between both squads
              </p>
            </div>
          </div>
        </div>

        <MatchStatisticsView match={match} />
      </div>

      {/* Team Rosters Side by Side */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Team Squad Lineups</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Squad */}
          <div className="glass-panel rounded-2xl p-5 border border-pitch-border bg-pitch-card/70 space-y-3">
            <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider" dir="auto">
              {match.home_team_name} Roster
            </h4>
            <div className="space-y-1.5 text-xs">
              {homePlayers.map((p, idx) => {
                const pGoals = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'goal' && e.sub_type !== 'own_goal'
                ).length;
                const pAssists = (match.events || []).filter(
                  (e) => (e.player_id === p.id && e.event_type === 'assist') || e.assister_id === p.id
                ).length;
                const pYellow = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'yellow_card'
                ).length;
                const pRed = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'red_card'
                ).length;

                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-pitch-darkest/60 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                      <Link
                        href={`/players/${p.id}`}
                        className="font-semibold text-white hover:text-emerald-400 transition hover:underline"
                        dir="auto"
                      >
                        {p.name}
                      </Link>
                      {p.is_captain && (
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-black">
                          (C)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {pGoals > 0 && <span className="text-xs">⚽ {pGoals}</span>}
                      {pAssists > 0 && <span className="text-xs">👟 {pAssists}</span>}
                      {pYellow > 0 && <span className="text-xs">🟨 {pYellow}</span>}
                      {pRed > 0 && <span className="text-xs">🟥 {pRed}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Away Squad */}
          <div className="glass-panel rounded-2xl p-5 border border-pitch-border bg-pitch-card/70 space-y-3">
            <h4 className="font-bold text-sm text-blue-400 uppercase tracking-wider" dir="auto">
              {match.away_team_name} Roster
            </h4>
            <div className="space-y-1.5 text-xs">
              {awayPlayers.map((p, idx) => {
                const pGoals = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'goal' && e.sub_type !== 'own_goal'
                ).length;
                const pAssists = (match.events || []).filter(
                  (e) => (e.player_id === p.id && e.event_type === 'assist') || e.assister_id === p.id
                ).length;
                const pYellow = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'yellow_card'
                ).length;
                const pRed = (match.events || []).filter(
                  (e) => e.player_id === p.id && e.event_type === 'red_card'
                ).length;

                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-pitch-darkest/60 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                      <Link
                        href={`/players/${p.id}`}
                        className="font-semibold text-white hover:text-emerald-400 transition hover:underline"
                        dir="auto"
                      >
                        {p.name}
                      </Link>
                      {p.is_captain && (
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-black">
                          (C)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {pGoals > 0 && <span className="text-xs">⚽ {pGoals}</span>}
                      {pAssists > 0 && <span className="text-xs">👟 {pAssists}</span>}
                      {pYellow > 0 && <span className="text-xs">🟨 {pYellow}</span>}
                      {pRed > 0 && <span className="text-xs">🟥 {pRed}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
