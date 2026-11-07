'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Match, Team, Player, MatchEvent } from '@/lib/types';
import { calculateMatchMVP } from '@/lib/calculations';
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
  Activity,
  BarChart3,
  Sparkles,
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

  // Modal active tab
  const [modalTab, setModalTab] = useState<'goals' | 'cards' | 'stats' | 'mvp'>('goals');

  // Form states for match editor
  const [homeScore, setHomeScore] = useState<string>('0');
  const [awayScore, setAwayScore] = useState<string>('0');
  const [homePenalties, setHomePenalties] = useState<string>('');
  const [awayPenalties, setAwayPenalties] = useState<string>('');
  const [status, setStatus] = useState<string>('finished');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [venue, setVenue] = useState<string>('');

  // Match Statistics state
  const [possessionHome, setPossessionHome] = useState<string>('');
  const [possessionAway, setPossessionAway] = useState<string>('');
  const [shotsHome, setShotsHome] = useState<string>('');
  const [shotsAway, setShotsAway] = useState<string>('');
  const [shotsOnTargetHome, setShotsOnTargetHome] = useState<string>('');
  const [shotsOnTargetAway, setShotsOnTargetAway] = useState<string>('');
  const [foulsHome, setFoulsHome] = useState<string>('');
  const [foulsAway, setFoulsAway] = useState<string>('');

  // MVP states
  const [mvpMode, setMvpMode] = useState<'auto' | 'manual'>('auto');
  const [mvpPlayerId, setMvpPlayerId] = useState<number | null>(null);

  // Events list
  const [events, setEvents] = useState<
    Array<{
      player_id: number;
      team_id: number;
      event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
      sub_type?: 'normal' | 'penalty' | 'own_goal' | null;
      assister_id?: number | null;
      minute?: number | null;
      detail?: string | null;
      player_name?: string;
      team_name?: string;
      assister_name?: string | null;
    }>
  >([]);

  // Goal Registration builder state
  const [goalTeamId, setGoalTeamId] = useState<number>(0);
  const [goalPlayerId, setGoalPlayerId] = useState<number>(0);
  const [goalMinute, setGoalMinute] = useState<string>('');
  const [goalAssisterId, setGoalAssisterId] = useState<string>('');
  const [goalType, setGoalType] = useState<'normal' | 'penalty' | 'own_goal'>('normal');

  // Card Registration builder state
  const [cardTeamId, setCardTeamId] = useState<number>(0);
  const [cardPlayerId, setCardPlayerId] = useState<number>(0);
  const [cardMinute, setCardMinute] = useState<string>('');
  const [cardType, setCardType] = useState<'yellow_card' | 'red_card'>('yellow_card');

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
    setScheduledTime(match.scheduled_time || '');
    setVenue(match.venue || 'Terrain ENSCS');

    // Stats
    setPossessionHome(match.possession_home !== null && match.possession_home !== undefined ? match.possession_home.toString() : '');
    setPossessionAway(match.possession_away !== null && match.possession_away !== undefined ? match.possession_away.toString() : '');
    setShotsHome(match.shots_home !== null && match.shots_home !== undefined ? match.shots_home.toString() : '');
    setShotsAway(match.shots_away !== null && match.shots_away !== undefined ? match.shots_away.toString() : '');
    setShotsOnTargetHome(match.shots_on_target_home !== null && match.shots_on_target_home !== undefined ? match.shots_on_target_home.toString() : '');
    setShotsOnTargetAway(match.shots_on_target_away !== null && match.shots_on_target_away !== undefined ? match.shots_on_target_away.toString() : '');
    setFoulsHome(match.fouls_home !== null && match.fouls_home !== undefined ? match.fouls_home.toString() : '');
    setFoulsAway(match.fouls_away !== null && match.fouls_away !== undefined ? match.fouls_away.toString() : '');

    // MVP Mode & Player
    setMvpMode(match.mvp_mode || 'auto');
    setMvpPlayerId(match.mvp_player_id || null);

    // Existing events
    const existingEvents = (match.events || []).map((e) => ({
      player_id: e.player_id,
      team_id: e.team_id,
      event_type: e.event_type,
      sub_type: e.sub_type || (e.event_type === 'goal' ? 'normal' : null),
      assister_id: e.assister_id || null,
      minute: e.minute,
      detail: e.detail,
      player_name: e.player_name,
      team_name: e.team_name,
      assister_name: e.assister_name,
    }));
    setEvents(existingEvents);

    // Initial builder defaults
    setGoalTeamId(match.home_team_id);
    const homeTeamPlayers = players.filter((p) => p.team_id === match.home_team_id);
    if (homeTeamPlayers.length > 0) {
      setGoalPlayerId(homeTeamPlayers[0].id);
    }
    setGoalMinute('');
    setGoalAssisterId('');
    setGoalType('normal');

    setCardTeamId(match.home_team_id);
    if (homeTeamPlayers.length > 0) {
      setCardPlayerId(homeTeamPlayers[0].id);
    }
    setCardMinute('');
    setCardType('yellow_card');

    setModalTab('goals');
    setFeedback(null);
  };

  // Players eligible for goal registration (based on goalTeamId)
  const goalEligiblePlayers = useMemo(() => {
    return players.filter((p) => p.team_id === goalTeamId);
  }, [players, goalTeamId]);

  // Potential assisters: registered players from the SAME team, excluding the chosen scorer
  const assisterEligiblePlayers = useMemo(() => {
    return goalEligiblePlayers.filter((p) => p.id !== goalPlayerId);
  }, [goalEligiblePlayers, goalPlayerId]);

  // Players eligible for card registration
  const cardEligiblePlayers = useMemo(() => {
    return players.filter((p) => p.team_id === cardTeamId);
  }, [players, cardTeamId]);

  // Live Automatic MVP Candidate Analysis
  const liveMvpAnalysis = useMemo(() => {
    if (!editingMatch) return null;

    const mockMatch: Match = {
      ...editingMatch,
      home_score: parseInt(homeScore) || 0,
      away_score: parseInt(awayScore) || 0,
      home_penalties: homePenalties !== '' ? parseInt(homePenalties) : null,
      away_penalties: awayPenalties !== '' ? parseInt(awayPenalties) : null,
      status: status as any,
    };

    return calculateMatchMVP(mockMatch, players, events as any[]);
  }, [editingMatch, homeScore, awayScore, homePenalties, awayPenalties, status, players, events]);

  // ADD GOAL HANDLER: Auto updates score + adds event + validates
  const handleAddGoal = () => {
    if (!editingMatch || !goalTeamId || !goalPlayerId) {
      alert('Please select both a team and a goalscorer.');
      return;
    }

    const scorer = players.find((p) => p.id === goalPlayerId);
    const team = teams.find((t) => t.id === goalTeamId);
    const assister = goalAssisterId ? players.find((p) => p.id === Number(goalAssisterId)) : null;

    const newEv = {
      player_id: goalPlayerId,
      team_id: goalTeamId,
      event_type: 'goal' as const,
      sub_type: goalType,
      assister_id: goalAssisterId ? Number(goalAssisterId) : null,
      minute: goalMinute ? parseInt(goalMinute) : null,
      player_name: scorer?.name || 'Player',
      team_name: team?.name || 'Team',
      assister_name: assister?.name || undefined,
    };

    // Automatic Score Update Logic:
    // If own_goal -> added to opponent team's score!
    // Otherwise -> added to scoring team's score!
    if (goalType === 'own_goal') {
      if (goalTeamId === editingMatch.home_team_id) {
        setAwayScore((prev) => ((parseInt(prev) || 0) + 1).toString());
      } else {
        setHomeScore((prev) => ((parseInt(prev) || 0) + 1).toString());
      }
    } else {
      if (goalTeamId === editingMatch.home_team_id) {
        setHomeScore((prev) => ((parseInt(prev) || 0) + 1).toString());
      } else {
        setAwayScore((prev) => ((parseInt(prev) || 0) + 1).toString());
      }
    }

    setEvents((prev) => [...prev, newEv]);
    setGoalMinute('');
    setGoalAssisterId('');
    setGoalType('normal');
  };

  // REMOVE EVENT HANDLER: Automatically subtracts goal from score if deleting a goal!
  const handleRemoveEvent = (index: number) => {
    if (!editingMatch) return;
    const ev = events[index];
    if (!ev) return;

    if (ev.event_type === 'goal') {
      if (ev.sub_type === 'own_goal') {
        if (ev.team_id === editingMatch.home_team_id) {
          setAwayScore((prev) => Math.max(0, (parseInt(prev) || 0) - 1).toString());
        } else {
          setHomeScore((prev) => Math.max(0, (parseInt(prev) || 0) - 1).toString());
        }
      } else {
        if (ev.team_id === editingMatch.home_team_id) {
          setHomeScore((prev) => Math.max(0, (parseInt(prev) || 0) - 1).toString());
        } else {
          setAwayScore((prev) => Math.max(0, (parseInt(prev) || 0) - 1).toString());
        }
      }
    }

    setEvents((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  // ADD CARD HANDLER
  const handleAddCard = () => {
    if (!cardTeamId || !cardPlayerId) {
      alert('Please select both a team and a player.');
      return;
    }

    const player = players.find((p) => p.id === cardPlayerId);
    const team = teams.find((t) => t.id === cardTeamId);

    const newEv = {
      player_id: cardPlayerId,
      team_id: cardTeamId,
      event_type: cardType,
      sub_type: null,
      assister_id: null,
      minute: cardMinute ? parseInt(cardMinute) : null,
      player_name: player?.name || 'Player',
      team_name: team?.name || 'Team',
    };

    setEvents((prev) => [...prev, newEv]);
    setCardMinute('');
  };

  // SAVE RESULT & PUBLISH
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
        mvp_mode: mvpMode,
        mvp_player_id: mvpMode === 'manual' ? mvpPlayerId : null,
        possession_home: possessionHome !== '' ? parseInt(possessionHome) : null,
        possession_away: possessionAway !== '' ? parseInt(possessionAway) : null,
        shots_home: shotsHome !== '' ? parseInt(shotsHome) : null,
        shots_away: shotsAway !== '' ? parseInt(shotsAway) : null,
        shots_on_target_home: shotsOnTargetHome !== '' ? parseInt(shotsOnTargetHome) : null,
        shots_on_target_away: shotsOnTargetAway !== '' ? parseInt(shotsOnTargetAway) : null,
        fouls_home: foulsHome !== '' ? parseInt(foulsHome) : null,
        fouls_away: foulsAway !== '' ? parseInt(foulsAway) : null,
        scheduled_time: scheduledTime,
        venue: venue,
        events: events.map((e) => ({
          player_id: e.player_id,
          team_id: e.team_id,
          event_type: e.event_type,
          sub_type: e.sub_type || null,
          assister_id: e.assister_id || null,
          minute: e.minute,
          detail: e.detail || null,
        })),
      };

      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save match');

      setFeedback({
        type: 'success',
        message: 'Match result, statistics, and MVP saved successfully! Standings and leaderboards updated.',
      });
      fetchTournamentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving match' });
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Admin Match Center</h1>
        <p className="text-sm text-slate-400">
          Manage match results, register goals with assists, disciplinary cards, official match statistics, and configure Automatic or Manual MVP.
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
                    {m.stage === 'group' ? `Group ${m.group_id} • J${m.matchday}` : m.stage.toUpperCase()}
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

                {/* MVP Pill if selected */}
                {m.mvp_player_name && (
                  <div className="text-[11px] text-amber-300 font-bold pt-1.5 flex items-center space-x-1 truncate">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <span>MVP: {m.mvp_player_name}</span>
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
                  <span>Set Schedule</span>
                </button>
                <button
                  onClick={() => openMatchEditor(m)}
                  className="py-2 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[11px] uppercase tracking-wider transition border border-emerald-500/30 flex items-center justify-center space-x-1"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Match Center</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEDICATED ADMIN MATCH CENTER MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-6 flex min-h-full items-start justify-center">
          <div
            className="w-full max-w-3xl bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-5 shadow-2xl my-3 sm:my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-pitch-darkest/95 backdrop-blur-lg -mx-4 -mt-4 px-4 py-3 sm:-mx-7 sm:-mt-7 sm:px-7 sm:py-4 border-b border-white/10 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl shadow-sm">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Admin Match Center • {editingMatch.stage === 'group' ? `Group ${editingMatch.group_id} - J${editingMatch.matchday}` : editingMatch.stage.toUpperCase()}
                </span>
                <h3 className="text-base sm:text-xl font-black text-white truncate max-w-[240px] sm:max-w-md" dir="auto">
                  {editingMatch.home_team_name || 'TBD'} vs {editingMatch.away_team_name || 'TBD'}
                </h3>
              </div>
              <button
                onClick={() => setEditingMatch(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition flex-shrink-0"
                aria-label="Close"
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

            {/* SECTION 1: SCOREBOARD & STATUS (Touch Friendly) */}
            <div className="p-4 rounded-2xl bg-pitch-card border border-pitch-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                {/* Home Score */}
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
                      className="w-16 text-center font-mono font-black text-3xl py-1 bg-pitch-darkest border border-pitch-border rounded-xl text-white focus:outline-none focus:border-emerald-500"
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

                {/* Match Status & Shootout */}
                <div className="text-center space-y-2 py-2 sm:py-0 border-y sm:border-y-0 sm:border-x border-white/5 sm:px-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Match Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 uppercase tracking-wider"
                  >
                    <option value="finished">Finished (Completed)</option>
                    <option value="live">Live (Playing Now)</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Knockout penalties if applicable */}
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

                {/* Away Score */}
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
                      className="w-16 text-center font-mono font-black text-3xl py-1 bg-pitch-darkest border border-pitch-border rounded-xl text-white focus:outline-none focus:border-emerald-500"
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
            </div>

            {/* MATCH CENTER TABS */}
            <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar gap-2">
              <button
                type="button"
                onClick={() => setModalTab('goals')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'goals'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>⚽ Goals & Assists ({events.filter((e) => e.event_type === 'goal').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('cards')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'cards'
                    ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>🟨 Cards ({events.filter((e) => e.event_type === 'yellow_card' || e.event_type === 'red_card').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('stats')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'stats'
                    ? 'border-blue-400 text-blue-400 bg-blue-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>📊 Match Stats</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('mvp')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'mvp'
                    ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>⭐ Man of the Match (MVP)</span>
              </button>
            </div>

            {/* TAB 1: GOALS & ASSISTS */}
            {modalTab === 'goals' && (
              <div className="space-y-4">
                {/* Goal Registration Form */}
                <div className="p-4 rounded-2xl bg-pitch-card border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-400 flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Register Goal Event</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Auto-syncs score & leaderboard
                    </span>
                  </div>

                  {/* Team Selector Segmented */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      1. Scoring Team
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGoalTeamId(editingMatch.home_team_id);
                          const hPlayers = players.filter((p) => p.team_id === editingMatch.home_team_id);
                          if (hPlayers.length > 0) setGoalPlayerId(hPlayers[0].id);
                          setGoalAssisterId('');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-black truncate border transition ${
                          goalTeamId === editingMatch.home_team_id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                            : 'bg-pitch-darkest text-slate-400 border-white/5 hover:text-white'
                        }`}
                        dir="auto"
                      >
                        🔵 {editingMatch.home_team_name}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGoalTeamId(editingMatch.away_team_id);
                          const aPlayers = players.filter((p) => p.team_id === editingMatch.away_team_id);
                          if (aPlayers.length > 0) setGoalPlayerId(aPlayers[0].id);
                          setGoalAssisterId('');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-black truncate border transition ${
                          goalTeamId === editingMatch.away_team_id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                            : 'bg-pitch-darkest text-slate-400 border-white/5 hover:text-white'
                        }`}
                        dir="auto"
                      >
                        🔴 {editingMatch.away_team_name}
                      </button>
                    </div>
                  </div>

                  {/* Scorer & Minute Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        2. Goalscorer
                      </label>
                      <select
                        value={goalPlayerId}
                        onChange={(e) => {
                          const pid = parseInt(e.target.value);
                          setGoalPlayerId(pid);
                          if (goalAssisterId === e.target.value) setGoalAssisterId('');
                        }}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        {goalEligiblePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.is_captain ? '(C)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        3. Minute
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="e.g. 23"
                        value={goalMinute}
                        onChange={(e) => setGoalMinute(e.target.value)}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Goal Type & Assister */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        4. Goal Type
                      </label>
                      <select
                        value={goalType}
                        onChange={(e) => setGoalType(e.target.value as any)}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="normal">⚽ Normal Goal</option>
                        <option value="penalty">🎯 Penalty</option>
                        <option value="own_goal">⚠️ Own Goal (o.g.)</option>
                      </select>
                      {goalType === 'own_goal' && (
                        <span className="text-[10px] text-amber-400 mt-1 block">
                          ⚠️ Opponent gets +1 goal. Scorer gets no goal tallies.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        5. Assister (Optional - Same Team)
                      </label>
                      <select
                        disabled={goalType === 'own_goal'}
                        value={goalAssisterId}
                        onChange={(e) => setGoalAssisterId(e.target.value)}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                      >
                        <option value="">-- No Assist (Solo Effort / Unassisted) --</option>
                        {assisterEligiblePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            👟 {p.name} {p.is_captain ? '(C)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ADD GOAL BUTTON */}
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-pitch-darkest font-black text-xs uppercase tracking-wider transition shadow-glow flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ ADD GOAL (AUTO-UPDATE SCORE)</span>
                  </button>
                </div>

                {/* Goals Timeline List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Match Goals ({events.filter((e) => e.event_type === 'goal').length})
                  </h4>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {events.filter((e) => e.event_type === 'goal').length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 italic">
                        No goals registered for this match yet.
                      </p>
                    ) : (
                      events.map((ev, index) => {
                        if (ev.event_type !== 'goal') return null;
                        const isOwnGoal = ev.sub_type === 'own_goal';
                        const isPenalty = ev.sub_type === 'penalty';

                        return (
                          <div
                            key={index}
                            className="p-3 rounded-xl bg-pitch-card border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                                {ev.minute ? `${ev.minute}'` : '⚽'}
                              </span>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-black text-white" dir="auto">
                                    {ev.player_name}
                                  </span>
                                  {isOwnGoal && (
                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-bold">
                                      Own Goal (o.g.)
                                    </span>
                                  )}
                                  {isPenalty && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                      Penalty
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                                  <span dir="auto">{ev.team_name}</span>
                                  {ev.assister_name && (
                                    <span className="text-emerald-400/90 font-medium">
                                      • Assist: {ev.assister_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEvent(index)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-white/5"
                              title="Delete goal (reverses score)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DISCIPLINARY CARDS */}
            {modalTab === 'cards' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-pitch-card border border-yellow-500/30 space-y-3">
                  <span className="text-xs font-bold uppercase text-yellow-400 flex items-center space-x-1">
                    <span>🟨 Register Disciplinary Card</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {/* Team */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Team</label>
                      <select
                        value={cardTeamId}
                        onChange={(e) => {
                          const tid = parseInt(e.target.value);
                          setCardTeamId(tid);
                          const cPlayers = players.filter((p) => p.team_id === tid);
                          if (cPlayers.length > 0) setCardPlayerId(cPlayers[0].id);
                        }}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold"
                      >
                        <option value={editingMatch.home_team_id}>{editingMatch.home_team_name}</option>
                        <option value={editingMatch.away_team_id}>{editingMatch.away_team_name}</option>
                      </select>
                    </div>

                    {/* Card Type */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Card Type</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value as any)}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold"
                      >
                        <option value="yellow_card">🟨 Yellow Card (-1 pt)</option>
                        <option value="red_card">🟥 Red Card (-4 pts)</option>
                      </select>
                    </div>

                    {/* Player */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Player</label>
                      <select
                        value={cardPlayerId}
                        onChange={(e) => setCardPlayerId(parseInt(e.target.value))}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-semibold"
                      >
                        {cardEligiblePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.is_captain ? '(C)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Minute & Button */}
                    <div className="flex items-end space-x-2">
                      <div className="w-16">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min'</label>
                        <input
                          type="number"
                          placeholder="45"
                          value={cardMinute}
                          onChange={(e) => setCardMinute(e.target.value)}
                          className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-center text-white font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCard}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-pitch-darkest font-black text-xs uppercase tracking-wider transition"
                      >
                        + Add Card
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Disciplinary Cards ({events.filter((e) => e.event_type === 'yellow_card' || e.event_type === 'red_card').length})
                  </h4>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {events.filter((e) => e.event_type === 'yellow_card' || e.event_type === 'red_card').length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 italic">
                        Clean match! No yellow or red cards registered.
                      </p>
                    ) : (
                      events.map((ev, index) => {
                        if (ev.event_type !== 'yellow_card' && ev.event_type !== 'red_card') return null;
                        const isYellow = ev.event_type === 'yellow_card';

                        return (
                          <div
                            key={index}
                            className="p-3 rounded-xl bg-pitch-card border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-base">{isYellow ? '🟨' : '🟥'}</span>
                              <div>
                                <span className="font-black text-white" dir="auto">
                                  {ev.player_name}
                                </span>
                                <span className="text-slate-400 ml-2" dir="auto">
                                  ({ev.team_name})
                                </span>
                              </div>
                              {ev.minute && (
                                <span className="font-mono text-slate-300 text-[10px] bg-white/5 px-1.5 py-0.5 rounded">
                                  {ev.minute}'
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEvent(index)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-white/5"
                              title="Delete card"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MATCH STATISTICS */}
            {modalTab === 'stats' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-pitch-card border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-blue-400 flex items-center space-x-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Official Match Statistics (Optional)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPossessionHome('');
                        setPossessionAway('');
                        setShotsHome('');
                        setShotsAway('');
                        setShotsOnTargetHome('');
                        setShotsOnTargetAway('');
                        setFoulsHome('');
                        setFoulsAway('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-red-400 transition"
                    >
                      Clear All Stats
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter match stats if available. If left empty, they will show as N/A or remain hidden on the public site (no fake numbers).
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {/* Possession */}
                    <div className="grid grid-cols-3 items-center gap-2 p-2 rounded-xl bg-pitch-darkest border border-white/5 text-xs">
                      <input
                        type="number"
                        placeholder="%"
                        min="0"
                        max="100"
                        value={possessionHome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPossessionHome(val);
                          if (val !== '' && !isNaN(Number(val))) {
                            setPossessionAway(Math.max(0, 100 - Number(val)).toString());
                          }
                        }}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                      <span className="text-center font-bold text-slate-300">Possession %</span>
                      <input
                        type="number"
                        placeholder="%"
                        min="0"
                        max="100"
                        value={possessionAway}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPossessionAway(val);
                          if (val !== '' && !isNaN(Number(val))) {
                            setPossessionHome(Math.max(0, 100 - Number(val)).toString());
                          }
                        }}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                    </div>

                    {/* Total Shots */}
                    <div className="grid grid-cols-3 items-center gap-2 p-2 rounded-xl bg-pitch-darkest border border-white/5 text-xs">
                      <input
                        type="number"
                        placeholder="Shots"
                        min="0"
                        value={shotsHome}
                        onChange={(e) => setShotsHome(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                      <span className="text-center font-bold text-slate-300">Total Shots</span>
                      <input
                        type="number"
                        placeholder="Shots"
                        min="0"
                        value={shotsAway}
                        onChange={(e) => setShotsAway(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                    </div>

                    {/* Shots on Target */}
                    <div className="grid grid-cols-3 items-center gap-2 p-2 rounded-xl bg-pitch-darkest border border-white/5 text-xs">
                      <input
                        type="number"
                        placeholder="On Target"
                        min="0"
                        value={shotsOnTargetHome}
                        onChange={(e) => setShotsOnTargetHome(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                      <span className="text-center font-bold text-slate-300">Shots on Target</span>
                      <input
                        type="number"
                        placeholder="On Target"
                        min="0"
                        value={shotsOnTargetAway}
                        onChange={(e) => setShotsOnTargetAway(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                    </div>

                    {/* Fouls */}
                    <div className="grid grid-cols-3 items-center gap-2 p-2 rounded-xl bg-pitch-darkest border border-white/5 text-xs">
                      <input
                        type="number"
                        placeholder="Fouls"
                        min="0"
                        value={foulsHome}
                        onChange={(e) => setFoulsHome(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                      <span className="text-center font-bold text-slate-300">Fouls</span>
                      <input
                        type="number"
                        placeholder="Fouls"
                        min="0"
                        value={foulsAway}
                        onChange={(e) => setFoulsAway(e.target.value)}
                        className="w-full bg-pitch-card border border-white/10 rounded-lg p-2 text-center text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MAN OF THE MATCH (MVP) */}
            {modalTab === 'mvp' && (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          Official MVP Selection
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Automatic algorithm or admin override
                        </span>
                      </div>
                    </div>

                    {/* Segmented Mode Button */}
                    <div className="inline-flex p-1 rounded-xl bg-pitch-darkest border border-white/10 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setMvpMode('auto')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                          mvpMode === 'auto'
                            ? 'bg-amber-400 text-pitch-darkest shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>⚡ Automatic MVP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMvpMode('manual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                          mvpMode === 'manual'
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>🔒 Manual Override</span>
                      </button>
                    </div>
                  </div>

                  {/* AUTOMATIC MVP PREVIEW */}
                  {mvpMode === 'auto' && liveMvpAnalysis && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="p-3.5 rounded-xl bg-pitch-darkest/90 border border-amber-400/30 flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-black text-xl flex-shrink-0">
                            👑
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                              Current Automatic MVP Winner
                            </span>
                            <span className="text-base font-black text-white" dir="auto">
                              {liveMvpAnalysis.sortedCandidates[0]?.player.name || 'None (Tie or No events)'}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5" dir="auto">
                              ({liveMvpAnalysis.sortedCandidates[0]?.player.team_name})
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Rating Score</span>
                          <span className="font-mono font-black text-2xl text-amber-400">
                            {liveMvpAnalysis.topScore} pts
                          </span>
                        </div>
                      </div>

                      {/* Rule 1 Winner Priority Notice */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                        <span>
                          {liveMvpAnalysis.winnerTeamId
                            ? 'Rule 1 Active: Winner team priority enforced! Only players from the victorious team can win the automatic MVP.'
                            : 'Rule 2 Active: Draw match. Highest individual performance score across both teams is awarded MVP.'}
                        </span>
                      </div>

                      {/* Contenders ranking preview */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Calculated Candidate Rankings
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {liveMvpAnalysis.sortedCandidates.slice(0, 6).map((c, cIdx) => (
                            <div
                              key={c.player.id}
                              className={`p-2 rounded-lg flex items-center justify-between text-[11px] ${
                                cIdx === 0
                                  ? 'bg-amber-400/10 border border-amber-400/30 text-white font-bold'
                                  : 'bg-pitch-darkest border border-white/5 text-slate-300'
                              }`}
                            >
                              <span className="truncate max-w-[150px]" dir="auto">
                                #{cIdx + 1} {c.player.name}
                              </span>
                              <span className="font-mono text-amber-400 ml-1">
                                {c.score} pts ({c.breakdown.goals}G {c.breakdown.assists}A)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANUAL OVERRIDE DROPDOWN */}
                  {mvpMode === 'manual' && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                        🔒 <strong>Manual Override Enabled:</strong> You have the final say. Select ANY player from either team (e.g. heroic losing performance or draw).
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Select Man of the Match (MVP)
                        </label>
                        <select
                          value={mvpPlayerId || ''}
                          onChange={(e) => setMvpPlayerId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-pitch-darkest border border-purple-500/40 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-purple-400"
                        >
                          <option value="">-- No MVP Selected --</option>
                          <optgroup label={`🔵 ${editingMatch.home_team_name}`}>
                            {players
                              .filter((p) => p.team_id === editingMatch.home_team_id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.is_captain ? '(C)' : ''} ({editingMatch.home_team_name})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label={`🔴 ${editingMatch.away_team_name}`}>
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STICKY SAVE & PUBLISH BAR */}
            <div className="sticky bottom-0 z-20 bg-pitch-darkest/95 backdrop-blur-lg -mx-4 -mb-4 px-4 py-3 sm:-mx-7 sm:-mb-7 sm:px-7 sm:py-4 border-t border-white/10 flex items-center justify-between rounded-b-2xl sm:rounded-b-3xl">
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
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Publish Result'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {schedulingMatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex min-h-full items-start justify-center">
          <div
            className="w-full max-w-md bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 shadow-2xl my-6 sm:my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                    {schedulingMatch.stage === 'group'
                      ? `Group ${schedulingMatch.group_id} • J${schedulingMatch.matchday}`
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
