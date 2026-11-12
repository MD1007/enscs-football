'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Match } from '@/lib/types';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import { MatchPollsResponse, PollState, PollOption } from '@/lib/polls';
import { Vote, Trophy, Clock, CheckCircle2, AlertCircle, Sparkles, User, Shield } from 'lucide-react';

interface FanPollsProps {
  match: Match;
  className?: string;
  onFansPickLoaded?: (pick: { name: string; percentage: number } | null) => void;
}

export default function FanPolls({ match, className = '', onFansPickLoaded }: FanPollsProps) {
  const [data, setData] = useState<MatchPollsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [now, setNow] = useState<number>(Date.now());
  const [selectedMotmPlayer, setSelectedMotmPlayer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1-second interval for countdown timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch poll data with fingerprint
  const fetchPolls = async (fpVal?: string) => {
    try {
      const fp = fpVal !== undefined ? fpVal : fingerprint;
      const res = await fetch(`/api/polls?match_id=${match.id}&fp=${encodeURIComponent(fp)}`);
      if (res.ok) {
        const json: MatchPollsResponse = await res.json();
        setData(json);

        // Notify parent if fans' MVP pick is decided
        if (json.motm && !json.motm.open && json.motm.counts && json.motm.total > 0 && onFansPickLoaded) {
          let topId = '';
          let topCount = -1;
          for (const [id, count] of Object.entries(json.motm.counts)) {
            if (count > topCount) {
              topCount = count;
              topId = id;
            }
          }
          if (topId) {
            const playerOpt = json.motm.options.find((o) => o.id === topId);
            if (playerOpt) {
              const pct = Math.round((topCount / json.motm.total) * 100);
              onFansPickLoaded({ name: playerOpt.label, percentage: pct });
            }
          }
        }
      }
    } catch {
      // Ignore network errors on background refresh
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getDeviceFingerprint().then((fp) => {
      if (!isMounted) return;
      setFingerprint(fp);
      fetchPolls(fp);
    });
    return () => {
      isMounted = false;
    };
  }, [match.id]);

  const handleVote = async (poll: 'winner' | 'motm', choice: string) => {
    if (submitting || !data) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          poll,
          choice,
          fp: fingerprint,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Failed to submit vote');
        // Refresh anyway in case of conflict to get updated counts
        fetchPolls();
      } else {
        if (result.state) {
          setData(result.state);
        } else {
          fetchPolls();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-panel rounded-3xl p-6 border border-pitch-border bg-pitch-card/60 flex items-center justify-center space-x-2 text-xs text-slate-400">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading fan poll...</span>
      </div>
    );
  }

  if (!data) return null;

  const winnerPoll = data.winner;
  const motmPoll = data.motm;

  const showWinnerPoll = winnerPoll.open || (winnerPoll.total > 0 && match.status !== 'finished');
  const showMotmPoll = motmPoll.open || motmPoll.total > 0;

  if (!showWinnerPoll && !showMotmPoll) return null;

  // Render "Who will win?" section
  const renderWinnerSection = () => {
    if (!showWinnerPoll) return null;

    const hasVoted = winnerPoll.my_choice !== null;
    const canVote = winnerPoll.open && !hasVoted;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                <span>Who Will Win?</span>
                {winnerPoll.open ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Poll
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                    Closed
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">Fan predictions for this match</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-slate-400">
            {winnerPoll.total} {winnerPoll.total === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        {/* Voting controls or results */}
        {canVote ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {winnerPoll.options.map((opt) => {
              const isDraw = opt.id === 'draw';
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleVote('winner', opt.id)}
                  className={`min-h-[50px] p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 font-bold text-sm shadow-md active:scale-95 disabled:opacity-50 ${
                    isDraw
                      ? 'bg-slate-800/80 hover:bg-slate-700/90 border-slate-600/50 text-slate-200'
                      : 'bg-pitch-darkest hover:border-emerald-400 text-white border-white/15'
                  }`}
                  style={!isDraw && opt.color ? { borderLeftColor: opt.color, borderLeftWidth: 4 } : undefined}
                >
                  <span dir="auto" className="font-extrabold truncate max-w-full">
                    {opt.label}
                  </span>
                  {opt.label_ar && (
                    <span dir="rtl" className="text-[11px] text-slate-400 font-ar">
                      {opt.label_ar}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3" aria-live="polite">
            {winnerPoll.options.map((opt) => {
              const count = winnerPoll.counts?.[opt.id] || 0;
              const total = Math.max(1, winnerPoll.total);
              const percentage = winnerPoll.total > 0 ? Math.round((count / total) * 100) : 0;
              const isMyPick = winnerPoll.my_choice === opt.id;

              return (
                <div key={opt.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center space-x-1.5 text-white" dir="auto">
                      <span>{opt.label}</span>
                      {isMyPick && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded font-black">
                          Your pick ✓
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-300">
                      {percentage}% <span className="text-[10px] text-slate-500">({count})</span>
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-pitch-darkest border border-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: opt.color || (opt.id === 'draw' ? '#64748B' : '#10B981'),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render "Fans' Man of the Match" section
  const renderMotmSection = () => {
    if (!showMotmPoll) return null;

    const hasVoted = motmPoll.my_choice !== null;
    const canVote = motmPoll.open && !hasVoted;

    // Remaining countdown
    let remainingText = '';
    if (motmPoll.open && motmPoll.closes_at) {
      const msLeft = Math.max(0, motmPoll.closes_at - now);
      const minutes = Math.floor(msLeft / 60000);
      const seconds = Math.floor((msLeft % 60000) / 1000);
      remainingText = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    // Top 3 players by vote
    const top3 = useMemo(() => {
      if (!motmPoll.counts) return [];
      return Object.entries(motmPoll.counts)
        .map(([id, count]) => {
          const opt = motmPoll.options.find((o) => o.id === id);
          return {
            id,
            count,
            player: opt,
            percentage: motmPoll.total > 0 ? Math.round((count / motmPoll.total) * 100) : 0,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }, [motmPoll.counts, motmPoll.total, motmPoll.options]);

    // Group options by team for the voting list
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return motmPoll.options;
      const q = searchQuery.toLowerCase();
      return motmPoll.options.filter(
        (o) => o.label.toLowerCase().includes(q) || (o.label_ar && o.label_ar.includes(q))
      );
    }, [motmPoll.options, searchQuery]);

    return (
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                <span>Fans&apos; Man of the Match</span>
                {motmPoll.open ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Open</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                    Closed
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">Vote for your best player of this match</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {motmPoll.open && remainingText && (
              <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                <Clock className="w-3.5 h-3.5" />
                <span>Closes in {remainingText}</span>
              </div>
            )}
            <span className="text-slate-400 font-mono font-bold">
              {motmPoll.total} {motmPoll.total === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        </div>

        {/* Voting UI: player selector */}
        {canVote ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-pitch-darkest border border-pitch-border rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-white/5 rounded-2xl bg-pitch-darkest/40">
              {filteredOptions.map((opt) => {
                const isSelected = selectedMotmPlayer === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedMotmPlayer(opt.id)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-pitch-darkest/80 hover:bg-white/5 border-white/5 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs truncate flex items-center space-x-1.5" dir="auto">
                        <span>{opt.label}</span>
                        {opt.is_captain && (
                          <span className="text-[9px] text-amber-300 font-black">(C)</span>
                        )}
                        {opt.is_joker && (
                          <span className="text-[9px] text-purple-300 font-black">🃏</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block" dir="auto">
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
              disabled={submitting || !selectedMotmPlayer}
              onClick={() => handleVote('motm', selectedMotmPlayer)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <span>{submitting ? 'Submitting...' : 'Submit My Vote'}</span>
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Results: Top 3 with percentages */
          <div className="space-y-3" aria-live="polite">
            {motmPoll.my_choice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  You voted for:{' '}
                  <strong>
                    {motmPoll.options.find((o) => o.id === motmPoll.my_choice)?.label || 'Player'}
                  </strong>
                </span>
              </div>
            )}

            {top3.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Top Fan Choices
                </span>
                {top3.map((entry, idx) => {
                  const isWinner = idx === 0;
                  const isMyPick = motmPoll.my_choice === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isWinner
                          ? 'bg-amber-500/15 border-amber-500/30 shadow-sm'
                          : 'bg-pitch-darkest/60 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono text-xs w-4 font-black text-amber-400">
                            #{idx + 1}
                          </span>
                          <span className="text-white truncate" dir="auto">
                            {entry.player?.label || 'Player'}
                          </span>
                          {entry.player?.team_name && (
                            <span className="text-[10px] text-slate-400 truncate" dir="auto">
                              • {entry.player.team_name}
                            </span>
                          )}
                          {isMyPick && (
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-black">
                              Your pick
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-amber-300 flex-shrink-0">
                          {entry.percentage}%{' '}
                          <span className="text-[10px] text-slate-500">({entry.count})</span>
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-pitch-darkest border border-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isWinner ? 'bg-amber-400' : 'bg-slate-400'
                          }`}
                          style={{ width: `${entry.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                No votes recorded for Man of the Match yet.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-7 border border-pitch-border bg-pitch-card/85 space-y-5 ${className}`}>
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {renderWinnerSection()}
      {renderMotmSection()}

      {/* Honest disclaimer */}
      <div className="pt-2 text-center border-t border-white/5">
        <span className="text-[11px] text-slate-500 font-medium">
          🔒 One vote per phone. No registration required.
        </span>
      </div>
    </div>
  );
}

