'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Match, Team, Player, MatchEvent } from '@/lib/types';
import {
  Calendar,
  Save,
  Plus,
  Trash2,
  X,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle,
  Flame,
  Award,
  Filter,
  Crown,
  Star,
} from 'lucide-react';

export default function AdminMatchesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading match management...</div>}>
      <AdminMatchesContent />
    </Suspense>
  );
}

function AdminMatchesContent() {
  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get('match_id');

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Active match being edited
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Form states for match editor
  const [homeScore, setHomeScore] = useState<string>('0');
  const [awayScore, setAwayScore] = useState<string>('0');
  const [homePenalties, setHomePenalties] = useState<string>('');
  const [awayPenalties, setAwayPenalties] = useState<string>('');
  const [status, setStatus] = useState<string>('finished');
  const [mvpPlayerId, setMvpPlayerId] = useState<number | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [venue, setVenue] = useState<string>('');
  const [events, setEvents] = useState<
    Array<{
      player_id: number;
      team_id: number;
      event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
      minute?: number | null;
      detail?: string | null;
      player_name?: string;
      team_name?: string;
    }>
  >([]);

  // Event creation form state
  const [newEventTeamId, setNewEventTeamId] = useState<number>(0);
  const [newEventPlayerId, setNewEventPlayerId] = useState<number>(0);
  const [newEventType, setNewEventType] = useState<'goal' | 'assist' | 'yellow_card' | 'red_card'>('goal');
  const [newEventMinute, setNewEventMinute] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dedicated Schedule Modal states
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('15:00');
  const [scheduleVenue, setScheduleVenue] = useState<string>('Terrain ENSCS');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchTournamentData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches || []);
        setTeams(data.teams || []);
        setPlayers(data.players || []);
        setLoading(false);

        // If URL has match_id, automatically open it
        if (initialMatchId) {
          const target = (data.matches || []).find((m: Match) => m.id === Number(initialMatchId));
          if (target) openMatchEditor(target);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const openScheduleModal = (match: Match) => {
    setSchedulingMatch(match);
    if (match.scheduled_time && match.is_time_set) {
      const dt = new Date(match.scheduled_time);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      setScheduleTime(`${hh}:${min}`);
    } else {
      setScheduleDate('2026-11-10');
      setScheduleTime('15:00');
    }
    setScheduleVenue(match.venue || 'Terrain ENSCS');
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingMatch || !scheduleDate || !scheduleTime) return;
    setSavingSchedule(true);

    try {
      const combinedTime = `${scheduleDate}T${scheduleTime}:00`;
      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          match_id: schedulingMatch.id,
          scheduled_time: combinedTime,
          venue: scheduleVenue,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to assign schedule');

      setFeedback({ type: 'success', message: 'Match date, time and venue scheduled successfully!' });
      fetchTournamentData();
      setSchedulingMatch(null);
    } catch (err: any) {
      alert(err.message || 'Error updating schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const openMatchEditor = (match: Match) => {
    setEditingMatch(match);
    setHomeScore(match.home_score !== null && match.home_score !== undefined ? match.home_score.toString() : '0');
    setAwayScore(match.away_score !== null && match.away_score !== undefined ? match.away_score.toString() : '0');
    setHomePenalties(match.home_penalties !== null && match.home_penalties !== undefined ? match.home_penalties.toString() : '');
    setAwayPenalties(match.away_penalties !== null && match.away_penalties !== undefined ? match.away_penalties.toString() : '');
    setStatus(match.status || 'finished');
    setMvpPlayerId(match.mvp_player_id || null);
    setScheduledTime(match.scheduled_time || '');
    setVenue(match.venue || 'Terrain ENSCS');

    // Load existing events
    const existingEvents = (match.events || []).map((e) => ({
      player_id: e.player_id,
      team_id: e.team_id,
      event_type: e.event_type,
      minute: e.minute,
      detail: e.detail,
      player_name: e.player_name,
      team_name: e.team_name,
    }));
    setEvents(existingEvents);

    // Default event selector to home team
    setNewEventTeamId(match.home_team_id);
    const homeTeamPlayers = players.filter((p) => p.team_id === match.home_team_id);
    if (homeTeamPlayers.length > 0) {
      setNewEventPlayerId(homeTeamPlayers[0].id);
    }
    setFeedback(null);
  };

  const handleAddEvent = () => {
    if (!newEventTeamId || !newEventPlayerId) {
      alert('Please select both a team and a player.');
      return;
    }

    const playerObj = players.find((p) => p.id === newEventPlayerId);
    const teamObj = teams.find((t) => t.id === newEventTeamId);

    const newEv = {
      player_id: newEventPlayerId,
      team_id: newEventTeamId,
      event_type: newEventType,
      minute: newEventMinute ? parseInt(newEventMinute) : null,
      player_name: playerObj?.name || 'Player',
      team_name: teamObj?.name || 'Team',
    };

    setEvents([...events, newEv]);
    setNewEventMinute('');
  };

  const handleRemoveEvent = (index: number) => {
    const updated = [...events];
    updated.splice(index, 1);
    setEvents(updated);
  };

  const handleSaveResult = async () => {
    if (!editingMatch) return;
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        match_id: editingMatch.id,
        home_score: parseInt(homeScore) || 0,
        away_score: parseInt(awayScore) || 0,
        home_penalties: homePenalties !== '' ? parseInt(homePenalties) : null,
        away_penalties: awayPenalties !== '' ? parseInt(awayPenalties) : null,
        status: status,
        mvp_player_id: mvpPlayerId,
        scheduled_time: scheduledTime,
        venue: venue,
        events: events.map((e) => ({
          player_id: e.player_id,
          team_id: e.team_id,
          event_type: e.event_type,
          minute: e.minute,
          detail: e.detail,
        })),
      };

      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save match');

      setFeedback({ type: 'success', message: 'Match result and statistics saved successfully! Standings updated.' });
      fetchTournamentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving match' });
    } finally {
      setSaving(false);
    }
  };

  // Filtered players available for event entry (Home or Away team only!)
  const eligiblePlayers = players.filter((p) => p.team_id === newEventTeamId);

  const filteredMatches = matches.filter((m) => {
    if (filterGroup !== 'all') {
      if (filterGroup === 'knockout') {
        if (m.stage === 'group') return false;
      } else {
        if (m.group_id !== filterGroup) return false;
      }
    }
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Match Administration</span>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Match Results & Events</h1>
        <p className="text-sm text-slate-400">
          Enter official scores, assign goalscorers with minutes, register assists and disciplinary cards. Standings and rankings calculate automatically.
        </p>
      </div>

      {/* Filter bar */}
      <div className="glass-panel p-4 rounded-2xl border border-pitch-border flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400 font-bold uppercase">Filter:</span>
        </div>

        {['all', 'A', 'B', 'C', 'knockout'].map((g) => (
          <button
            key={g}
            onClick={() => setFilterGroup(g)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterGroup === g
                ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                : 'bg-pitch-card text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {g === 'all' ? 'All Matches' : g === 'knockout' ? 'Knockout' : `Group ${g}`}
          </button>
        ))}

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {['all', 'upcoming', 'live', 'finished'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterStatus === s
                ? 'bg-white/20 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Matches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map((m) => {
          const isFinished = m.status === 'finished';
          const isLive = m.status === 'live';

          return (
            <div
              key={m.id}
              className="glass-panel rounded-2xl p-4 border border-pitch-border bg-pitch-card/80 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-white/5">
                  <span className="font-bold text-slate-400 uppercase">
                    {m.stage === 'group' ? `Poule ${m.group_id} • J${m.matchday}` : m.stage.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isLive
                        ? 'bg-red-500 text-white animate-pulse'
                        : isFinished
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="space-y-1.5 py-1">
                  <div className="flex items-center justify-between font-bold text-sm text-white" dir="auto">
                    <span className="truncate">{m.home_team_name || 'TBD'}</span>
                    <span className="font-mono text-emerald-400 ml-2">
                      {isFinished || isLive ? m.home_score ?? 0 : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-sm text-white" dir="auto">
                    <span className="truncate">{m.away_team_name || 'TBD'}</span>
                    <span className="font-mono text-emerald-400 ml-2">
                      {isFinished || isLive ? m.away_score ?? 0 : '-'}
                    </span>
                  </div>
                </div>

                {m.events && m.events.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                    {m.events.filter((e) => e.event_type === 'goal').length} Goals •{' '}
                    {m.events.filter((e) => e.event_type === 'yellow_card').length} Yellow •{' '}
                    {m.events.filter((e) => e.event_type === 'red_card').length} Red
                  </div>
                )}

                {/* Schedule Status */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  {m.is_time_set ? (
                    <span className="text-emerald-400 font-medium flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>
                        {new Date(m.scheduled_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(m.scheduled_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Unassigned Day & Time</span>
                    </span>
                  )}
                  <span className="text-slate-500 truncate max-w-[90px]">{m.venue || 'Terrain ENSCS'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => openScheduleModal(m)}
                  className="py-2 px-2 rounded-xl bg-pitch-card hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-wider transition border border-white/10 flex items-center justify-center space-x-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set Day & Time</span>
                </button>
                <button
                  onClick={() => openMatchEditor(m)}
                  className="py-2 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[11px] uppercase tracking-wider transition border border-emerald-500/30 flex items-center justify-center space-x-1"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Result</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MATCH EDITOR MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className="w-full max-w-3xl bg-pitch-darkest border border-pitch-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {editingMatch.stage === 'group'
                    ? `Group ${editingMatch.group_id} • Matchday ${editingMatch.matchday}`
                    : editingMatch.stage.toUpperCase()}
                </span>
                <h3 className="text-xl font-black text-white" dir="auto">
                  {editingMatch.home_team_name || 'TBD'} vs {editingMatch.away_team_name || 'TBD'}
                </h3>
              </div>
              <button
                onClick={() => setEditingMatch(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Score & Status Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-pitch-card border border-pitch-border items-center">
              {/* Home Team Score */}
              <div className="text-center space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase truncate" dir="auto">
                  {editingMatch.home_team_name || 'Home Team'}
                </label>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setHomeScore(Math.max(0, (parseInt(homeScore) || 0) - 1).toString())}
                    className="w-11 h-11 rounded-xl bg-pitch-darkest hover:bg-white/10 active:scale-95 border border-white/10 text-white font-black text-xl flex items-center justify-center transition"
                    title="Minus 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-16 text-center font-mono font-black text-3xl py-1.5 bg-pitch-darkest border border-pitch-border rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setHomeScore(((parseInt(homeScore) || 0) + 1).toString())}
                    className="w-11 h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-emerald-400 font-black text-xl flex items-center justify-center transition"
                    title="Plus 1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Status Selector */}
              <div className="text-center space-y-2 py-2 sm:py-0 border-y sm:border-y-0 sm:border-x border-white/5 sm:px-3">
                <label className="block text-xs font-bold text-slate-400 uppercase">Match Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 uppercase tracking-wider"
                >
                  <option value="finished">Finished</option>
                  <option value="live">Live (Playing Now)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="postponed">Postponed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Shootout if Knockout */}
                {editingMatch.stage !== 'group' && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] text-amber-400 font-bold block mb-1">Penalty Shootout (if draw):</span>
                    <div className="flex items-center justify-center space-x-2">
                      <input
                        type="number"
                        placeholder="H"
                        value={homePenalties}
                        onChange={(e) => setHomePenalties(e.target.value)}
                        className="w-10 text-center font-mono text-xs py-1.5 bg-pitch-darkest border border-white/10 rounded-lg text-white"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        placeholder="A"
                        value={awayPenalties}
                        onChange={(e) => setAwayPenalties(e.target.value)}
                        className="w-10 text-center font-mono text-xs py-1.5 bg-pitch-darkest border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Away Team Score */}
              <div className="text-center space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase truncate" dir="auto">
                  {editingMatch.away_team_name || 'Away Team'}
                </label>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAwayScore(Math.max(0, (parseInt(awayScore) || 0) - 1).toString())}
                    className="w-11 h-11 rounded-xl bg-pitch-darkest hover:bg-white/10 active:scale-95 border border-white/10 text-white font-black text-xl flex items-center justify-center transition"
                    title="Minus 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-16 text-center font-mono font-black text-3xl py-1.5 bg-pitch-darkest border border-pitch-border rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAwayScore(((parseInt(awayScore) || 0) + 1).toString())}
                    className="w-11 h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-emerald-400 font-black text-xl flex items-center justify-center transition"
                    title="Plus 1"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Event Registration Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm">Register Match Events (Goals, Assists, Cards)</h4>
                </div>
                <span className="text-xs text-slate-400">Strictly players from participating teams</span>
              </div>

              {/* Event Builder Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-pitch-card border border-pitch-border text-xs">
                {/* Team selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Team</label>
                  <select
                    value={newEventTeamId}
                    onChange={(e) => {
                      const tid = parseInt(e.target.value);
                      setNewEventTeamId(tid);
                      const tPlayers = players.filter((p) => p.team_id === tid);
                      if (tPlayers.length > 0) setNewEventPlayerId(tPlayers[0].id);
                    }}
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-lg p-2 text-white font-semibold"
                  >
                    <option value={editingMatch.home_team_id}>{editingMatch.home_team_name || 'Home Team'}</option>
                    <option value={editingMatch.away_team_id}>{editingMatch.away_team_name || 'Away Team'}</option>
                  </select>
                </div>

                {/* Event type */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-lg p-2 text-white font-semibold"
                  >
                    <option value="goal">⚽ Goal</option>
                    <option value="assist">👟 Assist</option>
                    <option value="yellow_card">🟨 Yellow Card</option>
                    <option value="red_card">🟥 Red Card</option>
                  </select>
                </div>

                {/* Player selection (Filtered only to chosen participating team!) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Player</label>
                  <select
                    value={newEventPlayerId}
                    onChange={(e) => setNewEventPlayerId(parseInt(e.target.value))}
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-lg p-2 text-white font-semibold"
                  >
                    {eligiblePlayers.length === 0 ? (
                      <option value="">No registered players found</option>
                    ) : (
                      eligiblePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.is_captain ? '(C)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Minute & Add button */}
                <div className="flex items-end space-x-2">
                  <div className="w-16">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min'</label>
                    <input
                      type="number"
                      placeholder="23"
                      min="1"
                      max="120"
                      value={newEventMinute}
                      onChange={(e) => setNewEventMinute(e.target.value)}
                      className="w-full bg-pitch-darkest border border-pitch-border rounded-lg p-2 text-center text-white font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-bold text-xs uppercase tracking-wider transition shadow-glow flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Registered Events List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 italic">
                    No individual goals, assists, or cards added for this match yet.
                  </p>
                ) : (
                  events.map((ev, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-xl bg-pitch-darkest border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm">
                          {ev.event_type === 'goal'
                            ? '⚽'
                            : ev.event_type === 'assist'
                            ? '👟'
                            : ev.event_type === 'yellow_card'
                            ? '🟨'
                            : '🟥'}
                        </span>
                        <span className="font-bold text-white" dir="auto">
                          {ev.player_name}
                        </span>
                        <span className="text-slate-400 text-[11px]" dir="auto">
                          ({ev.team_name})
                        </span>
                        {ev.minute && (
                          <span className="font-mono text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {ev.minute}'
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveEvent(index)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="Remove event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Official Match MVP (Man of the Match) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    ⭐ Man of the Match (MVP)
                  </h4>
                </div>
                <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  MVP Award
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pick the most outstanding player of this match. Points count towards the official Tournament MVP leaderboard!
              </p>
              <select
                value={mvpPlayerId || ''}
                onChange={(e) => setMvpPlayerId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-pitch-darkest border border-amber-500/40 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
              >
                <option value="">-- No MVP Selected --</option>
                <optgroup label={`🔵 ${editingMatch.home_team_name || 'Home Team'}`}>
                  {players
                    .filter((p) => p.team_id === editingMatch.home_team_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_captain ? '(C)' : ''} ({editingMatch.home_team_name})
                      </option>
                    ))}
                </optgroup>
                <optgroup label={`🔴 ${editingMatch.away_team_name || 'Away Team'}`}>
                  {players
                    .filter((p) => p.team_id === editingMatch.away_team_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_captain ? '(C)' : ''} ({editingMatch.away_team_name})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold tracking-wide transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveResult}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Calculate Standings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {schedulingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-pitch-darkest border border-pitch-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                    {schedulingMatch.stage === 'group'
                      ? `Poule ${schedulingMatch.group_id} • J${schedulingMatch.matchday}`
                      : schedulingMatch.stage.toUpperCase()}
                  </span>
                  <h3 className="text-lg font-bold text-white">Assign Match Schedule</h3>
                </div>
              </div>
              <button
                onClick={() => setSchedulingMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-pitch-card border border-white/5 text-center font-bold text-sm text-white" dir="auto">
              {schedulingMatch.home_team_name || 'TBD'} vs {schedulingMatch.away_team_name || 'TBD'}
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Match Day / Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Kickoff Time
                </label>
                <input
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Venue / Pitch
                </label>
                <input
                  type="text"
                  required
                  value={scheduleVenue}
                  onChange={(e) => setScheduleVenue(e.target.value)}
                  placeholder="Terrain ENSCS"
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSchedulingMatch(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition"
                >
                  {savingSchedule ? 'Saving...' : 'Confirm Date & Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
