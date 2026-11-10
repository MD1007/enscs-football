import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFullTournamentData } from '@/lib/tournamentService';
import {
  Shield,
  Trophy,
  Award,
  Crown,
  Star,
  Flame,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PlayerProfilePageProps {
  params: {
    id: string;
  };
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const playerId = Number(params.id);
  const data = getFullTournamentData();

  const player = data.players.find((p) => p.id === playerId);
  if (!player) return notFound();

  const team = data.teams.find((t) => t.id === player.team_id);

  // Player matches history
  const teamMatches = data.matches.filter(
    (m) => m.home_team_id === player.team_id || m.away_team_id === player.team_id
  );

  // Parse match performance breakdown
  const matchHistory = teamMatches.map((m) => {
    const isHome = m.home_team_id === player.team_id;
    const opponentTeamName = isHome ? m.away_team_name : m.home_team_name;
    const opponentTeamColor = isHome ? m.away_team_color : m.home_team_color;
    const teamScore = isHome ? m.home_score : m.away_score;
    const opponentScore = isHome ? m.away_score : m.home_score;

    let result: 'win' | 'draw' | 'loss' | 'pending' = 'pending';
    if (m.status === 'finished' && teamScore != null && opponentScore != null) {
      if (Number(teamScore) > Number(opponentScore)) result = 'win';
      else if (Number(teamScore) < Number(opponentScore)) result = 'loss';
      else result = 'draw';
    }

    // In-match events for this player
    const playerEvents = (m.events || []).filter((e) => e.player_id === player.id);
    const goals = playerEvents.filter((e) => e.event_type === 'goal' && e.sub_type !== 'own_goal');
    const assists = (m.events || []).filter((e) => e.assister_id === player.id);
    const yellowCards = playerEvents.filter((e) => e.event_type === 'yellow_card');
    const redCards = playerEvents.filter((e) => e.event_type === 'red_card');
    const isMVP = m.mvp_player_id === player.id;

    return {
      match: m,
      isHome,
      opponentTeamName,
      opponentTeamColor,
      teamScore,
      opponentScore,
      result,
      goals,
      assists,
      yellowCards,
      redCards,
      isMVP,
    };
  });

  const teamColor = team?.color || '#10B981';

  // Badges & Accolades
  const isPOT = data.awards?.pot_revealed && data.awards?.pot_winner?.id === player.id;
  const isTOTT =
    data.awards?.tott_revealed &&
    data.awards?.tott_data &&
    [
      ...(data.awards.tott_data.starters || []),
      ...(data.awards.tott_data.substitutes || []),
    ].some((p) => p.player_id === player.id);

  // Check category leaders
  const isTopScorer = data.top_scorers.length > 0 && data.top_scorers[0].player.id === player.id && (player.goals || 0) > 0;
  const isTopAssister = data.top_assists.length > 0 && data.top_assists[0].player.id === player.id && (player.assists || 0) > 0;
  const isTopMVP = data.top_mvps.length > 0 && data.top_mvps[0].player.id === player.id && (player.mvps || 0) > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back Button */}
      <div>
        <Link
          href={`/teams/${team?.id || ''}`}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 transition group-hover:-translate-x-1 text-emerald-400" />
          <span dir="auto">Back to {team?.name || 'Tournament'}</span>
        </Link>
      </div>

      {/* HERO SECTION: EA FC / FUT STYLE PLAYER CARD */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-br from-pitch-card via-pitch-darkest to-pitch-card relative overflow-hidden shadow-2xl">
        {/* Glow behind card */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: teamColor }}
        />

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            {/* Generated EA FC Player Avatar Card */}
            <div
              className="w-28 h-36 sm:w-32 sm:h-40 rounded-2xl p-1 flex flex-col justify-between items-center relative shadow-2xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${teamColor}99, #090e17 60%, ${teamColor}44)`,
                border: `2px solid ${teamColor}`,
              }}
            >
              <div className="w-full flex items-center justify-between px-2 pt-1 text-[10px] font-black uppercase text-white/80">
                <span>{player.position || 'FWD'}</span>
                <span>#{player.squad_number || player.id}</span>
              </div>

              {/* Avatar Initials */}
              <div className="w-16 h-16 rounded-full bg-pitch-darkest/80 border border-white/20 flex items-center justify-center font-black text-2xl text-white shadow-inner">
                {player.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>

              <div className="w-full text-center pb-1">
                <span className="font-mono font-black text-xs text-emerald-400">
                  {player.overall_points || 0} POT
                </span>
              </div>
            </div>

            {/* Player Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span dir="auto"
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-pitch-darkest"
                  style={{ backgroundColor: teamColor }}
                >
                  {team?.name || 'Tournament'}
                </span>
                {player.is_captain && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    Captain (C)
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight" dir="auto">
                {player.name}
              </h1>

              {player.name_ar && (
                <p className="text-sm font-arabic text-slate-400" dir="rtl">
                  {player.name_ar}
                </p>
              )}

              {/* Dynamic Hyping Nicknames */}
              {player.nicknames && player.nicknames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {player.nicknames.map((nick, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-pitch-darkest shadow-md flex items-center space-x-1"
                      title={nick.subtitle}
                    >
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span>{nick.title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Rating Badge */}
          <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Performance Index</span>
            <div className="font-mono font-black text-4xl sm:text-5xl text-emerald-400">
              {player.overall_points || 0}
            </div>
            <span className="text-[10px] text-slate-400">Tournament Points</span>
          </div>
        </div>

        {/* STATISTICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-6 mt-6 border-t border-white/10 text-center">
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Matches</span>
            <span className="text-xl font-mono font-black text-white">{player.matches_played || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Goals</span>
            <span className="text-xl font-mono font-black text-emerald-400">{player.goals || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Assists</span>
            <span className="text-xl font-mono font-black text-blue-400">{player.assists || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">MVPs</span>
            <span className="text-xl font-mono font-black text-amber-400">{player.mvps || 0} ⭐</span>
          </div>
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Yellow Cards</span>
            <span className="text-xl font-mono font-black text-yellow-400">{player.yellow_cards || 0} 🟨</span>
          </div>
          <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Red Cards</span>
            <span className="text-xl font-mono font-black text-red-400">{player.red_cards || 0} 🟥</span>
          </div>
        </div>
      </div>

      {/* OFFICIAL TOURNAMENT ACHIEVEMENTS */}
      <div className="glass-panel rounded-2xl p-5 border border-pitch-border bg-pitch-card/80 space-y-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Tournament Achievements</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Player of the tournament award */}
          {isPOT && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 space-y-1">
              <span className="text-xs font-black uppercase text-amber-300 flex items-center space-x-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Player of the Tournament</span>
              </span>
              <p className="text-xs text-slate-300">Official tournament MVP & Golden Ball winner</p>
            </div>
          )}

          {/* Team of the tournament */}
          {isTOTT && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 space-y-1">
              <span className="text-xs font-black uppercase text-emerald-300 flex items-center space-x-1">
                <Star className="w-4 h-4 text-emerald-400" />
                <span>Team of the Tournament</span>
              </span>
              <p className="text-xs text-slate-300">Selected in the official tournament Best 7</p>
            </div>
          )}

          {/* Top Scorer */}
          {isTopScorer && (
            <div className="p-4 rounded-xl bg-pitch-darkest border border-amber-400/30 space-y-1">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center space-x-1">
                <Flame className="w-4 h-4" />
                <span>El Cyber Goleador</span>
              </span>
              <p className="text-xs text-slate-300">Current top goalscorer of the competition</p>
            </div>
          )}

          {/* Top Assister */}
          {isTopAssister && (
            <div className="p-4 rounded-xl bg-pitch-darkest border border-blue-400/30 space-y-1">
              <span className="text-xs font-black uppercase text-blue-400 flex items-center space-x-1">
                <Sparkles className="w-4 h-4" />
                <span>The Master Architect</span>
              </span>
              <p className="text-xs text-slate-300">Leading the tournament in assists</p>
            </div>
          )}

          {/* Top MVP */}
          {isTopMVP && (
            <div className="p-4 rounded-xl bg-pitch-darkest border border-purple-400/30 space-y-1">
              <span className="text-xs font-black uppercase text-purple-300 flex items-center space-x-1">
                <Crown className="w-4 h-4" />
                <span>Tournament Kingpin</span>
              </span>
              <p className="text-xs text-slate-300">Most Man of the Match awards</p>
            </div>
          )}

          {!isPOT && !isTOTT && !isTopScorer && !isTopAssister && !isTopMVP && (
            <div className="sm:col-span-3 text-center py-4 text-xs text-slate-400 italic">
              Active participant in the ENSCS Football Tournament 2026. Official individual awards will be finalized after the tournament final.
            </div>
          )}
        </div>
      </div>

      {/* PERFORMANCE HISTORY: MATCH BY MATCH */}
      <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Match Performance History
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {matchHistory.length} Tournament Fixture{matchHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {matchHistory.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8 italic">
            No matches scheduled for this player's team yet.
          </p>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((item) => {
              const m = item.match;
              const isFinished = m.status === 'finished';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-pitch-darkest border border-white/5 hover:border-white/10 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {m.stage === 'group' ? `Group ${m.group_id} • Matchday ${m.matchday}` : m.stage.toUpperCase()}
                      </span>
                      {item.result === 'win' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Win</span>
                        </span>
                      )}
                      {item.result === 'draw' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <MinusCircle className="w-3 h-3 text-amber-400" />
                          <span>Draw</span>
                        </span>
                      )}
                      {item.result === 'loss' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/30 flex items-center space-x-1">
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span>Loss</span>
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/matches/${m.id}`}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      View Match Center →
                    </Link>
                  </div>

                  {/* Match Teams & Score */}
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-400">vs</span>
                      <span className="font-bold text-white" dir="auto">
                        {item.opponentTeamName}
                      </span>
                    </div>

                    <div className="font-mono font-black text-sm sm:text-base">
                      {isFinished ? (
                        <span className="text-white">
                          {m.home_score ?? 0} - {m.away_score ?? 0}
                        </span>
                      ) : (
                        <span className="text-slate-500">Upcoming</span>
                      )}
                    </div>
                  </div>

                  {/* Player Match Events & Honors */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {item.goals.length > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center space-x-1">
                        <span>⚽</span>
                        <span>
                          {item.goals.length} Goal{item.goals.length > 1 ? 's' : ''}{' '}
                          ({item.goals.map((g) => `${g.minute || 0}'`).join(', ')})
                        </span>
                      </span>
                    )}

                    {item.assists.length > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold flex items-center space-x-1">
                        <span>👟</span>
                        <span>
                          {item.assists.length} Assist{item.assists.length > 1 ? 's' : ''}
                        </span>
                      </span>
                    )}

                    {item.isMVP && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black flex items-center space-x-1">
                        <span>👑</span>
                        <span>Man of the Match (MVP)</span>
                      </span>
                    )}

                    {item.yellowCards.length > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 font-bold flex items-center space-x-1">
                        <span>🟨</span>
                        <span>Yellow Card</span>
                      </span>
                    )}

                    {item.redCards.length > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-bold flex items-center space-x-1">
                        <span>🟥</span>
                        <span>Red Card</span>
                      </span>
                    )}

                    {isFinished &&
                      item.goals.length === 0 &&
                      item.assists.length === 0 &&
                      !item.isMVP &&
                      item.yellowCards.length === 0 &&
                      item.redCards.length === 0 && (
                        <span className="text-[11px] text-slate-500 italic">
                          Appearance recorded (no goals or disciplinary cards).
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
