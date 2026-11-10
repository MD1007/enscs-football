import React from 'react';
import Link from 'next/link';
import { getFullTournamentData } from '@/lib/tournamentService';
import MatchCard from '@/components/MatchCard';
import FeaturedMatchBanner, { getFeaturedMatch } from '@/components/FeaturedMatchBanner';
import {
  Trophy,
  Users,
  Calendar,
  Flame,
  Award,
  ChevronRight,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Crown,
  Star,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const data = getFullTournamentData();

  const {
    teams,
    matches,
    standings,
    top_scorers,
    top_assists,
    summary,
  } = data;

  const { match: featuredMatch } = getFeaturedMatch(matches);

  // Other upcoming matches (excluding the spotlight match to avoid duplication)
  const upcomingMatches = matches
    .filter((m) => (m.status === 'upcoming' || m.status === 'live') && m.id !== featuredMatch?.id)
    .slice(0, 4);

  const recentResults = matches
    .filter((m) => m.status === 'finished')
    .slice(0, 4);

  const topScorer = top_scorers.length > 0 ? top_scorers[0] : null;
  const topAssister = top_assists.length > 0 ? top_assists[0] : null;
  const topMvp = data.top_mvps && data.top_mvps.length > 0 ? data.top_mvps[0] : null;

  const leaderA = standings.A?.[0];
  const leaderB = standings.B?.[0];
  const leaderC = standings.C?.[0];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-pitch-border bg-gradient-to-b from-pitch-dark/80 via-pitch-darkest to-pitch-darkest">
        {/* Subtle Pitch Aesthetic Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/15 via-blue-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Official Competition Platform</span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
                ENSCS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">FOOTBALL</span> TOURNAMENT
              </h1>
              <p className="text-sm sm:text-lg text-slate-300 font-medium">
                National Higher School of Cybersecurity • Algiers, Algeria
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Experience the pinnacle of university football. Real-time match scores, official group tables, live disciplinary records, and the road to the 2026 Cyber Trophy.
            </p>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/matches"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider transition-all shadow-glow flex items-center space-x-2"
              >
                <span>View All Matches</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/standings"
                className="px-6 py-3 rounded-xl bg-pitch-card hover:bg-pitch-cardHover border border-pitch-border text-white font-bold text-xs uppercase tracking-wider transition flex items-center space-x-2"
              >
                <span>League Tables</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mt-14">
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border text-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto mb-2" />
              <div className="font-mono text-2xl sm:text-3xl font-black text-white">{summary.total_teams}</div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Teams Competing</div>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border text-center">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-2" />
              <div className="font-mono text-2xl sm:text-3xl font-black text-white">{summary.matches_played}</div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Matches Played</div>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border text-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto mb-2" />
              <div className="font-mono text-2xl sm:text-3xl font-black text-white">{summary.matches_remaining}</div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Remaining</div>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border text-center">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mx-auto mb-2" />
              <div className="font-mono text-2xl sm:text-3xl font-black text-white">{summary.total_goals}</div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Total Goals</div>
            </div>

            <div className="col-span-2 md:col-span-1 glass-card rounded-2xl p-4 sm:p-5 border border-pitch-border text-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 mx-auto mb-2" />
              <div className="font-bold text-sm sm:text-base text-white truncate">{summary.current_stage}</div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Current Stage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
        {/* MATCHDAY SPOTLIGHT: Live Match (Priority) or Closest Upcoming Match */}
        <FeaturedMatchBanner matches={matches} players={data.players} />

        {/* Other Upcoming Fixtures Section */}
        {upcomingMatches.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Match Schedule</span>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">More Upcoming Matches</h2>
              </div>
              <Link
                href="/matches"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center space-x-1"
              >
                <span>Full Schedule</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} allMatches={matches} allPlayers={data.players} />
              ))}
            </div>
          </section>
        )}

        {/* Group Leaders & Golden Boot Spotlight */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Group Leaders */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 border border-pitch-border space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Standings</span>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Current Group Leaders</h3>
              </div>
              <Link href="/standings" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
                <span>View Tables</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Group A Leader */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                    Group A
                  </span>
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-base text-white truncate" dir="auto">
                    {leaderA ? leaderA.team_name : 'TBD'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {leaderA ? `${leaderA.points} Pts • ${leaderA.won}W ${leaderA.drawn}D ${leaderA.lost}L` : '0 Pts'}
                  </div>
                </div>
              </div>

              {/* Group B Leader */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/40">
                    Group B
                  </span>
                  <Trophy className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-base text-white truncate" dir="auto">
                    {leaderB ? leaderB.team_name : 'TBD'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {leaderB ? `${leaderB.points} Pts • ${leaderB.won}W ${leaderB.drawn}D ${leaderB.lost}L` : '0 Pts'}
                  </div>
                </div>
              </div>

              {/* Group C Leader */}
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">
                    Group C
                  </span>
                  <Trophy className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <div className="font-bold text-base text-white truncate" dir="auto">
                    {leaderC ? leaderC.team_name : 'TBD'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {leaderC ? `${leaderC.points} Pts • ${leaderC.won}W ${leaderC.drawn}D ${leaderC.lost}L` : '0 Pts'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Honors & Accolades Spotlight */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pitch-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Player Honors</span>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Tournament Stars</h3>
              </div>
              <Link href="/mvps" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center space-x-1">
                <span>View MVPs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Top Scorer */}
            <Link href="/scorers" className="block p-4 rounded-2xl bg-pitch-card hover:bg-pitch-cardHover border border-amber-500/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Top Goalscorer</span>
                      {topScorer?.player.nicknames?.[0] && (
                        <span className="text-[9px] bg-amber-400 text-pitch-darkest px-1.5 py-0.2 rounded font-black">
                          {topScorer.player.nicknames[0].title}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-white" dir="auto">
                      {topScorer ? topScorer.player.name : 'No goals yet'}
                    </div>
                    <div className="text-xs text-slate-400" dir="auto">
                      {topScorer ? topScorer.player.team_name : '-'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xl text-amber-400">
                    {topScorer ? `${topScorer.goals} ⚽` : '0'}
                  </span>
                </div>
              </div>
            </Link>

            {/* Top Assister */}
            <Link href="/assists" className="block p-4 rounded-2xl bg-pitch-card hover:bg-pitch-cardHover border border-blue-500/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Top Playmaker</span>
                      {topAssister?.player.nicknames?.[0] && (
                        <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-black">
                          {topAssister.player.nicknames[0].title}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-white" dir="auto">
                      {topAssister ? topAssister.player.name : 'No assists yet'}
                    </div>
                    <div className="text-xs text-slate-400" dir="auto">
                      {topAssister ? topAssister.player.team_name : '-'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xl text-blue-400">
                    {topAssister ? `${topAssister.assists} 👟` : '0'}
                  </span>
                </div>
              </div>
            </Link>

            {/* Most MVPs */}
            <Link href="/mvps" className="block p-4 rounded-2xl bg-pitch-card hover:bg-pitch-cardHover border border-purple-500/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Tournament MVP</span>
                      {topMvp?.player.nicknames?.[0] && (
                        <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.2 rounded font-black">
                          {topMvp.player.nicknames[0].title}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-white" dir="auto">
                      {topMvp ? topMvp.player.name : 'No awards yet'}
                    </div>
                    <div className="text-xs text-slate-400" dir="auto">
                      {topMvp ? topMvp.player.team_name : '-'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xl text-purple-400">
                    {topMvp ? `${topMvp.mvps} ⭐` : '0'}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Latest Results Section (if any finished matches) */}
        {recentResults.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Official Results</span>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Recent Matches</h2>
              </div>
              <Link
                href="/matches"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center space-x-1"
              >
                <span>All Results</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentResults.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

