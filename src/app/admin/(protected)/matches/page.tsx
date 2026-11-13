'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Match, Team, Player, MatchEvent } from '@/lib/types';
import { calculateMatchMVP } from '@/lib/calculations';
import { useMatchClock } from '@/lib/useMatchClock';
import { ClockPeriod, ClockState, formatClock, isClockPeriod, serverNowEstimate, syncServerTime } from '@/lib/liveClock';
import {
  Play,
  Pause,
  Square,
  Undo2,
  Timer,
  RotateCcw,
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
  const [modalTab, setModalTab] = useState<'goals' | 'cards' | 'gk' | 'shootout' | 'mvp' | 'polls'>('goals');
  const [pollStats, setPollStats] = useState<{
    winner?: { total: number; counts: Record<string, number> | null; open: boolean };
    motm?: { total: number; counts: Record<string, number> | null; open: boolean; options: any[] };
  } | null>(null);
  const [pollActionLoading, setPollActionLoading] = useState(false);

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

  // Goalkeepers of this match (null = the team's usual keeper), their saves, and guest players
  const [homeGkId, setHomeGkId] = useState<number | null>(null);
  const [awayGkId, setAwayGkId] = useState<number | null>(null);
  const [homeSaves, setHomeSaves] = useState(0);
  const [awaySaves, setAwaySaves] = useState(0);
  const [homePenSaves, setHomePenSaves] = useState(0);
  const [awayPenSaves, setAwayPenSaves] = useState(0);
  const [guests, setGuests] = useState<{ player_id: number; team_id: number }[]>([]);
  const [guestPlayerId, setGuestPlayerId] = useState<string>('');
  const [guestTeamId, setGuestTeamId] = useState<number>(0);

  // Penalty shootout (knockout matches), kick by kick
  const [shootout, setShootout] = useState<
    { team_id: number; player_id: number | null; result: 'scored' | 'missed' | 'saved' }[]
  >([]);
  const [kickTeamId, setKickTeamId] = useState<number>(0);
  const [kickPlayerId, setKickPlayerId] = useState<string>('');

  // Forfeit (a team did not show up)
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [forfeitTeamId, setForfeitTeamId] = useState<number>(0);
  const [forfeitGoals, setForfeitGoals] = useState<5 | 10>(5);
  const [forfeitedTeamId, setForfeitedTeamId] = useState<number | null>(null);

  // Recalculate Man of the Match
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

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

  // Minute fields follow the stopwatch until the admin types a value by hand.
  const [goalMinuteEdited, setGoalMinuteEdited] = useState(false);
  const [cardMinuteEdited, setCardMinuteEdited] = useState(false);

  // While a match is live, every change is published automatically.
  const [autoSaveTick, setAutoSaveTick] = useState(0);
  const [lastPublishedAt, setLastPublishedAt] = useState<Date | null>(null);
  const autoOpenedRef = useRef(false);

  const fetchTournamentData = () => {
    fetch('/api/tournament', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        syncServerTime(data.server_time);
        setMatches(data.matches || []);
        setTeams(data.teams || []);
        setPlayers(data.players || []);
        setLoading(false);

        // If URL has match_id, automatically open it (once, so later refreshes
        // never reset what the admin is typing)
        if (initialMatchId && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
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

    // Goalkeepers, saves and guest players
    setHomeGkId(match.home_gk_id || null);
    setAwayGkId(match.away_gk_id || null);
    setHomeSaves(Number(match.home_saves) || 0);
    setAwaySaves(Number(match.away_saves) || 0);
    setHomePenSaves(Number(match.home_pen_saves) || 0);
    setAwayPenSaves(Number(match.away_pen_saves) || 0);
    setGuests((match.guests || []).map((g) => ({ player_id: g.player_id, team_id: g.team_id })));
    setGuestPlayerId('');
    setGuestTeamId(match.home_team_id);
    setShootout(
      (match.shootout || []).map((k) => ({ team_id: k.team_id, player_id: k.player_id || null, result: k.result }))
    );
    setKickTeamId(match.home_team_id);
    setKickPlayerId('');
    setForfeitOpen(false);
    setForfeitTeamId(0);
    setForfeitGoals(5);
    setForfeitedTeamId(match.forfeit_team_id || null);

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
    setGoalMinuteEdited(false);
    setGoalAssisterId('');
    setGoalType('normal');

    setCardTeamId(match.home_team_id);
    if (homeTeamPlayers.length > 0) {
      setCardPlayerId(homeTeamPlayers[0].id);
    }
    setCardMinute('');
    setCardMinuteEdited(false);
    setCardType('yellow_card');

    setModalTab('goals');
    setFeedback(null);
    setLastPublishedAt(null);
    loadPollStats(match.id);
  };

  const loadPollStats = async (matchId: number) => {
    try {
      const res = await fetch(`/api/polls?match_id=${matchId}`);
      if (res.ok) {
        const json = await res.json();
        setPollStats(json);
      }
    } catch {
      // ignore
    }
  };

  const handleResetPoll = async (poll: 'winner' | 'motm' | 'all') => {
    if (!editingMatch) return;
    const pollName = poll === 'all' ? 'all fan votes' : `${poll} poll`;
    if (!confirm(`Are you sure you want to reset and permanently delete ${pollName} for this match?`)) return;
    setPollActionLoading(true);
    try {
      const res = await fetch(`/api/polls?match_id=${editingMatch.id}&poll=${poll}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPageNotice(`Reset ${pollName} successfully.`);
        loadPollStats(editingMatch.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reset poll');
      }
    } catch (err: any) {
      alert(err.message || 'Error resetting poll');
    } finally {
      setPollActionLoading(false);
    }
  };

  // ---------------------------------------------------------------- stopwatch

  // Clock last saved on the server, converted to this device's time. Used only
  // when this device has no stored clock (e.g. the admin switched phones).
  const serverClockFallback = useMemo<ClockState | null>(() => {
    if (!editingMatch || editingMatch.status !== 'live') return null;
    const running = Boolean(editingMatch.clock_running);
    const accumulatedMs = editingMatch.clock_accumulated_ms || 0;
    if (!running && accumulatedMs <= 0) return null;
    const startedAt =
      running && editingMatch.clock_started_at
        ? Date.now() - Math.max(0, serverNowEstimate() - editingMatch.clock_started_at)
        : null;
    return {
      running: running && startedAt !== null,
      startedAt,
      accumulatedMs,
      period: isClockPeriod(editingMatch.clock_period) ? editingMatch.clock_period : null,
    };
  }, [editingMatch]);

  const matchClock = useMatchClock(editingMatch ? editingMatch.id : null, serverClockFallback);

  // Minute shown in the event forms: typed value, else the running match minute
  // (stoppage time stays on 30 or 60 and is noted on the event as "30+2'").
  const autoMinute = matchClock.hasStarted ? String(Math.min(matchClock.minute, 130)) : '';
  const stoppageNote = matchClock.hasStarted && matchClock.reading.stoppage > 0 ? matchClock.reading.label : null;
  const goalMinuteValue = goalMinuteEdited ? goalMinute : autoMinute;
  const cardMinuteValue = cardMinuteEdited ? cardMinute : autoMinute;

  const requestAutoSave = () => {
    if (status === 'live') setAutoSaveTick((t) => t + 1);
  };

  // Tells the server about the clock so the public site shows the live minute.
  const pushClock = (matchId: number, running: boolean, elapsed: number, period: ClockPeriod | null = null) => {
    fetch('/api/admin/matches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock', match_id: matchId, running, elapsed_ms: Math.round(elapsed), period }),
    }).catch((err) => console.error('Clock sync failed:', err));
  };

  // Everyone who can appear for a side in THIS match: its squad plus the guests added to it.
  const sidePlayers = (teamId: number): Player[] => {
    const squad = players.filter((p) => p.team_id === teamId);
    const sideGuests = guests
      .filter((g) => g.team_id === teamId)
      .map((g) => players.find((p) => p.id === g.player_id))
      .filter((p): p is Player => Boolean(p));
    return [...squad, ...sideGuests];
  };
  const isGuestHere = (playerId: number) => guests.some((g) => g.player_id === playerId);
  const jokerPool = players.filter((p) => p.is_joker && !isGuestHere(p.id));

  // Players eligible for goal registration (based on goalTeamId)
  const goalEligiblePlayers = useMemo(() => {
    return sidePlayers(goalTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, goalTeamId, guests]);

  // Potential assisters: registered players from the SAME team, excluding the chosen scorer
  const assisterEligiblePlayers = useMemo(() => {
    return goalEligiblePlayers.filter((p) => p.id !== goalPlayerId);
  }, [goalEligiblePlayers, goalPlayerId]);

  // Players eligible for card registration
  const cardEligiblePlayers = useMemo(() => {
    return sidePlayers(cardTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, cardTeamId, guests]);

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
      home_gk_id: homeGkId,
      away_gk_id: awayGkId,
      home_saves: homeSaves,
      away_saves: awaySaves,
      home_pen_saves: homePenSaves,
      away_pen_saves: awayPenSaves,
      guests,
    };

    return calculateMatchMVP(mockMatch, players, events as any[]);
  }, [
    editingMatch,
    homeScore,
    awayScore,
    homePenalties,
    awayPenalties,
    status,
    players,
    events,
    homeGkId,
    awayGkId,
    homeSaves,
    awaySaves,
    homePenSaves,
    awayPenSaves,
    guests,
  ]);

  // RECALCULATE AUTOMATIC MVPs (preview, confirm, apply)
  const handleRecalculateMvps = async () => {
    setRecalcBusy(true);
    setPageNotice(null);
    try {
      const call = async (apply: boolean) => {
        const res = await fetch('/api/admin/matches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'recalculate_mvp', apply }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Request failed');
        return d as {
          checked: number;
          manual_skipped: number;
          changes: { fixture: string; from: string | null; to: string | null }[];
        };
      };

      const preview = await call(false);
      if (preview.changes.length > 0) {
        const lines = preview.changes.map((c) => `• ${c.fixture}: ${c.from || 'nobody'} → ${c.to || 'nobody'}`).join('\n');
        const ok = confirm(
          `${preview.changes.length} Man of the Match award(s) will change:\n\n${lines}\n\n` +
            `${preview.manual_skipped} manual pick(s) stay as they are.\n\nApply these changes?`
        );
        if (!ok) {
          setPageNotice('Nothing was changed.');
          return;
        }
      }
      await call(true);
      setPageNotice(
        preview.changes.length > 0
          ? `Updated ${preview.changes.length} Man of the Match award(s) across ${preview.checked} automatic matches.`
          : `Checked ${preview.checked} match(es): every automatic Man of the Match is already correct.`
      );
      fetchTournamentData();
    } catch (err: any) {
      setPageNotice(`Could not recalculate: ${err.message || 'unknown error'}`);
    } finally {
      setRecalcBusy(false);
    }
  };

  // PENALTY SHOOTOUT (knockout matches): kick by kick, keeps the shootout score in sync
  const applyShootout = (kicks: typeof shootout) => {
    if (!editingMatch) return;
    setShootout(kicks);
    const scored = (teamId: number) => kicks.filter((k) => k.team_id === teamId && k.result === 'scored').length;
    setHomePenalties(kicks.length ? String(scored(editingMatch.home_team_id)) : '');
    setAwayPenalties(kicks.length ? String(scored(editingMatch.away_team_id)) : '');
    requestAutoSave();
  };

  const handleAddKick = (result: 'scored' | 'missed' | 'saved') => {
    if (!editingMatch || !kickTeamId) return;
    applyShootout([...shootout, { team_id: kickTeamId, player_id: kickPlayerId ? Number(kickPlayerId) : null, result }]);
    // Teams alternate: move to the other side for the next kick
    setKickTeamId(kickTeamId === editingMatch.home_team_id ? editingMatch.away_team_id : editingMatch.home_team_id);
    setKickPlayerId('');
  };

  // GUEST (JOKER) HANDLERS
  const handleAddGuest = () => {
    if (!editingMatch || !guestPlayerId || !guestTeamId) return;
    const pid = Number(guestPlayerId);
    if (isGuestHere(pid)) return;
    setGuests((prev) => [...prev, { player_id: pid, team_id: guestTeamId }]);
    setGuestPlayerId('');
    requestAutoSave();
  };

  const handleRemoveGuest = (playerId: number) => {
    const used = events.some((e) => e.player_id === playerId || e.assister_id === playerId);
    if (used) {
      alert('This guest has a goal, assist or card in this match. Remove those events first.');
      return;
    }
    setGuests((prev) => prev.filter((g) => g.player_id !== playerId));
    if (homeGkId === playerId) setHomeGkId(null);
    if (awayGkId === playerId) setAwayGkId(null);
    requestAutoSave();
  };

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
      minute: goalMinuteValue ? parseInt(goalMinuteValue) : null,
      // Stoppage-time goals are stamped 30' / 60' and shown as "30+2'"
      detail: !goalMinuteEdited && stoppageNote ? stoppageNote : null,
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
    setGoalMinuteEdited(false);
    setGoalAssisterId('');
    setGoalType('normal');
    requestAutoSave();
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
    requestAutoSave();
  };

  // UNDO: removes the most recently added event and reverses its effect on the score.
  const describeEvent = (ev: (typeof events)[number]) => {
    const icon =
      ev.event_type === 'goal'
        ? ev.sub_type === 'own_goal'
          ? '⚠️ Own goal'
          : '⚽ Goal'
        : ev.event_type === 'yellow_card'
        ? '🟨 Yellow card'
        : ev.event_type === 'red_card'
        ? '🟥 Red card'
        : '👟 Assist';
    return `${icon}${ev.minute ? ` ${ev.minute}'` : ''} · ${ev.player_name || 'Player'}`;
  };

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  const handleUndoLastEvent = () => {
    if (!lastEvent) return;
    const label = describeEvent(lastEvent);
    handleRemoveEvent(events.length - 1);
    setFeedback({ type: 'success', message: `Undone: ${label}` });
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
      minute: cardMinuteValue ? parseInt(cardMinuteValue) : null,
      detail: !cardMinuteEdited && stoppageNote ? stoppageNote : null,
      player_name: player?.name || 'Player',
      team_name: team?.name || 'Team',
    };

    setEvents((prev) => [...prev, newEv]);
    setCardMinute('');
    setCardMinuteEdited(false);
    requestAutoSave();
  };

  // SAVE RESULT & PUBLISH
  // `statusOverride` lets Start Match / Full Time save with the new status at once.
  // `silent` is used by the automatic live publishing (no banner, just a timestamp).
  const handleSaveResult = async (opts?: { statusOverride?: string; silent?: boolean; successMessage?: string }) => {
    if (!editingMatch) return false;
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setSaving(true);
      setFeedback(null);
    }

    try {
      const payload = {
        match_id: editingMatch.id,
        home_score: parseInt(homeScore) || 0,
        away_score: parseInt(awayScore) || 0,
        home_penalties: homePenalties !== '' ? parseInt(homePenalties) : null,
        away_penalties: awayPenalties !== '' ? parseInt(awayPenalties) : null,
        status: opts?.statusOverride || status,
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
        home_gk_id: homeGkId,
        away_gk_id: awayGkId,
        home_saves: homeSaves,
        away_saves: awaySaves,
        home_pen_saves: homePenSaves,
        away_pen_saves: awayPenSaves,
        guests,
        shootout,
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

      setLastPublishedAt(new Date());
      if (!silent) {
        setFeedback({
          type: 'success',
          message:
            opts?.successMessage ||
            'Match result, statistics, and MVP saved successfully! Standings and leaderboards updated.',
        });
      }
      fetchTournamentData();
      return true;
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `${silent ? 'Live update was NOT published: ' : ''}${err.message || 'Error saving match'}`,
      });
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Automatic live publishing: shortly after any change during a live match.
  const saveRef = useRef(handleSaveResult);
  saveRef.current = handleSaveResult;
  useEffect(() => {
    if (!autoSaveTick) return;
    const id = setTimeout(() => {
      void saveRef.current({ silent: true });
    }, 700);
    return () => clearTimeout(id);
  }, [autoSaveTick]);

  // STOPWATCH CONTROLS
  const handleStartMatch = () => {
    if (!editingMatch) return;
    matchClock.start();
    pushClock(editingMatch.id, true, 0, 'first');
    setStatus('live');
    void handleSaveResult({
      statusOverride: 'live',
      successMessage: 'Kick-off! The match is LIVE and every goal or card you add is published automatically.',
    });
  };

  const handlePauseClock = () => {
    if (!editingMatch) return;
    const next = matchClock.pause();
    pushClock(editingMatch.id, false, next.accumulatedMs, next.period || null);
  };

  const handleResumeClock = () => {
    if (!editingMatch) return;
    const next = matchClock.resume();
    pushClock(editingMatch.id, true, next.accumulatedMs, next.period || null);
  };

  // HALF TIME: the clock goes back to 30:00 and waits for the second half.
  const handleHalfTime = () => {
    if (!editingMatch) return;
    const next = matchClock.halfTime();
    pushClock(editingMatch.id, false, next.accumulatedMs, 'half_time');
    setFeedback({ type: 'success', message: 'Half time. The clock is waiting on 30:00; press "Start 2nd Half" at the restart.' });
  };

  // SECOND HALF: runs from 30:00 (31' to 60', then 60+1', 60+2'...).
  const handleStartSecondHalf = () => {
    if (!editingMatch) return;
    const next = matchClock.startSecondHalf();
    pushClock(editingMatch.id, true, next.accumulatedMs, 'second');
    if (status !== 'live') {
      setStatus('live');
      void handleSaveResult({ statusOverride: 'live', silent: true });
    }
    setFeedback({ type: 'success', message: 'Second half under way.' });
  };

  // FORFEIT: one team did not show up. Awards the agreed score with no goals, cards or MVP.
  const handleForfeit = async () => {
    if (!editingMatch || !forfeitTeamId) return;
    const loser = forfeitTeamId === editingMatch.home_team_id ? editingMatch.home_team_name : editingMatch.away_team_name;
    const winner = forfeitTeamId === editingMatch.home_team_id ? editingMatch.away_team_name : editingMatch.home_team_name;
    const hadEvents = events.length > 0;
    const ok = confirm(
      `Record a forfeit?\n\n${loser} did not show up.\n${winner} wins ${forfeitGoals}-0.\n\n` +
        (hadEvents ? `The ${events.length} goal/card event(s) entered for this match will be removed.\n\n` : '') +
        'No goals, cards, appearances or Man of the Match are counted for a forfeit.'
    );
    if (!ok) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forfeit', match_id: editingMatch.id, forfeit_team_id: forfeitTeamId, goals: forfeitGoals }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not record the forfeit');

      // Mirror the saved result in the open editor
      matchClock.reset();
      setHomeScore(String(d.home_score));
      setAwayScore(String(d.away_score));
      setHomePenalties('');
      setAwayPenalties('');
      setStatus('finished');
      setEvents([]);
      setGuests([]);
      setShootout([]);
      setHomeGkId(null);
      setAwayGkId(null);
      setHomeSaves(0);
      setAwaySaves(0);
      setHomePenSaves(0);
      setAwayPenSaves(0);
      setMvpMode('manual');
      setMvpPlayerId(null);
      setForfeitOpen(false);
      setForfeitedTeamId(forfeitTeamId);
      setFeedback({ type: 'success', message: `Forfeit recorded: ${winner} ${forfeitGoals}-0 ${loser}. Standings updated.` });
      fetchTournamentData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not record the forfeit' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetClock = () => {
    if (!editingMatch) return;
    if (!confirm('Reset the stopwatch to 00:00? Goals and cards already added are kept.')) return;
    matchClock.reset();
    pushClock(editingMatch.id, false, 0);
  };

  const handleFullTime = () => {
    if (!editingMatch) return;
    const summary = `${editingMatch.home_team_name || 'Home'} ${parseInt(homeScore) || 0} - ${parseInt(awayScore) || 0} ${
      editingMatch.away_team_name || 'Away'
    }`;
    if (!confirm(`End the match and publish the final result?\n\n${summary}`)) return;
    matchClock.reset();
    pushClock(editingMatch.id, false, 0);
    setStatus('finished');
    void handleSaveResult({
      statusOverride: 'finished',
      successMessage: `Full time! Final result published: ${summary}. Standings and leaderboards updated.`,
    });
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
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            disabled={recalcBusy}
            onClick={handleRecalculateMvps}
            className="min-h-[44px] px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 disabled:opacity-50 self-start"
          >
            <Crown className="w-4 h-4" />
            <span>{recalcBusy ? 'Checking...' : 'Recalculate Man of the Match'}</span>
          </button>
          {pageNotice && (
            <span role="status" className="text-xs text-slate-300" dir="auto">
              {pageNotice}
            </span>
          )}
        </div>
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
                    <span dir="auto" className="truncate">{m.home_team_name || 'TBD'}</span>
                    <span className="font-mono text-emerald-400 ml-2">
                      {isFinished || isLive ? m.home_score ?? 0 : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-sm text-white" dir="auto">
                    <span dir="auto" className="truncate">{m.away_team_name || 'TBD'}</span>
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
                    <span dir="auto">MVP: {m.mvp_player_name}</span>
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
                  className="py-2 px-2 rounded-xl bg-pitch-card hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-wider transition border border-white/10 flex items-center justify-center space-x-1 min-h-[44px]"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set Schedule</span>
                </button>
                <button
                  onClick={() => openMatchEditor(m)}
                  className="py-2 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[11px] uppercase tracking-wider transition border border-emerald-500/30 flex items-center justify-center space-x-1 min-h-[44px]"
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
              {matchClock.hasStarted && (
                <span
                  className={`ml-auto mr-2 flex-shrink-0 font-mono font-black text-sm sm:text-base px-2.5 py-1 rounded-lg border tabular-nums ${
                    matchClock.running
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}
                  aria-label="Match clock"
                >
                  {matchClock.period === 'half_time' ? '' : matchClock.running ? '● ' : '⏸ '}
                  {matchClock.period ? matchClock.reading.label : formatClock(matchClock.elapsed)}
                </span>
              )}
              <button
                onClick={() => setEditingMatch(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-xl px-3 py-2 text-base sm:text-xs font-bold text-white focus:outline-none focus:border-emerald-500 uppercase tracking-wider min-h-[44px]"
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

            {/* FORFEIT (a team did not show up) */}
            {forfeitedTeamId && status === 'finished' && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200" dir="auto">
                🏳 <span className="font-black">Awarded by forfeit.</span>{' '}
                {forfeitedTeamId === editingMatch.home_team_id ? editingMatch.home_team_name : editingMatch.away_team_name} did
                not show up. No goals, appearances or Man of the Match are counted. Entering a real result turns it back
                into a normal match.
              </div>
            )}
            {editingMatch.home_team_id && editingMatch.away_team_id && !matchClock.hasStarted && (
              <div className="rounded-2xl border border-amber-500/30 bg-pitch-card">
                <button
                  type="button"
                  onClick={() => setForfeitOpen((v) => !v)}
                  aria-expanded={forfeitOpen}
                  className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-300"
                >
                  <span>🏳 A team did not show up (forfeit)</span>
                  <span className="text-slate-400">{forfeitOpen ? 'Hide' : 'Open'}</span>
                </button>
                {forfeitOpen && (
                  <div className="p-4 pt-0 space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">1. Who did not show up?</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: editingMatch.home_team_id, name: editingMatch.home_team_name },
                          { id: editingMatch.away_team_id, name: editingMatch.away_team_name },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            dir="auto"
                            onClick={() => setForfeitTeamId(t.id)}
                            aria-pressed={forfeitTeamId === t.id}
                            className={`min-h-[48px] px-2 rounded-xl text-xs font-black truncate border transition ${
                              forfeitTeamId === t.id
                                ? 'bg-amber-500/25 text-amber-100 border-amber-400/60'
                                : 'bg-pitch-darkest text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">2. Forfeit score</span>
                      <div className="grid grid-cols-2 gap-2">
                        {([5, 10] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setForfeitGoals(g)}
                            aria-pressed={forfeitGoals === g}
                            className={`min-h-[48px] rounded-xl font-mono font-black text-lg border transition ${
                              forfeitGoals === g
                                ? 'bg-amber-500/25 text-amber-100 border-amber-400/60'
                                : 'bg-pitch-darkest text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {g} - 0
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!forfeitTeamId || saving}
                      onClick={handleForfeit}
                      className="w-full min-h-[52px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-pitch-darkest font-black text-xs uppercase tracking-wider transition"
                    >
                      {forfeitTeamId
                        ? `Record forfeit: ${
                            forfeitTeamId === editingMatch.home_team_id ? editingMatch.away_team_name : editingMatch.home_team_name
                          } wins ${forfeitGoals}-0`
                        : 'Choose the team that did not show up'}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      The match is published as finished. It counts in the standings, but nobody gets goals, an
                      appearance, a clean sheet or Man of the Match.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PITCH-SIDE STOPWATCH */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                matchClock.running
                  ? 'bg-red-950/30 border-red-500/40'
                  : matchClock.hasStarted
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-pitch-card border-pitch-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Timer className="w-4 h-4 text-emerald-400" />
                  <span>Pitch-side Stopwatch</span>
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    matchClock.running
                      ? 'bg-red-500 text-white border-red-400 animate-pulse'
                      : matchClock.hasStarted
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : status === 'finished'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {matchClock.period === 'half_time'
                    ? 'Half time'
                    : matchClock.running
                    ? matchClock.period === 'first'
                      ? '1st half'
                      : matchClock.period === 'second'
                      ? '2nd half'
                      : 'Live'
                    : matchClock.hasStarted
                    ? 'Paused'
                    : status === 'finished'
                    ? 'Full time'
                    : 'Not started'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="text-center sm:text-left sm:pr-4">
                  <div
                    className={`font-mono font-black text-5xl sm:text-6xl leading-none tabular-nums ${
                      matchClock.running ? 'text-white' : matchClock.hasStarted ? 'text-amber-300' : 'text-slate-500'
                    }`}
                    aria-live="off"
                  >
                    {formatClock(matchClock.elapsed)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    {matchClock.hasStarted ? (
                      <>
                        Fans see{' '}
                        <span className="font-mono font-black text-white">{matchClock.reading.label}</span>
                        {matchClock.period === 'half_time' ? (
                          ' · waiting for the second half'
                        ) : (
                          <>
                            {' '}
                            · new events are stamped{' '}
                            <span className="font-mono font-bold text-emerald-400">{stoppageNote || `${autoMinute}'`}</span>
                          </>
                        )}
                      </>
                    ) : (
                      'Start the clock at kick-off: minutes fill in by themselves.'
                    )}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  {!matchClock.hasStarted ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleStartMatch}
                      className="col-span-2 min-h-[56px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-pitch-darkest font-black text-sm uppercase tracking-wider shadow-glow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>{status === 'finished' ? 'Restart Match (Live)' : 'Start Match'}</span>
                    </button>
                  ) : matchClock.period === 'half_time' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleStartSecondHalf}
                        className="col-span-2 min-h-[56px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-pitch-darkest font-black text-sm uppercase tracking-wider shadow-glow transition flex items-center justify-center space-x-2"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Start 2nd Half</span>
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleFullTime}
                        className="col-span-2 min-h-[52px] rounded-xl bg-red-500/20 hover:bg-red-500/30 active:scale-[0.98] border border-red-500/50 text-red-200 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>Full Time</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {matchClock.running ? (
                        <button
                          type="button"
                          onClick={handlePauseClock}
                          className="min-h-[52px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-[0.98] border border-amber-500/50 text-amber-200 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5"
                        >
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pause</span>
                        </button>
                        ) : (
                        <button
                          type="button"
                          onClick={handleResumeClock}
                          className="min-h-[52px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-[0.98] border border-emerald-500/50 text-emerald-200 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Resume</span>
                        </button>
                        )}
                      {matchClock.period === 'first' ? (
                        <button
                          type="button"
                          onClick={handleHalfTime}
                          className="min-h-[52px] rounded-xl bg-blue-500/25 hover:bg-blue-500/40 active:scale-[0.98] border border-blue-400/50 text-blue-100 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Half Time</span>
                        </button>
                        ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={handleFullTime}
                          className="min-h-[52px] rounded-xl bg-red-500/20 hover:bg-red-500/30 active:scale-[0.98] border border-red-500/50 text-red-200 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                        >
                          <Square className="w-4 h-4 fill-current" />
                          <span>Full Time</span>
                        </button>
                        )}
                      {matchClock.period === 'first' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={handleFullTime}
                          className="col-span-2 min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-[11px] uppercase tracking-wider transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>End match now (Full Time)</span>
                        </button>
                        )}
                    </>
                  )}
                </div>
              </div>

              {/* Undo + live publishing status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={!lastEvent}
                  onClick={handleUndoLastEvent}
                  className="min-h-[48px] px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/15 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Undo Last Event</span>
                </button>
                <div className="flex-1 min-w-0 text-[11px] text-slate-400">
                  {lastEvent ? (
                    <span className="block truncate" dir="auto">
                      Last: <span className="text-slate-200 font-semibold">{describeEvent(lastEvent)}</span>
                    </span>
                  ) : (
                    <span>No events yet.</span>
                  )}
                  {status === 'live' && (
                    <span className="block text-emerald-400/90">
                      {lastPublishedAt
                        ? `Published live at ${lastPublishedAt.toLocaleTimeString('en-GB')}`
                        : 'Live: changes publish automatically'}
                    </span>
                  )}
                </div>
                {matchClock.hasStarted && (
                  <button
                    type="button"
                    onClick={handleResetClock}
                    className="min-h-[44px] px-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-bold transition flex items-center justify-center space-x-1 flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset clock</span>
                  </button>
                )}
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
                onClick={() => setModalTab('gk')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'gk'
                    ? 'border-blue-400 text-blue-300 bg-blue-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>
                  🧤 Keepers & Guests ({homeSaves + awaySaves + homePenSaves + awayPenSaves}
                  {guests.length > 0 ? ` · ${guests.length}🃏` : ''})
                </span>
              </button>
              {editingMatch.stage !== 'group' && (
                <button
                  type="button"
                  onClick={() => setModalTab('shootout')}
                  className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                    modalTab === 'shootout'
                      ? 'border-red-400 text-red-300 bg-red-400/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🎯 Shootout ({shootout.length})</span>
                </button>
              )}
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
              <button
                type="button"
                onClick={() => setModalTab('polls')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  modalTab === 'polls'
                    ? 'border-purple-400 text-purple-300 bg-purple-400/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>
                  🗳️ Polls ({pollStats ? (pollStats.winner?.total || 0) + (pollStats.motm?.total || 0) : 0})
                </span>
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
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 min-h-[44px]"
                      >
                        {goalEligiblePlayers.map((p) => (
                          <option dir="auto" key={p.id} value={p.id}>
                            {p.name} {p.is_captain ? '(C)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                        <span>3. Minute</span>
                        {matchClock.hasStarted &&
                          (goalMinuteEdited ? (
                            <button
                              type="button"
                              onClick={() => {
                                setGoalMinute('');
                                setGoalMinuteEdited(false);
                              }}
                              className="text-emerald-400 font-black underline"
                            >
                              use clock
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-black">auto</span>
                          ))}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="130"
                        placeholder="e.g. 23"
                        value={goalMinuteValue}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setGoalMinute(e.target.value);
                          setGoalMinuteEdited(true);
                        }}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500 min-h-[44px]"
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
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 min-h-[44px]"
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
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 disabled:opacity-40 min-h-[44px]"
                      >
                        <option value="">-- No Assist (Solo Effort / Unassisted) --</option>
                        {assisterEligiblePlayers.map((p) => (
                          <option dir="auto" key={p.id} value={p.id}>
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
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-pitch-darkest font-black text-xs uppercase tracking-wider transition shadow-glow flex items-center justify-center space-x-2 min-h-[48px]"
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
                                    <span dir="auto" className="text-emerald-400/90 font-medium">
                                      • Assist: {ev.assister_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEvent(index)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
                      >
                        <option dir="auto" value={editingMatch.home_team_id}>{editingMatch.home_team_name}</option>
                        <option dir="auto" value={editingMatch.away_team_id}>{editingMatch.away_team_name}</option>
                      </select>
                    </div>

                    {/* Card Type */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Card Type</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value as any)}
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
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
                        className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
                      >
                        {cardEligiblePlayers.map((p) => (
                          <option dir="auto" key={p.id} value={p.id}>
                            {p.name} {p.is_captain ? '(C)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Minute & Button */}
                    <div className="flex items-end space-x-2">
                      <div className="w-16">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Min&apos;{' '}
                          {matchClock.hasStarted && !cardMinuteEdited && <span className="text-emerald-400">auto</span>}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="45"
                          value={cardMinuteValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            setCardMinute(e.target.value);
                            setCardMinuteEdited(true);
                          }}
                          className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-center text-white font-mono min-h-[44px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCard}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-pitch-darkest font-black text-xs uppercase tracking-wider transition min-h-[44px]"
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
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
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



            {/* TAB 3: GOALKEEPERS, SAVES & GUEST PLAYERS */}
            {modalTab === 'gk' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        side: 'home' as const,
                        teamId: editingMatch.home_team_id,
                        teamName: editingMatch.home_team_name,
                        gkId: homeGkId,
                        setGk: setHomeGkId,
                        saves: homeSaves,
                        setSaves: setHomeSaves,
                        pens: homePenSaves,
                        setPens: setHomePenSaves,
                      },
                      {
                        side: 'away' as const,
                        teamId: editingMatch.away_team_id,
                        teamName: editingMatch.away_team_name,
                        gkId: awayGkId,
                        setGk: setAwayGkId,
                        saves: awaySaves,
                        setSaves: setAwaySaves,
                        pens: awayPenSaves,
                        setPens: setAwayPenSaves,
                      },
                    ]
                  ).map((k) => {
                    const team = teams.find((t) => t.id === k.teamId);
                    const usualKeeper = players.find((p) => p.id === team?.goalkeeper_id);
                    const keeper = players.find((p) => p.id === k.gkId) || usualKeeper;
                    const bump = (set: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
                      set((v) => Math.max(0, v + delta));
                      requestAutoSave();
                    };
                    return (
                      <div key={k.side} className="p-4 rounded-2xl bg-pitch-card border border-blue-500/30 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black uppercase text-blue-300 truncate" dir="auto">
                            🧤 {k.teamName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate" dir="auto">
                            {keeper ? keeper.name : 'No keeper set'}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                            Goalkeeper in this match
                          </label>
                          <select
                            value={k.gkId ?? ''}
                            onChange={(e) => {
                              k.setGk(e.target.value ? Number(e.target.value) : null);
                              requestAutoSave();
                            }}
                            className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-blue-400 min-h-[44px]"
                          >
                            <option value="">
                              {usualKeeper ? `Usual keeper: ${usualKeeper.name}` : 'Usual keeper (none set for this team)'}
                            </option>
                            {sidePlayers(k.teamId).map((p) => (
                              <option dir="auto" key={p.id} value={p.id}>
                                {p.name} {isGuestHere(p.id) ? '🃏 guest' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {(
                          [
                            { label: 'Great saves', hint: 'only you see this', value: k.saves, set: k.setSaves },
                            {
                              label: 'Penalties saved',
                              hint: 'Shootout saves are added automatically',
                              value: k.pens,
                              set: k.setPens,
                            },
                          ]
                        ).map((c) => (
                          <div key={c.label} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-white">{c.label}</span>
                              {c.hint && <span className="block text-[10px] text-slate-500">{c.hint}</span>}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => bump(c.set, -1)}
                                disabled={c.value === 0}
                                aria-label={`Remove one: ${c.label}, ${k.teamName}`}
                                className="w-12 h-12 rounded-xl bg-pitch-darkest hover:bg-white/10 active:scale-95 border border-white/10 text-white font-black text-xl flex items-center justify-center transition disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-mono font-black text-2xl text-white tabular-nums">
                                {c.value}
                              </span>
                              <button
                                type="button"
                                onClick={() => bump(c.set, 1)}
                                aria-label={`Add one: ${c.label}, ${k.teamName}`}
                                className="w-14 h-12 rounded-xl bg-blue-500/25 hover:bg-blue-500/40 active:scale-95 border border-blue-400/50 text-blue-100 font-black text-2xl flex items-center justify-center transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Guest / joker players */}
                <div className="p-4 rounded-2xl bg-pitch-card border border-purple-500/30 space-y-3">
                  <div>
                    <span className="text-xs font-black uppercase text-purple-300">🃏 Guest players (jokers)</span>
                    <p className="text-[11px] text-slate-400">
                      Add a joker to one side for this match only. He then appears in that team&apos;s scorer, assist,
                      card and goalkeeper lists.
                    </p>
                  </div>

                  {guests.length > 0 && (
                    <ul className="space-y-1.5">
                      {guests.map((g) => {
                        const p = players.find((x) => x.id === g.player_id);
                        return (
                          <li
                            key={g.player_id}
                            className="flex items-center justify-between gap-2 p-2 pl-3 rounded-xl bg-pitch-darkest border border-white/5 text-xs"
                          >
                            <span className="min-w-0 truncate" dir="auto">
                              <span className="font-black text-white">{p?.name || `Player #${g.player_id}`}</span>
                              <span className="text-slate-400">
                                {' '}
                                · for {g.team_id === editingMatch.home_team_id ? editingMatch.home_team_name : editingMatch.away_team_name}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest(g.player_id)}
                              aria-label={`Remove guest ${p?.name || ''}`}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {jokerPool.length === 0 && guests.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      No jokers registered. Create one in Players → Register New Player → tick &quot;Joker&quot;.
                    </p>
                  ) : (
                    jokerPool.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                        <select
                          value={guestPlayerId}
                          onChange={(e) => setGuestPlayerId(e.target.value)}
                          aria-label="Joker to add"
                          className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
                        >
                          <option value="">-- Choose joker --</option>
                          {jokerPool.map((p) => (
                            <option dir="auto" key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={guestTeamId}
                          onChange={(e) => setGuestTeamId(Number(e.target.value))}
                          aria-label="Side the joker plays for"
                          className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
                        >
                          <option dir="auto" value={editingMatch.home_team_id}>
                            plays for {editingMatch.home_team_name}
                          </option>
                          <option dir="auto" value={editingMatch.away_team_id}>
                            plays for {editingMatch.away_team_name}
                          </option>
                        </select>
                        <button
                          type="button"
                          disabled={!guestPlayerId}
                          onClick={handleAddGuest}
                          className="min-h-[44px] px-4 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider transition"
                        >
                          + Add guest
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* TAB: PENALTY SHOOTOUT (knockout matches only) */}
            {modalTab === 'shootout' && editingMatch.stage !== 'group' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-pitch-card border border-red-500/30 space-y-3">
                  <div>
                    <span className="text-xs font-black uppercase text-red-300">🎯 Penalty shootout, kick by kick</span>
                    <p className="text-[11px] text-slate-400">
                      Tap the outcome of each kick. The shootout score updates itself, and a saved kick counts as a
                      penalty save for the other team&apos;s keeper.
                    </p>
                  </div>

                  {/* Live shootout score */}
                  <div className="space-y-2">
                    {[
                      { id: editingMatch.home_team_id, name: editingMatch.home_team_name },
                      { id: editingMatch.away_team_id, name: editingMatch.away_team_name },
                    ].map((t) => {
                      const kicks = shootout.filter((k) => k.team_id === t.id);
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-pitch-darkest border border-white/5">
                          <span className="font-bold text-xs text-white truncate min-w-0" dir="auto">
                            {t.name}
                          </span>
                          <span className="flex items-center gap-1 flex-wrap justify-end">
                            {kicks.map((k, i) => (
                              <span
                                key={i}
                                title={k.result}
                                className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-black ${
                                  k.result === 'scored'
                                    ? 'bg-emerald-500 border-emerald-300 text-pitch-darkest'
                                    : 'bg-red-500/80 border-red-300 text-white'
                                }`}
                              >
                                {k.result === 'scored' ? '✓' : k.result === 'saved' ? '🧤' : '✕'}
                              </span>
                            ))}
                            <span className="ml-2 font-mono font-black text-xl text-white tabular-nums">
                              {kicks.filter((k) => k.result === 'scored').length}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Next kick */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: editingMatch.home_team_id, name: editingMatch.home_team_name },
                      { id: editingMatch.away_team_id, name: editingMatch.away_team_name },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setKickTeamId(t.id);
                          setKickPlayerId('');
                        }}
                        dir="auto"
                        className={`min-h-[44px] px-2 rounded-xl text-xs font-black truncate border transition ${
                          kickTeamId === t.id
                            ? 'bg-red-500/20 text-red-200 border-red-500/50'
                            : 'bg-pitch-darkest text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {t.name} kicks
                      </button>
                    ))}
                  </div>
                  <select
                    value={kickPlayerId}
                    onChange={(e) => setKickPlayerId(e.target.value)}
                    aria-label="Penalty taker"
                    className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold min-h-[44px]"
                  >
                    <option value="">-- Taker (optional) --</option>
                    {sidePlayers(kickTeamId).map((p) => (
                      <option dir="auto" key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddKick('scored')}
                      className="min-h-[56px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-pitch-darkest font-black text-xs uppercase tracking-wider transition"
                    >
                      ⚽ Scored
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddKick('saved')}
                      className="min-h-[56px] rounded-xl bg-blue-500/30 hover:bg-blue-500/45 active:scale-95 border border-blue-400/50 text-blue-100 font-black text-xs uppercase tracking-wider transition"
                    >
                      🧤 Saved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddKick('missed')}
                      className="min-h-[56px] rounded-xl bg-red-500/25 hover:bg-red-500/40 active:scale-95 border border-red-400/50 text-red-100 font-black text-xs uppercase tracking-wider transition"
                    >
                      ✕ Missed
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      disabled={shootout.length === 0}
                      onClick={() => applyShootout(shootout.slice(0, -1))}
                      className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 disabled:opacity-40"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Undo last kick</span>
                    </button>
                    <button
                      type="button"
                      disabled={shootout.length === 0}
                      onClick={() => {
                        if (confirm('Remove every kick of this shootout?')) applyShootout([]);
                      }}
                      className="min-h-[44px] px-3 rounded-xl text-slate-400 hover:text-red-300 text-[11px] font-bold transition disabled:opacity-40"
                    >
                      Clear shootout
                    </button>
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
                          className="w-full bg-pitch-darkest border border-purple-500/40 rounded-xl p-2.5 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-purple-400 min-h-[44px]"
                        >
                          <option value="">-- No MVP Selected --</option>
                          <optgroup label={`🔵 ${editingMatch.home_team_name}`}>
                            {sidePlayers(editingMatch.home_team_id)
                              .map((p) => (
                                <option dir="auto" key={p.id} value={p.id}>
                                  {p.name} {p.is_captain ? '(C)' : ''} ({editingMatch.home_team_name})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label={`🔴 ${editingMatch.away_team_name}`}>
                            {sidePlayers(editingMatch.away_team_id)
                              .map((p) => (
                                <option dir="auto" key={p.id} value={p.id}>
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

            {/* TAB 5: FAN POLLS */}
            {modalTab === 'polls' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-pitch-card border border-purple-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-xs font-black uppercase text-purple-300">
                        🗳️ Fan Polls & Voting Control
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Live voting statistics and admin reset tools for this match.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pollActionLoading || !pollStats || ((pollStats.winner?.total || 0) + (pollStats.motm?.total || 0) === 0)}
                      onClick={() => handleResetPoll('all')}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition disabled:opacity-40 min-h-[36px] self-start sm:self-auto"
                    >
                      Reset all polls
                    </button>
                  </div>

                  {/* Winner Poll Card */}
                  <div className="p-3.5 rounded-xl bg-pitch-darkest/70 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">Winner Poll: Who will win?</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pollStats?.winner?.open ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>
                          {pollStats?.winner?.open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {pollStats?.winner?.total || 0} votes
                        </span>
                        <button
                          type="button"
                          disabled={pollActionLoading || !pollStats?.winner?.total}
                          onClick={() => handleResetPoll('winner')}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10px] font-bold transition disabled:opacity-40 min-h-[32px]"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {pollStats?.winner?.counts && Object.keys(pollStats.winner.counts).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                        {Object.entries(pollStats.winner.counts).map(([choice, count]) => (
                          <div key={choice} className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                            <span className="text-slate-400 capitalize">{choice}:</span>
                            <span className="font-mono font-bold text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic block">No votes recorded yet</span>
                    )}
                  </div>

                  {/* MOTM Poll Card */}
                  <div className="p-3.5 rounded-xl bg-pitch-darkest/70 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">Fans&apos; Man of the Match Poll</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pollStats?.motm?.open ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>
                          {pollStats?.motm?.open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {pollStats?.motm?.total || 0} votes
                        </span>
                        <button
                          type="button"
                          disabled={pollActionLoading || !pollStats?.motm?.total}
                          onClick={() => handleResetPoll('motm')}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10px] font-bold transition disabled:opacity-40 min-h-[32px]"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {pollStats?.motm?.counts && Object.keys(pollStats.motm.counts).length > 0 ? (
                      <div className="space-y-1.5 pt-1 text-xs max-h-48 overflow-y-auto">
                        {Object.entries(pollStats.motm.counts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([playerId, count]) => {
                            const opt = pollStats.motm?.options?.find((o: any) => o.id === playerId);
                            return (
                              <div key={playerId} className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                                <span className="text-slate-200" dir="auto">{opt?.label || `Player #${playerId}`}</span>
                                <span className="font-mono font-bold text-amber-400">{count} votes</span>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic block">No votes recorded yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STICKY SAVE & PUBLISH BAR */}
            <div className="sticky bottom-0 z-20 bg-pitch-darkest/95 backdrop-blur-lg -mx-4 -mb-4 px-4 py-3 sm:-mx-7 sm:-mb-7 sm:px-7 sm:py-4 border-t border-white/10 flex items-center justify-between rounded-b-2xl sm:rounded-b-3xl">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold tracking-wide transition min-h-[44px]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveResult()}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-2 disabled:opacity-50 min-h-[44px]"
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
                className="text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500 font-mono min-h-[44px]"
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
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500 font-mono min-h-[44px]"
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
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSchedulingMatch(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition min-h-[44px]"
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
