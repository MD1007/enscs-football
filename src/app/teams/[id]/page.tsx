import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFullTournamentData } from '@/lib/tournamentService';
import MatchCard from '@/components/MatchCard';
import {
  Shield,
  Trophy,
  Users,
  ChevronLeft,
  Flame,
  Award,
  Star,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TeamPageProps {
  params: {
    id: string;
  };
}

export default function TeamProfilePage({ params }: TeamPageProps) {
  const teamId = Number(params.id);
  const data = getFullTournamentData();

  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return notFound();

  // Find standings row for this team
  const groupRows = data.standings[team.group_id] || [];
  const teamStanding = groupRows.find((r) => r.team_id === teamId);

  // Matches for this team
  const teamMatches = data.matches.filter(
    (m) => m.home_team_id === teamId || m.away_team_id === teamId
  );

  // Players with individual stats
  const teamPlayers = data.players.filter((p) => p.team_id === teamId);

  // Calculate player individual goals/assists/cards
  const playerStatsMap: Record<number, { goals: number; assists: number; yellow: number; red: number }> = {};
  teamPlayers.forEach((p) => {
    playerStatsMap[p.id] = { goals: 0, assists: 0, yellow: 0, red: 0 };
  });

  for (const m of teamMatches) {
    if (!m.events) continue;
    for (const ev of m.events) {
      if (playerStatsMap[ev.player_id]) {
        if (ev.event_type === 'goal') playerStatsMap[ev.player_id].goals += 1;
        if (ev.event_type === 'assist') playerStatsMap[ev.player_id].assists += 1;
        if (ev.event_type === 'yellow_card') playerStatsMap[ev.player_id].yellow += 1;
        if (ev.event_type === 'red_card') playerStatsMap[ev.player_id].red += 1;
      }
    }
  }

  const captain = teamPlayers.find((p) => p.is_captain);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Back button */}
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-pitch-card border border-pitch-border"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Teams</span>
        </Link>
      </div>

      {/* Team Header Hero Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-pitch-border relative overflow-hidden shadow-2xl">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none"
          style={{ backgroundColor: team.color || '#3B82F6' }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center font-black text-white text-3xl shadow-xl flex-shrink-0"
              style={{ backgroundColor: team.color || '#3B82F6' }}
            >
              <Shield className="w-12 h-12 opacity-90" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                  Group {team.group_id}
                </span>
                {teamStanding && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    {teamStanding.position === 1 ? '🥇 Group Leader' : `Rank #${teamStanding.position}`}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight" dir="auto">
                {team.name}
              </h1>
              {team.name_ar && (
                <p className="text-base sm:text-lg text-slate-300 font-ar mt-1" dir="rtl">
                  {team.name_ar}
                </p>
              )}
            </div>
          </div>

          {/* Captain Card */}
          <div className="p-4 rounded-2xl bg-pitch-darkest/60 border border-white/10 flex items-center space-x-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-400">Team Captain</span>
              <div className="font-bold text-white text-sm" dir="auto">
                {captain ? captain.name : team.captain_name || 'To be confirmed'}
              </div>
            </div>
          </div>
        </div>

        {/* Standings Summary Metrics */}
        {teamStanding && (
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 mt-8 pt-8 border-t border-white/5">
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Played</span>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{teamStanding.played}</div>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Won</span>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">{teamStanding.won}</div>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Drawn</span>
              <div className="text-xl font-mono font-bold text-slate-300 mt-0.5">{teamStanding.drawn}</div>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-red-400 uppercase">Lost</span>
              <div className="text-xl font-mono font-bold text-red-400 mt-0.5">{teamStanding.lost}</div>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">GF / GA</span>
              <div className="text-xl font-mono font-bold text-white mt-0.5">
                {teamStanding.goals_for} / {teamStanding.goals_against}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">GD</span>
              <div className="text-xl font-mono font-bold text-white mt-0.5">
                {teamStanding.goal_difference > 0 ? `+${teamStanding.goal_difference}` : teamStanding.goal_difference}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Points</span>
              <div className="text-2xl font-mono font-black text-emerald-300 mt-0.5">{teamStanding.points}</div>
            </div>
          </div>
        )}
      </div>

      {/* Players Roster & Detailed Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Roster & Records</span>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Player Squad</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {teamPlayers.length} Player{teamPlayers.length === 1 ? '' : 's'} Registered
          </span>
        </div>

        <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Player Name</th>
                  <th className="py-3 px-4 text-center">Role</th>
                  <th className="py-3 px-4 text-center font-bold text-amber-400">Goals ⚽</th>
                  <th className="py-3 px-4 text-center font-bold text-blue-400">Assists 👟</th>
                  <th className="py-3 px-4 text-center text-amber-300">Yellow 🟨</th>
                  <th className="py-3 px-4 text-center text-red-400">Red 🟥</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teamPlayers.map((player, idx) => {
                  const pStats = playerStatsMap[player.id] || { goals: 0, assists: 0, yellow: 0, red: 0 };
                  return (
                    <tr key={player.id} className="transition hover:bg-white/[0.04]">
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{player.name}</span>
                          {player.name_ar && player.name_ar !== player.name && (
                            <span className="text-xs text-slate-400 font-ar" dir="rtl">
                              ({player.name_ar})
                            </span>
                          )}
                        </div>
                        {player.nicknames && player.nicknames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {player.nicknames.map((nick, nIdx) => (
                              <span
                                key={nIdx}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                title={nick.subtitle}
                              >
                                {nick.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {player.is_captain ? (
                          <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-full">
                            Captain (C)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Player</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                        {pStats.goals}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-400">
                        {pStats.assists}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {pStats.yellow}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {pStats.red}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Matches for this team */}
      <div className="space-y-4 pt-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fixtures</span>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Team Fixtures & Results</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}

