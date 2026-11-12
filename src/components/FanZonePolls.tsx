'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Match } from '@/lib/types';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import { MatchPollsResponse, PollState, PollOption } from '@/lib/polls';
import {
  Vote,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  ChevronRight,
  TrendingUp,
  Users,
  Search,
  BarChart3,
  Flame,
} from 'lucide-react';

interface FanZonePollsProps {
  matches: Match[];
}

export default function FanZonePolls({ matches }: FanZonePollsProps) {
  const [pollsMap, setPollsMap] = useState<Record<number, MatchPollsResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null); // "winner-123" or "motm-123"
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [now, setNow] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<'all' | 'winner' | 'motm' | 'results'>('all');
  const [selectedMotm, setSelectedMotm] = useState<Record<number, string>>({}); // matchId -> playerId
  const [motmSearch, setMotmSearch] = useState<Record<number, string>>({}); // matchId -> query
  const [expandedMotm, setExpandedMotm] = useState<Record<number, boolean>>({});

  // 1-second interval for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all polls at once
  const fetchPolls = useCallback(async (fpVal?: string) => {
    try {
      const fp = fpVal !== undefined ? fpVal : fingerprint;
      const res = await fetch(`/api/polls/bulk?fp=${encodeURIComponent(fp)}`);
      if (res.ok) {
        const json = await res.json();
        const map: Record<number, MatchPollsResponse> = {};
        for (const poll of json.polls) {
          map[poll.match_id] = poll;
        }
        setPollsMap(map);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, [fingerprint]);

  useEffect(() => {
    let mounted = true;
    getDeviceFingerprint().then((fp) => {
      if (!mounted) return;
      setFingerprint(fp);
      fetchPolls(fp);
    });
    return () => { mounted = false; };
  }, []);

  // Refresh polls periodically (every 30s)
  useEffect(() => {
    if (!fingerprint) return;
    const interval = setInterval(() => fetchPolls(), 30000);
    return () => clearInterval(interval);
  }, [fingerprint, fetchPolls]);

  const handleVote = async (matchId: number, poll: 'winner' | 'motm', choice: string) => {
    const key = `${poll}-${matchId}`;
    if (submitting) return;
    setSubmitting(key);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, poll, choice, fp: fingerprint }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Failed to submit vote');
        fetchPolls();
      } else {
        if (result.state) {
          setPollsMap((prev) => ({ ...prev, [matchId]: result.state }));
        } else {
          fetchPolls();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending vote');
    } finally {
      setSubmitting(null);
    }
  };

  // Categorize matches
  const matchMap = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of matches) map[m.id] = m;
    return map;
  }, [matches]);

  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.status === 'upcoming' && m.home_team_id > 0 && m.away_team_id > 0),
    [matches]
  );

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'live'),
    [matches]
  );

  const finishedMatchesWithMotm = useMemo(() => {
    return matches.filter((m) => {
      if (m.status !== 'finished') return false;
      const poll = pollsMap[m.id];
      if (!poll) return false;
      return poll.motm.open || poll.motm.total > 0;
    });
  }, [matches, pollsMap]);

  // Closed winner polls (with results)
  const closedWinnerResults = useMemo(() => {
    return matches.filter((m) => {
      if (m.status !== 'finished' && m.status !== 'live') return false;
      const poll = pollsMap[m.id];
      if (!poll) return false;
      return !poll.winner.open && poll.winner.total > 0;
    });
  }, [matches, pollsMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 space-x-3 text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading polls...</span>
      </div>
    );
  }

  const getMatchDate = (m: Match) => {
    if (!m.scheduled_time) return 'Date TBD';
    return new Date(m.scheduled_time).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const getMatchTime = (m: Match) => {
    if (!m.scheduled_time || !m.is_time_set) return 'Time TBD';
    return new Date(m.scheduled_time).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStageLabel = (m: Match) => {
    if (m.stage === 'group') return `Group ${m.group_id} • MD${m.matchday || 1}`;
    if (m.stage === 'semi_final') return 'Semi-Final';
    if (m.stage === 'third_place') return '3rd Place';
    if (m.stage === 'final') return 'Final 🏆';
    return m.stage;
  };

  const renderWinnerPollCard = (match: Match, isLive: boolean = false) => {
    const poll = pollsMap[match.id];
    const winnerPoll = poll?.winner;
    const hasVoted = winnerPoll?.my_choice !== null;
    const canVote = winnerPoll?.open && !hasVoted;
    const isSubmitting = submitting === `winner-${match.id}`;

    return (
      <div
        key={match.id}
        className={`rounded-2xl border overflow-hidden transition-all ${
          isLive
            ? 'bg-gradient-to-b from-red-950/30 to-pitch-card/90 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.12)]'
            : 'bg-pitch-card/80 border-pitch-border hover:border-emerald-500/40'
        }`}
      >
        {/* Match Header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
              {getStageLabel(match)}
            </span>
            <div className="flex items-center space-x-2">
              {isLive && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>LIVE</span>
                </span>
              )}
              <span className="text-[10px] text-slate-500">{getMatchDate(match)}</span>
            </div>
          </div>
        </div>

        {/* Teams Face-Off */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-7 items-center gap-2">
            {/* Home Team */}
            <div className="col-span-3 flex items-center space-x-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/15"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${match.home_team_color || '#10B981'}, #052e16)`,
                }}
              >
                <Shield className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="font-bold text-xs text-white line-clamp-2" dir="auto">
                {match.home_team_name || 'Home'}
              </span>
            </div>

            {/* VS / Score */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              {isLive ? (
                <span className="font-mono font-black text-base text-white">
                  {match.home_score ?? 0}:{match.away_score ?? 0}
                </span>
              ) : match.status === 'finished' ? (
                <span className="font-mono font-black text-base text-slate-300">
                  {match.home_score ?? 0}:{match.away_score ?? 0}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {getMatchTime(match)}
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-3 flex items-center justify-end space-x-2">
              <span className="font-bold text-xs text-white line-clamp-2 text-right" dir="auto">
                {match.away_team_name || 'Away'}
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/15"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${match.away_team_color || '#3B82F6'}, #082f49)`,
                }}
              >
                <Shield className="w-5 h-5 text-white fill-white/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Poll Section */}
        <div className="px-4 pb-4">
          {!winnerPoll || (!winnerPoll.open && winnerPoll.total === 0) ? (
            <div className="text-center py-2 text-[11px] text-slate-500 italic">
              No predictions yet
            </div>
          ) : canVote ? (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                <Vote className="w-3 h-3" />
                <span>Who will win?</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {winnerPoll.options.map((opt) => {
                  const isDraw = opt.id === 'draw';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => handleVote(match.id, 'winner', opt.id)}
                      className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-bold text-xs active:scale-[0.98] disabled:opacity-50 ${
                        isDraw
                          ? 'bg-slate-800/70 hover:bg-slate-700/80 border-slate-600/40 text-slate-200'
                          : 'bg-pitch-darkest/90 hover:border-purple-400/70 text-white border-white/10'
                      }`}
                      style={!isDraw && opt.color ? { borderLeftColor: opt.color, borderLeftWidth: 4 } : undefined}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span dir="auto" className="font-extrabold truncate text-xs sm:text-sm">
                          {opt.label}
                        </span>
                        {opt.label_ar && (
                          <span dir="rtl" className="text-[10px] text-slate-400 font-ar">
                            {opt.label_ar}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                            Vote
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                  <BarChart3 className="w-3 h-3" />
                  <span>Predictions</span>
                  {!winnerPoll.open && (
                    <span className="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full">Closed</span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500">{winnerPoll.total} votes</span>
              </div>
              {winnerPoll.options.map((opt) => {
                const count = winnerPoll.counts?.[opt.id] || 0;
                const total = Math.max(1, winnerPoll.total);
                const pct = winnerPoll.total > 0 ? Math.round((count / total) * 100) : 0;
                const isMyPick = winnerPoll.my_choice === opt.id;

                return (
                  <div key={opt.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center space-x-1.5 text-white font-semibold" dir="auto">
                        <span>{opt.label}</span>
                        {isMyPick && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-pitch-darkest border border-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: opt.color || (opt.id === 'draw' ? '#64748B' : '#A855F7'),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View match link */}
        <Link
          href={`/matches/${match.id}`}
          className="flex items-center justify-center py-2.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 border-t border-white/5 transition space-x-1"
        >
          <span>Match Details</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    );
  };

  const renderMotmCard = (match: Match) => {
    const poll = pollsMap[match.id];
    const motmPoll = poll?.motm;
    if (!motmPoll) return null;

    const hasVoted = motmPoll.my_choice !== null;
    const canVote = motmPoll.open && !hasVoted;
    const isSubmitting = submitting === `motm-${match.id}`;
    const isExpanded = expandedMotm[match.id];
    const searchQ = motmSearch[match.id] || '';
    const selectedPlayer = selectedMotm[match.id] || '';

    // Remaining countdown
    let remainingText = '';
    if (motmPoll.open && motmPoll.closes_at) {
      const msLeft = Math.max(0, motmPoll.closes_at - now);
      const minutes = Math.floor(msLeft / 60000);
      const seconds = Math.floor((msLeft % 60000) / 1000);
      remainingText = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    // Top 3 from votes
    const top3 = motmPoll.counts
      ? Object.entries(motmPoll.counts)
          .map(([id, count]) => ({
            id,
            count,
            player: motmPoll.options.find((o) => o.id === id),
            pct: motmPoll.total > 0 ? Math.round((count / motmPoll.total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
      : [];

    const filteredOptions = searchQ.trim()
      ? motmPoll.options.filter(
          (o) =>
            o.label.toLowerCase().includes(searchQ.toLowerCase()) ||
            (o.label_ar && o.label_ar.includes(searchQ))
        )
      : motmPoll.options;

    return (
      <div
        key={match.id}
        className="rounded-2xl border bg-pitch-card/80 border-pitch-border overflow-hidden"
      >
        {/* Match Header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25">
              {getStageLabel(match)}
            </span>
            <div className="flex items-center space-x-2">
              {motmPoll.open && remainingText && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  <span>{remainingText}</span>
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500">{motmPoll.total} votes</span>
            </div>
          </div>
        </div>

        {/* Score line */}
        <div className="px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-bold text-white" dir="auto">{match.home_team_name}</span>
          <span className="font-mono font-black text-sm text-slate-300">
            {match.home_score ?? 0} - {match.away_score ?? 0}
          </span>
          <span className="font-bold text-white" dir="auto">{match.away_team_name}</span>
        </div>

        {/* MOTM voting/results */}
        <div className="px-4 pb-4">
          {canVote ? (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                <Trophy className="w-3 h-3" />
                <span>Vote Man of the Match</span>
              </div>

              {!isExpanded ? (
                <button
                  type="button"
                  onClick={() => setExpandedMotm((prev) => ({ ...prev, [match.id]: true }))}
                  className="w-full min-h-[44px] rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition flex items-center justify-center space-x-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Choose Best Player</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search player..."
                    value={searchQ}
                    onChange={(e) => setMotmSearch((prev) => ({ ...prev, [match.id]: e.target.value }))}
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[44px]"
                  />
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto p-1 border border-white/5 rounded-xl bg-pitch-darkest/40">
                    {filteredOptions.map((opt) => {
                      const isSelected = selectedPlayer === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedMotm((prev) => ({ ...prev, [match.id]: opt.id }))}
                          className={`min-h-[44px] px-3 py-2 rounded-lg border text-left flex items-center justify-between transition text-xs ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white'
                              : 'bg-pitch-darkest/60 hover:bg-white/5 border-white/5 text-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold truncate flex items-center space-x-1" dir="auto">
                              <span>{opt.label}</span>
                              {opt.is_captain && <span className="text-[9px] text-amber-300 font-black">(C)</span>}
                              {opt.is_joker && <span className="text-[9px] text-purple-300 font-black">🃏</span>}
                            </div>
                            <span className="text-[10px] text-slate-500 truncate block" dir="auto">
                              {opt.team_name}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-amber-400 bg-amber-400 text-pitch-darkest' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <span className="text-[10px] font-black">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!!submitting || !selectedPlayer}
                    onClick={() => handleVote(match.id, 'motm', selectedPlayer)}
                    className="w-full min-h-[44px] py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
                  >
                    <span>{isSubmitting ? 'Submitting...' : 'Submit My Vote'}</span>
                    <Trophy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <Trophy className="w-3 h-3" />
                  <span>Fans&apos; MVP</span>
                  {!motmPoll.open && (
                    <span className="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full">Closed</span>
                  )}
                </div>
              </div>

              {motmPoll.my_choice && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center space-x-1.5 text-[11px] text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span>
                    You voted: <strong>{motmPoll.options.find((o) => o.id === motmPoll.my_choice)?.label || 'Player'}</strong>
                  </span>
                </div>
              )}

              {top3.length > 0 ? (
                <div className="space-y-1.5">
                  {top3.map((entry, idx) => {
                    const isWinner = idx === 0;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div
                        key={entry.id}
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          isWinner
                            ? 'bg-amber-500/10 border-amber-500/25'
                            : 'bg-pitch-darkest/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-sm flex-shrink-0">{medals[idx]}</span>
                          <span className="font-bold text-xs text-white truncate" dir="auto">
                            {entry.player?.label || 'Player'}
                          </span>
                          {entry.player?.team_name && (
                            <span className="text-[10px] text-slate-500 truncate hidden sm:inline" dir="auto">
                              {entry.player.team_name}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-amber-300 flex-shrink-0">
                          {entry.pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-[11px] text-slate-500 italic">
                  No votes yet
                </div>
              )}
            </div>
          )}
        </div>

        <Link
          href={`/matches/${match.id}`}
          className="flex items-center justify-center py-2.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 border-t border-white/5 transition space-x-1"
        >
          <span>Full Match Details</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    );
  };

  const hasLive = liveMatches.length > 0;
  const hasUpcoming = upcomingMatches.length > 0;
  const hasMotm = finishedMatchesWithMotm.length > 0;
  const hasClosedResults = closedWinnerResults.length > 0;
  const isEmpty = !hasLive && !hasUpcoming && !hasMotm;

  return (
    <div className="space-y-10">
      {/* Error */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-red-400 hover:text-red-300 text-xs font-bold"
          >
            ×
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
            <Vote className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-400">No Active Polls</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Polls open when matches are scheduled. Come back before the next matchday to vote on who you think will win!
          </p>
          <Link
            href="/matches"
            className="inline-flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-bold"
          >
            <span>View Match Schedule</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Category Pills Bar */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'all'
                ? 'bg-purple-500 text-white shadow-glow'
                : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
            }`}
          >
            <span>All Polls</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
              {upcomingMatches.length + liveMatches.length + finishedMatchesWithMotm.length}
            </span>
          </button>

          {(upcomingMatches.length > 0 || liveMatches.length > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab('winner')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'winner'
                  ? 'bg-purple-500 text-white shadow-glow'
                  : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Who Will Win?</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                {upcomingMatches.length + liveMatches.length}
              </span>
            </button>
          )}

          {finishedMatchesWithMotm.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('motm')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'motm'
                  ? 'bg-amber-500 text-pitch-darkest shadow-glow'
                  : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Fans&apos; MOTM</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                {finishedMatchesWithMotm.length}
              </span>
            </button>
          )}

          {closedWinnerResults.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'results'
                  ? 'bg-slate-700 text-white'
                  : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Past Predictions</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                {closedWinnerResults.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* LIVE MATCHES - Priority */}
      {(activeTab === 'all' || activeTab === 'winner') && hasLive && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-500/15 px-3 py-1 rounded-full border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Live Now</span>
            </span>
            <span className="text-xs text-slate-500">Polls close at kickoff</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveMatches.map((m) => renderWinnerPollCard(m, true))}
          </div>
        </section>
      )}

      {/* UPCOMING - Who Will Win? */}
      {(activeTab === 'all' || activeTab === 'winner') && hasUpcoming && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                <Vote className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-tight">
                  Who Will Win?
                </h2>
                <p className="text-[11px] text-slate-500">Predict the winner of upcoming matches</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {upcomingMatches.length} match{upcomingMatches.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingMatches.map((m) => renderWinnerPollCard(m))}
          </div>
        </section>
      )}

      {/* MOTM Voting */}
      {(activeTab === 'all' || activeTab === 'motm') && hasMotm && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-tight">
                  Fans&apos; Man of the Match
                </h2>
                <p className="text-[11px] text-slate-500">Vote for the best player in each match</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {finishedMatchesWithMotm.map((m) => renderMotmCard(m))}
          </div>
        </section>
      )}

      {/* Closed prediction results */}
      {(activeTab === 'all' || activeTab === 'results') && hasClosedResults && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-700/50 border border-slate-600/40 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Past Predictions
              </h2>
              <p className="text-[11px] text-slate-500">See how fans predicted these matches</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {closedWinnerResults.map((m) => renderWinnerPollCard(m))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      {!isEmpty && (
        <div className="text-center py-4 border-t border-white/5">
          <span className="text-[11px] text-slate-500 font-medium">
            🔒 One vote per phone per match. No registration needed. Predictions are just for fun!
          </span>
        </div>
      )}
    </div>
  );
}

