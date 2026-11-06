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

  const handleAutoPopulate = async () => {
    if (!isGroupFinished) {
      if (
        !confirm(
          `Notice: Group stage is incomplete (${finishedGroupCount}/${groupMatches.length} played). Are you sure you want to populate knockout brackets based on current interim rankings?`
        )
      ) {
        return;
      }
    }

    setPopulating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_populate' }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to populate bracket');

      setFeedback({ type: 'success', message: 'Knockout bracket populated with qualified teams!' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Auto-qualification failed' });
    } finally {
      setPopulating(false);
    }
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
          Automatically populate semi-finals from group winners + best 2nd place, or manually configure playoff ties.
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
              <h3 className="font-bold text-white text-lg">Automatic Qualification Engine</h3>
            </div>
            <p className="text-xs text-slate-300">
              Evaluates current standings: Group A Leader ({standings.A?.[0]?.team_name || 'TBD'}), Group B Leader (
              {standings.B?.[0]?.team_name || 'TBD'}), Group C Leader ({standings.C?.[0]?.team_name || 'TBD'}) and the
              best 2nd-place ({bestSecond?.[0]?.team_name || 'TBD'}).
            </p>
            <div className="text-[11px] text-slate-400 pt-1">
              Group Progress: <strong className="text-emerald-400">{finishedGroupCount}</strong> /{' '}
              <strong>{groupMatches.length}</strong> matches completed.
            </div>
          </div>

          <button
            onClick={handleAutoPopulate}
            disabled={populating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${populating ? 'animate-spin' : ''}`} />
            <span>{populating ? 'Processing...' : 'Auto-Populate Bracket'}</span>
          </button>
        </div>
      </div>

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
                  <span>{m.home_team_name || `1st Place Group ${idx === 0 ? 'A' : 'B'}`}</span>
                  <span className="font-mono text-emerald-400">{m.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span>{m.away_team_name || (idx === 0 ? 'Best 2nd Place Team' : '1st Place Group C')}</span>
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
                  <span>{finalMatch.home_team_name || 'Winner Semi-Final 1'}</span>
                  <span className="font-mono text-amber-400">{finalMatch.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span>{finalMatch.away_team_name || 'Winner Semi-Final 2'}</span>
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
                  <span>{thirdMatch.home_team_name || 'Loser Semi-Final 1'}</span>
                  <span className="font-mono text-slate-300">{thirdMatch.home_score ?? '-'}</span>
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-between" dir="auto">
                  <span>{thirdMatch.away_team_name || 'Loser Semi-Final 2'}</span>
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

