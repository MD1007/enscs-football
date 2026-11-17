'use client';

import React, { useState, useEffect } from 'react';
import { Match, Team, StandingRow } from '@/lib/types';
import { GitBranch, Trophy, Award, Sparkles, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminKnockoutPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<any>({});
  const [bestSecond, setBestSecond] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches || []);
        setTeams(data.teams || []);
        setStandings(data.standings || {});
        setBestSecond(data.best_second || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupMatches = matches.filter((m) => m.stage === 'group');
  const finishedGroupCount = groupMatches.filter((m) => m.status === 'finished').length;
  const isGroupFinished = groupMatches.length > 0 && finishedGroupCount === groupMatches.length;

  const playoffMatch = matches.find((m) => m.stage === 'playoff');
  const playoffSet = Boolean(playoffMatch?.home_team_id && playoffMatch?.away_team_id);
  const semisDrawn = matches.some((m) => m.stage === 'semi_final' && (m.home_team_id || m.away_team_id));
  const nextStep = !isGroupFinished
    ? 'locked'
    : semisDrawn
    ? 'done'
    : !playoffSet
    ? 'playoff'
    : playoffMatch?.status === 'finished'
    ? 'draw'
    : 'wait_playoff';

  const callKnockout = async (action: 'auto_populate' | 'reset') => {
    setPopulating(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Request failed');
      setFeedback({ type: 'success', message: resData.message || 'Done.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Request failed' });
    } finally {
      setPopulating(false);
    }
  };

  const handleAutoPopulate = () => {
    if (nextStep === 'draw' && !confirm('Run the random draw for the semi-finals now? It cannot be redone without a reset.')) return;
    void callKnockout('auto_populate');
  };

  const handleReset = () => {
    if (!confirm('Clear every knockout fixture that has not been played yet (teams and fan votes)?')) return;
    void callKnockout('reset');
  };

  const sfMatches = matches.filter((m) => m.stage === 'semi_final');
  const thirdMatch = matches.find((m) => m.stage === 'third_place');
  const finalMatch = matches.find((m) => m.stage === 'final');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Playoff Progression</span>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Knockout Stage Manager</h1>
        <p className="text-sm text-slate-400">
          Randomly draw semi-final matchups from the 3 group winners and the 2nd-place playoff winner, or manually configure playoff ties.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Auto-Populate Action Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-pitch-card to-pitch-darkest space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-lg">Random Draw & Qualification Engine</h3>
            </div>
            <p className="text-xs text-slate-300">
              As in the rules: when every group match is finished, the two best runners-up play a playoff for the 4th
              place. Then the three group winners and the playoff winner are drawn at random into the two semi-finals.
            </p>
            <div className="text-[11px] text-slate-400 pt-1">
              Group Progress: <strong className="text-emerald-400">{finishedGroupCount}</strong> /{' '}
              <strong>{groupMatches.length}</strong> matches completed.
            </div>
            <div className="text-[11px] text-slate-300 pt-1" dir="auto">
              {nextStep === 'locked' &&
                `Locked until the group stage ends (${groupMatches.length - finishedGroupCount} group match${
                  groupMatches.length - finishedGroupCount === 1 ? '' : 'es'
                } left). Current leaders: ${standings.A?.[0]?.team_name || 'TBD'}, ${standings.B?.[0]?.team_name || 'TBD'}, ${
                  standings.C?.[0]?.team_name || 'TBD'
                }; best runners-up: ${bestSecond?.[0]?.team_name || 'TBD'} and ${bestSecond?.[1]?.team_name || 'TBD'}.`}
              {nextStep === 'playoff' &&
                `Next: create the playoff ${bestSecond?.[0]?.team_name || 'TBD'} vs ${bestSecond?.[1]?.team_name || 'TBD'}.`}
              {nextStep === 'wait_playoff' &&
                `Waiting for the playoff ${playoffMatch?.home_team_name} vs ${playoffMatch?.away_team_name} to be played (enter its result in the Match Center).`}
              {nextStep === 'draw' && 'Playoff finished: ready for the semi-final draw.'}
              {nextStep === 'done' && 'Semi-finals drawn.'}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={handleAutoPopulate}
              disabled={populating || nextStep === 'locked' || nextStep === 'wait_playoff' || nextStep === 'done'}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center justify-center space-x-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${populating ? 'animate-spin' : ''}`} />
              <span>
                {populating
                  ? 'Working...'
                  : nextStep === 'playoff'
                  ? 'Create 2nd-place Playoff'
                  : nextStep === 'draw'
                  ? '🎲 Run Semi-final Draw'
                  : nextStep === 'done'
                  ? 'Semi-finals drawn'
                  : nextStep === 'wait_playoff'
                  ? 'Waiting for the playoff'
                  : 'Locked: group stage running'}
              </span>
            </button>
            <button
              onClick={handleReset}
              disabled={populating}
              className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-bold text-[11px] uppercase tracking-wider transition"
            >
              Reset knockout fixtures
            </button>
          </div>
        </div>
      </div>

      {/* 2nd-place playoff */}
      {playoffMatch && (
        <div className="glass-panel rounded-2xl p-5 border border-purple-500/40 bg-pitch-card/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-purple-300 font-black uppercase tracking-wider">
            <span>2nd-place Playoff (4th semi-final place)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5">{playoffMatch.status}</span>
          </div>
          <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
            <span dir="auto">{playoffMatch.home_team_name || 'Best runner-up 1'}</span>
            <span className="font-mono text-purple-300">{playoffMatch.home_score ?? '-'}</span>
          </div>
          <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
            <span dir="auto">{playoffMatch.away_team_name || 'Best runner-up 2'}</span>
            <span className="font-mono text-purple-300">{playoffMatch.away_score ?? '-'}</span>
          </div>
        </div>
      )}

      {/* Knockout Fixtures List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Semi Finals */}
        <div className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/80 space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Semi-Final Fixtures</h3>
          </div>

          <div className="space-y-4">
            {sfMatches.map((m, idx) => (
              <div key={m.id} className="p-4 rounded-xl bg-pitch-darkest border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-bold uppercase">
                  <span>Semi-Final {idx + 1}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5">{m.status}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span>{m.home_team_name || 'Qualified Team (Random Draw)'}</span>
                  <span className="font-mono text-emerald-400">{m.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span dir="auto">{m.away_team_name || 'Qualified Team (Random Draw)'}</span>
                  <span className="font-mono text-emerald-400">{m.away_score ?? '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finals */}
        <div className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/80 space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Grand Final & Bronze Playoff</h3>
          </div>

          <div className="space-y-4">
            {finalMatch && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-400 font-black uppercase tracking-wider">
                  <span>Grand Final 🏆</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20">{finalMatch.status}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span dir="auto">{finalMatch.home_team_name || 'Winner Semi-Final 1'}</span>
                  <span className="font-mono text-amber-400">{finalMatch.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span dir="auto">{finalMatch.away_team_name || 'Winner Semi-Final 2'}</span>
                  <span className="font-mono text-amber-400">{finalMatch.away_score ?? '-'}</span>
                </div>
              </div>
            )}

            {thirdMatch && (
              <div className="p-4 rounded-xl bg-pitch-darkest border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-bold uppercase">
                  <span>3rd Place Match 🥉</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5">{thirdMatch.status}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span dir="auto">{thirdMatch.home_team_name || 'Loser Semi-Final 1'}</span>
                  <span className="font-mono text-slate-300">{thirdMatch.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span dir="auto">{thirdMatch.away_team_name || 'Loser Semi-Final 2'}</span>
                  <span className="font-mono text-slate-300">{thirdMatch.away_score ?? '-'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

