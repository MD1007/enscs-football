'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Award,
  Crown,
  Star,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Flame,
  Shield,
  Zap,
  RefreshCw,
  Save,
  Sliders,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Player,
  Team,
  TeamOfTournamentData,
  TeamOfTournamentPlayer,
  AwardItem,
  AwardKey,
  AwardStatus,
} from '@/lib/types';
import { getFormationSlots } from '@/lib/calculations';

export default function AdminAwardsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'pot' | 'tott' | 'goalkeepers' | 'weights'>('overview');

  // Server state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [awardsList, setAwardsList] = useState<AwardItem[]>([]);
  const [playerOfTheTournament, setPlayerOfTheTournament] = useState<any[]>([]);
  const [bestGoalkeepers, setBestGoalkeepers] = useState<any[]>([]);
  const [cleanSheetsLeaderboard, setCleanSheetsLeaderboard] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topAssists, setTopAssists] = useState<any[]>([]);
  const [topMVPs, setTopMVPs] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, TeamOfTournamentData>>({});

  // Team of the Tournament admin state
  const [tottRevealed, setTottRevealed] = useState(false);
  const [formation, setFormation] = useState<string>('1-2-1');
  const [starters, setStarters] = useState<TeamOfTournamentPlayer[]>([]);
  const [substitutes, setSubstitutes] = useState<TeamOfTournamentPlayer[]>([]);

  // Slot editor modal state
  const [editingSlot, setEditingSlot] = useState<{
    slot_id: string;
    slot_type: 'starter' | 'substitute';
    position_label: string;
  } | null>(null);

  // Weights state
  const [weights, setWeights] = useState({
    goal: 4,
    assist: 3,
    motm: 3,
    gk_clean_sheet: 4,
    def_clean_sheet: 2,
    yellow_card: -1,
    red_card: -3,
  });
  const [minAppearances, setMinAppearances] = useState<number>(3);

  const fetchAwardsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/awards');
      if (!res.ok) throw new Error('Failed to load awards data');
      const data = await res.json();

      setPlayers(data.players || []);
      setTeams(data.teams || []);
      setPlayerOfTheTournament(data.player_of_tournament || []);
      setBestGoalkeepers(data.best_goalkeepers || []);
      setCleanSheetsLeaderboard(data.clean_sheets_leaderboard || []);
      setTopScorers(data.top_scorers || []);
      setTopAssists(data.top_assists || []);
      setTopMVPs(data.top_mvps || []);
      setSuggestions(data.suggestions || {});

      const awards = data.awards || {};
      setAwardsList(awards.awards_list || []);

      if (awards.weights) {
        setWeights(awards.weights);
      }
      if (awards.min_appearances !== undefined) {
        setMinAppearances(awards.min_appearances);
      }

      setTottRevealed(Boolean(awards.tott_revealed));

      if (awards.tott_data) {
        setFormation(awards.tott_data.formation || '1-2-1');
        setStarters(awards.tott_data.starters || []);
        setSubstitutes(awards.tott_data.substitutes || []);
      } else if (data.suggestions && data.suggestions['1-2-1']) {
        const defaultSugg = data.suggestions['1-2-1'];
        setFormation(defaultSugg.formation);
        setStarters(defaultSugg.starters);
        setSubstitutes(defaultSugg.substitutes);
      }
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error loading awards data' });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAwardsData();
  }, []);

  // Update specific award
  const handleUpdateAward = async (
    awardKey: AwardKey,
    params: {
      winner_player_id?: number | null;
      selection_mode?: 'auto' | 'manual';
      is_locked?: boolean;
      is_revealed?: boolean;
      data_json?: any;
    }
  ) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_award',
          award_key: awardKey,
          ...params,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update award');

      setFeedback({ type: 'success', message: 'Award updated successfully!' });
      fetchAwardsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update award' });
    } finally {
      setSaving(false);
    }
  };

  // Master Action: Reveal / Hide All Awards Together
  const handleRevealAll = async (reveal: boolean) => {
    const confirmMsg = reveal
      ? 'Are you sure you want to REVEAL ALL AWARDS simultaneously? Visitors to the public awards page will immediately see all official tournament winners.'
      : 'Hide all awards from the public website?';

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reveal_all',
          is_revealed: reveal,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to toggle awards');

      setFeedback({
        type: 'success',
        message: reveal ? '🎉 All tournament awards revealed together!' : 'All awards have been hidden.',
      });
      fetchAwardsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to toggle awards' });
    } finally {
      setSaving(false);
    }
  };

  // Save Scoring Weights & Min Apps
  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_weights',
          weights,
          min_appearances: minAppearances,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save weights');

      setFeedback({ type: 'success', message: 'Scoring formula and eligibility updated!' });
      fetchAwardsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save weights' });
    } finally {
      setSaving(false);
    }
  };

  // TOTT Formation Change
  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    const newSlots = getFormationSlots(newFormation);

    const updatedStarters: TeamOfTournamentPlayer[] = newSlots.map((slot, idx) => {
      const existing = starters[idx];
      return {
        slot_id: slot.slot_id,
        slot_type: 'starter',
        position_label: slot.position_label,
        pitch_x: slot.pitch_x,
        pitch_y: slot.pitch_y,
        player_id: existing?.player_id || 0,
        player_name: existing?.player_name || 'Select Player',
        player_team_id: existing?.player_team_id || 0,
        player_team_name: existing?.player_team_name || '',
        goals: existing?.goals || 0,
        assists: existing?.assists || 0,
        mvps: existing?.mvps || 0,
        points: existing?.points || 0,
      };
    });

    setStarters(updatedStarters);
  };

  // Load recommended TOTT lineup
  const handleLoadSuggestion = () => {
    const sugg = suggestions[formation] || suggestions['1-2-1'];
    if (!sugg) return;
    setStarters(sugg.starters);
    setSubstitutes(sugg.substitutes);
    setFeedback({ type: 'success', message: `Loaded top performers for formation ${formation}!` });
  };

  // Assign player to TOTT slot
  const handleSelectPlayerForSlot = (selectedPlayer: Player) => {
    if (!editingSlot) return;

    const allAssignedIds = [
      ...starters.map((s) => s.player_id),
      ...substitutes.map((s) => s.player_id),
    ].filter((id) => id > 0);

    if (allAssignedIds.includes(selectedPlayer.id)) {
      alert(`${selectedPlayer.name} is already in the lineup. Please choose another player.`);
      return;
    }

    if (editingSlot.slot_type === 'starter') {
      setStarters((prev) =>
        prev.map((s) => {
          if (s.slot_id === editingSlot.slot_id) {
            return {
              ...s,
              player_id: selectedPlayer.id,
              player_name: selectedPlayer.name,
              player_team_id: selectedPlayer.team_id,
              player_team_name: selectedPlayer.team_name || '',
              goals: selectedPlayer.goals || 0,
              assists: selectedPlayer.assists || 0,
              mvps: selectedPlayer.mvps || 0,
              points: selectedPlayer.overall_points || 0,
            };
          }
          return s;
        })
      );
    } else {
      setSubstitutes((prev) =>
        prev.map((s) => {
          if (s.slot_id === editingSlot.slot_id) {
            return {
              ...s,
              player_id: selectedPlayer.id,
              player_name: selectedPlayer.name,
              player_team_id: selectedPlayer.team_id,
              player_team_name: selectedPlayer.team_name || '',
              goals: selectedPlayer.goals || 0,
              assists: selectedPlayer.assists || 0,
              mvps: selectedPlayer.mvps || 0,
              points: selectedPlayer.overall_points || 0,
            };
          }
          return s;
        })
      );
    }

    setEditingSlot(null);
  };

  // Save TOTT changes
  const handleSaveTott = () => {
    handleUpdateAward('tott', {
      data_json: {
        formation,
        starters,
        substitutes,
      },
    });
  };

  // Get award helper
  const getAward = (key: AwardKey): AwardItem | undefined => {
    return awardsList.find((a) => a.award_key === key);
  };

  // Render Status Badge
  const renderStatusBadge = (status: AwardStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Published</span>
          </span>
        );
      case 'locked':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center space-x-1">
            <Lock className="w-2.5 h-2.5" />
            <span>Locked</span>
          </span>
        );
      case 'ready':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Ready</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
            In Progress
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-700">
            Not Started
          </span>
        );
    }
  };

  const allRevealed = awardsList.length > 0 && awardsList.every((a) => a.is_revealed);
  const anyRevealed = awardsList.some((a) => a.is_revealed);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Technical Honors</span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Tournament Awards Management</h1>
          <p className="text-sm text-slate-400">
            Manage all 7 tournament honors privately until the final, review candidates, verify ties, and reveal the ceremony.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/awards"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Awards</span>
          </Link>

          <button
            onClick={() => handleRevealAll(!allRevealed)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5 ${
              allRevealed
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-pitch-darkest hover:opacity-95'
            }`}
          >
            {allRevealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide All Awards</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>⭐ Reveal All Awards Together</span>
              </>
            )}
          </button>
        </div>
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
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
              : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>All 7 Awards ({awardsList.filter((a) => a.is_revealed).length}/7 Revealed)</span>
        </button>

        <button
          onClick={() => setActiveTab('pot')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'pot'
              ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
              : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Player of Tournament</span>
        </button>

        <button
          onClick={() => setActiveTab('tott')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'tott'
              ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
              : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Team of Tournament (Best 7)</span>
        </button>

        <button
          onClick={() => setActiveTab('goalkeepers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'goalkeepers'
              ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
              : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4 text-blue-400" />
          <span>Goalkeepers & Clean Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'weights'
              ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
              : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4 text-slate-400" />
          <span>Scoring Formula</span>
        </button>
      </div>

      {/* TAB 1: ALL 7 AWARDS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-pitch-border bg-pitch-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Centralized Ceremony Dashboard</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {awardsList.filter((a) => a.is_revealed).length} of 7 Published
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                You can configure each award individually, choose between automatic statistical leader or manual override, lock selections, and reveal them individually or all at once.
              </p>
            </div>

            <button
              onClick={() => handleRevealAll(!allRevealed)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow hover:bg-amber-300 transition flex items-center space-x-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{allRevealed ? 'Hide All Awards' : 'Reveal All Awards Together'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {awardsList.map((award) => {
              const isLocked = award.is_locked;
              const isRevealed = award.is_revealed;
              const isManual = award.selection_mode === 'manual';

              return (
                <div
                  key={award.award_key}
                  className={`glass-panel rounded-2xl border p-5 space-y-4 flex flex-col justify-between ${
                    isRevealed
                      ? 'border-emerald-500/50 bg-pitch-card/90 shadow-glow'
                      : isLocked
                      ? 'border-purple-500/40 bg-pitch-card/80'
                      : 'border-pitch-border bg-pitch-card/70'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {renderStatusBadge(award.status)}

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdateAward(award.award_key, { is_locked: !isLocked })}
                          title={isLocked ? 'Unlock award' : 'Lock award'}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            isLocked
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleUpdateAward(award.award_key, { is_revealed: !isRevealed })}
                          title={isRevealed ? 'Hide from public' : 'Reveal to public'}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            isRevealed
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base">{award.title}</h3>
                      <p className="text-xs text-slate-400">{award.subtitle}</p>
                    </div>

                    {/* Winner / Current Leader Preview */}
                    <div className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Current Selection:</span>
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {isManual ? 'Manual Override' : 'Auto Statistical'}
                        </span>
                      </div>

                      {award.award_key === 'tott' ? (
                        <div className="text-xs text-emerald-300 font-bold">
                          Best 7 ({starters.filter((s) => s.player_id > 0).length} Starters +{' '}
                          {substitutes.filter((s) => s.player_id > 0).length} Subs)
                        </div>
                      ) : award.winner ? (
                        <div className="flex items-center justify-between">
                          <div className="truncate">
                            <span className="font-bold text-white text-xs block truncate" dir="auto">
                              {award.winner.name}
                            </span>
                            <span className="text-[11px] text-slate-400" dir="auto">
                              {award.winner.team_name}
                            </span>
                          </div>
                          {award.top_candidate && (
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {award.award_key === 'golden_boot' && `${award.winner.goals || 0} Goals`}
                              {award.award_key === 'best_playmaker' && `${award.winner.assists || 0} Assists`}
                              {award.award_key === 'best_gk' && `${award.winner.clean_sheets || 0} CS`}
                              {award.award_key === 'most_clean_sheets' && `${award.winner.clean_sheets || 0} CS`}
                              {award.award_key === 'most_mvps' && `${award.winner.mvps || 0} MVPs`}
                              {award.award_key === 'pot' && `${award.winner.overall_points || 0} Pts`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No leader yet</span>
                      )}
                    </div>
                  </div>

                  {/* Manual Override Dropdown */}
                  {award.award_key !== 'tott' && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-[11px] font-semibold text-slate-400">Selection Mode</label>
                        <button
                          onClick={() =>
                            handleUpdateAward(award.award_key, {
                              selection_mode: isManual ? 'auto' : 'manual',
                              winner_player_id: isManual ? null : award.winner?.id,
                            })
                          }
                          className="text-[10px] font-bold text-emerald-400 hover:underline"
                        >
                          Switch to {isManual ? 'Auto' : 'Manual'}
                        </button>
                      </div>

                      {isManual && (
                        <select
                          value={award.winner_player_id || ''}
                          onChange={(e) =>
                            handleUpdateAward(award.award_key, {
                              selection_mode: 'manual',
                              winner_player_id: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">Select winner manually...</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.team_name || 'Team'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PLAYER OF THE TOURNAMENT */}
      {activeTab === 'pot' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold uppercase mb-2">
                <Crown className="w-3.5 h-3.5" />
                <span>Golden Ball Leaderboard</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Player of the Tournament
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Automatically ranked by performance points: Goals (+{weights.goal}), Assists (+{weights.assist}), MOTM (+{weights.motm}), GK Clean Sheet (+{weights.gk_clean_sheet}), DEF Clean Sheet (+{weights.def_clean_sheet}), Cards ({weights.yellow_card}/{weights.red_card}). Minimum {minAppearances} appearances required for automatic eligibility.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const pot = getAward('pot');
                  if (pot) handleUpdateAward('pot', { is_revealed: !pot.is_revealed });
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${
                  getAward('pot')?.is_revealed
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest shadow-glow'
                }`}
              >
                {getAward('pot')?.is_revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{getAward('pot')?.is_revealed ? 'Hide POT Award' : 'Reveal POT Award'}</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
            <div className="p-4 bg-pitch-darkest/60 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Performance Ranking ({playerOfTheTournament.length} Candidates)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Min {minAppearances} Apps Required</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                    <th className="py-3 px-4 text-center w-14">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-center">Apps</th>
                    <th className="py-3 px-4 text-center">Goals</th>
                    <th className="py-3 px-4 text-center">Assists</th>
                    <th className="py-3 px-4 text-center">MVPs</th>
                    <th className="py-3 px-4 text-center">Clean Sheets</th>
                    <th className="py-3 px-4 text-center font-black text-amber-400">Total Points</th>
                    <th className="py-3 px-4 text-center">Eligible?</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {playerOfTheTournament.map((item, idx) => {
                    const isTop = idx === 0;
                    const pot = getAward('pot');
                    const isSelected = pot?.winner_player_id === item.player.id || (!pot?.winner_player_id && isTop);

                    return (
                      <tr
                        key={item.player.id}
                        className={`transition hover:bg-white/[0.04] ${
                          isSelected ? 'bg-amber-950/25 border-l-4 border-amber-400' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                          <div className="flex items-center space-x-2">
                            <span>{item.player.name}</span>
                            {item.player.is_captain && (
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded font-bold">
                                (C)
                              </span>
                            )}
                            {item.player.is_goalkeeper && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold">
                                GK
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs" dir="auto">
                          {item.player.team_name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{item.appearances}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{item.goals}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{item.assists}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{item.mvps}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{item.player.clean_sheets || 0}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-amber-400 text-sm">
                          {item.points}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.is_eligible ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-400" title={`Needs at least ${minAppearances} matches`}>
                              &lt; {minAppearances} Apps
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              handleUpdateAward('pot', {
                                selection_mode: 'manual',
                                winner_player_id: item.player.id,
                              })
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              isSelected
                                ? 'bg-amber-400 text-pitch-darkest font-black'
                                : 'bg-white/5 hover:bg-white/15 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Winner'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM OF THE TOURNAMENT (BEST 5 + 2 SUBS) */}
      {activeTab === 'tott' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold uppercase mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Best 7 Selection</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Team of the Tournament</h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Select 5 starters on the pitch (1 Goalkeeper + 4 Outfield) and 2 substitutes. Choose your formation and click any player capsule to assign a player.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLoadSuggestion}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Top Performers</span>
              </button>

              <button
                onClick={handleSaveTott}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Team of Tournament</span>
              </button>

              <button
                onClick={() => handleUpdateAward('tott', { is_revealed: !tottRevealed })}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${
                  tottRevealed
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-amber-400 hover:bg-amber-300 text-pitch-darkest shadow-glow'
                }`}
              >
                {tottRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{tottRevealed ? 'Hide TOTT' : 'Reveal TOTT'}</span>
              </button>
            </div>
          </div>

          {/* Formation selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Formation:</span>
            {['1-2-1', '2-2', '1-1-2', '2-1-1'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleFormationChange(fmt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                  formation === fmt
                    ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                    : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* 5-A-SIDE PITCH VISUALIZER */}
          <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-emerald-950/90 p-4 sm:p-6 flex flex-col justify-between">
            {/* Pitch Markings */}
            <div className="absolute inset-4 sm:inset-6 border-2 border-white/20 rounded-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-4 right-4 sm:left-6 sm:right-6 border-b border-white/20 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-48 sm:w-60 h-20 sm:h-24 border-t-2 border-l-2 border-r-2 border-white/20 rounded-t-2xl pointer-events-none" />
            <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-48 sm:w-60 h-20 sm:h-24 border-b-2 border-l-2 border-r-2 border-white/20 rounded-b-2xl pointer-events-none" />

            {/* Starters on pitch */}
            <div className="relative w-full h-full">
              {starters.map((starter) => {
                const hasPlayer = starter.player_id > 0;
                return (
                  <div
                    key={starter.slot_id}
                    onClick={() =>
                      setEditingSlot({
                        slot_id: starter.slot_id,
                        slot_type: 'starter',
                        position_label: starter.position_label,
                      })
                    }
                    style={{
                      left: `${starter.pitch_x}%`,
                      top: `${starter.pitch_y}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition transform hover:scale-105"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl border-2 transition ${
                          hasPlayer
                            ? starter.position_label === 'GK'
                              ? 'bg-blue-600 text-white border-blue-400 shadow-glow'
                              : 'bg-emerald-500 text-pitch-darkest border-emerald-300 shadow-glow'
                            : 'bg-white/10 text-white border-white/30 border-dashed animate-pulse'
                        }`}
                      >
                        {hasPlayer
                          ? starter.player_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : '+'}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-pitch-darkest bg-white/90 px-2 py-0.5 rounded-full mt-1.5 shadow-md">
                        {starter.position_label}
                      </span>
                      <span className="text-[11px] font-bold text-white max-w-[90px] sm:max-w-[120px] text-center truncate drop-shadow mt-0.5" dir="auto">
                        {starter.player_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SUBSTITUTES BENCH (EXACTLY 2 PLAYERS) */}
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-pitch-darkest/70 border border-white/10 space-y-3">
            <span className="text-xs font-bold uppercase text-slate-400 block text-center">
              Official Substitutes Bench (2 Players)
            </span>
            <div className="grid grid-cols-2 gap-4">
              {substitutes.map((sub, idx) => {
                const hasPlayer = sub.player_id > 0;
                return (
                  <div
                    key={sub.slot_id}
                    onClick={() =>
                      setEditingSlot({
                        slot_id: sub.slot_id,
                        slot_type: 'substitute',
                        position_label: sub.position_label,
                      })
                    }
                    className="p-3 rounded-xl bg-pitch-card border border-pitch-border hover:border-emerald-500/50 cursor-pointer transition flex items-center space-x-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-xs flex-shrink-0">
                      SUB {idx + 1}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white text-xs block truncate" dir="auto">
                        {hasPlayer ? sub.player_name : '+ Click to Assign'}
                      </span>
                      <span className="text-[10px] text-slate-400" dir="auto">
                        {hasPlayer ? sub.player_team_name : 'Bench Player'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOALKEEPERS & CLEAN SHEETS */}
      {activeTab === 'goalkeepers' && (
        <div className="space-y-8">
          {/* Best Goalkeeper Award */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span>Best Goalkeeper (Golden Glove) Candidates</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ranks goalkeepers by Clean Sheets, Clean Sheet %, Goals Conceded per Match, and Appearances as GK.
                </p>
              </div>

              <button
                onClick={() => {
                  const bgk = getAward('best_gk');
                  if (bgk) handleUpdateAward('best_gk', { is_revealed: !bgk.is_revealed });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  getAward('best_gk')?.is_revealed
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-blue-500 hover:bg-blue-400 text-white shadow-glow'
                }`}
              >
                {getAward('best_gk')?.is_revealed ? 'Hide Golden Glove' : 'Reveal Golden Glove'}
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                      <th className="py-3 px-4 text-center w-14">Rank</th>
                      <th className="py-3 px-4">Goalkeeper</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4 text-center">GK Apps</th>
                      <th className="py-3 px-4 text-center">Clean Sheets</th>
                      <th className="py-3 px-4 text-center">Goals Conceded</th>
                      <th className="py-3 px-4 text-center">CS %</th>
                      <th className="py-3 px-4 text-center">G.C / Match</th>
                      <th className="py-3 px-4 text-center">Tied?</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bestGoalkeepers.map((item, idx) => {
                      const bgk = getAward('best_gk');
                      const isSelected = bgk?.winner_player_id === item.player.id || (!bgk?.winner_player_id && idx === 0);

                      return (
                        <tr
                          key={item.player.id}
                          className={`transition hover:bg-white/[0.04] ${
                            isSelected ? 'bg-blue-950/25 border-l-4 border-blue-400' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                            {item.player.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs" dir="auto">
                            {item.player.team_name}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.appearances}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-300 text-xs">
                            {item.clean_sheets}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.goals_conceded}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.clean_sheet_percentage}%</td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">
                            {item.player.goals_conceded_per_match ?? '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.is_tied && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Tied
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                handleUpdateAward('best_gk', {
                                  selection_mode: 'manual',
                                  winner_player_id: item.player.id,
                                })
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-blue-500 text-white font-black'
                                  : 'bg-white/5 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Most Clean Sheets Award */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>Most Clean Sheets Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ranks the defensive wall with the most clean sheets. Supports ties confirmation.
                </p>
              </div>

              <button
                onClick={() => {
                  const mcs = getAward('most_clean_sheets');
                  if (mcs) handleUpdateAward('most_clean_sheets', { is_revealed: !mcs.is_revealed });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  getAward('most_clean_sheets')?.is_revealed
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest shadow-glow'
                }`}
              >
                {getAward('most_clean_sheets')?.is_revealed ? 'Hide Clean Sheets Award' : 'Reveal Clean Sheets Award'}
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                      <th className="py-3 px-4 text-center w-14">Rank</th>
                      <th className="py-3 px-4">Goalkeeper</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4 text-center">Clean Sheets</th>
                      <th className="py-3 px-4 text-center">GK Matches</th>
                      <th className="py-3 px-4 text-center">Clean Sheet %</th>
                      <th className="py-3 px-4 text-center">Tied?</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cleanSheetsLeaderboard.map((item, idx) => {
                      const mcs = getAward('most_clean_sheets');
                      const isSelected = mcs?.winner_player_id === item.player.id || (!mcs?.winner_player_id && idx === 0);

                      return (
                        <tr
                          key={item.player.id}
                          className={`transition hover:bg-white/[0.04] ${
                            isSelected ? 'bg-emerald-950/25 border-l-4 border-emerald-400' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                            {item.player.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs" dir="auto">
                            {item.player.team_name}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-300 text-sm">
                            {item.clean_sheets}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.matches_as_gk}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">{item.clean_sheet_percentage}%</td>
                          <td className="py-3.5 px-4 text-center">
                            {item.is_tied && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Tied
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                handleUpdateAward('most_clean_sheets', {
                                  selection_mode: 'manual',
                                  winner_player_id: item.player.id,
                                })
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-emerald-500 text-pitch-darkest font-black'
                                  : 'bg-white/5 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SCORING FORMULA & WEIGHTS */}
      {activeTab === 'weights' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/70 space-y-2">
            <h2 className="text-xl font-black text-white uppercase flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Scoring Weights & POT Eligibility</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize how many points each match action awards toward the Player of the Tournament rankings.
            </p>
          </div>

          <form onSubmit={handleSaveWeights} className="glass-panel rounded-2xl p-6 border border-pitch-border bg-pitch-card/80 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Goal Scored</label>
                <input
                  type="number"
                  value={weights.goal}
                  onChange={(e) => setWeights({ ...weights, goal: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Assist</label>
                <input
                  type="number"
                  value={weights.assist}
                  onChange={(e) => setWeights({ ...weights, assist: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Man of the Match (MOTM)</label>
                <input
                  type="number"
                  value={weights.motm}
                  onChange={(e) => setWeights({ ...weights, motm: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Goalkeeper Clean Sheet</label>
                <input
                  type="number"
                  value={weights.gk_clean_sheet}
                  onChange={(e) => setWeights({ ...weights, gk_clean_sheet: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Defender Clean Sheet Contribution</label>
                <input
                  type="number"
                  value={weights.def_clean_sheet}
                  onChange={(e) => setWeights({ ...weights, def_clean_sheet: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Yellow Card Penalty</label>
                <input
                  type="number"
                  value={weights.yellow_card}
                  onChange={(e) => setWeights({ ...weights, yellow_card: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Red Card Penalty</label>
                <input
                  type="number"
                  value={weights.red_card}
                  onChange={(e) => setWeights({ ...weights, red_card: parseInt(e.target.value) || 0 })}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Min Appearances for POT</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={minAppearances}
                  onChange={(e) => setMinAppearances(parseInt(e.target.value) || 3)}
                  className="w-full bg-pitch-darkest border border-pitch-border rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Formula Weights'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SLOT ASSIGNMENT MODAL (FOR TEAM OF THE TOURNAMENT) */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex min-h-full items-start justify-center">
          <div
            className="w-full max-w-lg bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 shadow-2xl my-6 sm:my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Assign Slot: {editingSlot.position_label} ({editingSlot.slot_type})
                </h3>
                <p className="text-xs text-slate-400">
                  Select any registered tournament player for this position.
                </p>
              </div>
              <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {players.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPlayerForSlot(p)}
                  className="p-3 rounded-xl bg-pitch-card border border-pitch-border hover:border-emerald-500/50 cursor-pointer transition flex items-center justify-between gap-3"
                >
                  <div className="truncate">
                    <span className="font-bold text-white text-xs block truncate" dir="auto">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-slate-400" dir="auto">
                      {p.team_name} • {p.is_goalkeeper ? '🧤 Goalkeeper' : 'Player'}
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0 text-xs font-mono">
                    <span className="font-bold text-emerald-400 block">{p.overall_points || 0} Pts</span>
                    <span className="text-[10px] text-slate-500">
                      {p.goals || 0}G • {p.assists || 0}A • {p.mvps || 0}MVP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
