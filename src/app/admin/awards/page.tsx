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
  UserCheck,
} from 'lucide-react';
import { Player, Team, TeamOfTournamentData, TeamOfTournamentPlayer } from '@/lib/types';
import { getFormationSlots } from '@/lib/calculations';

export default function AdminAwardsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'pot' | 'tott'>('pot');

  // Server state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerOfTheTournament, setPlayerOfTheTournament] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, TeamOfTournamentData>>({});

  // Player of the Tournament admin state
  const [potMode, setPotMode] = useState<'auto' | 'manual'>('auto');
  const [potPlayerId, setPotPlayerId] = useState<number | null>(null);
  const [potLocked, setPotLocked] = useState(false);
  const [potRevealed, setPotRevealed] = useState(false);

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

  const fetchAwardsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/awards');
      if (!res.ok) throw new Error('Failed to load awards data');
      const data = await res.json();

      setPlayers(data.players || []);
      setTeams(data.teams || []);
      setPlayerOfTheTournament(data.player_of_tournament || []);
      setSuggestions(data.suggestions || {});

      const awards = data.awards || {};
      setPotMode(awards.pot_mode || 'auto');
      setPotLocked(Boolean(awards.pot_locked));
      setPotRevealed(Boolean(awards.pot_revealed));
      setPotPlayerId(awards.pot_winner ? awards.pot_winner.id : null);

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

  // When changing formation, rearrange starters according to new slots
  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    const newSlots = getFormationSlots(newFormation);

    // Keep existing selected players if possible, mapped into new coordinates
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

  // Load recommended lineup from suggestions
  const handleLoadSuggestion = () => {
    const sugg = suggestions[formation] || suggestions['1-2-1'];
    if (!sugg) return;
    setStarters(sugg.starters);
    setSubstitutes(sugg.substitutes);
    setFeedback({ type: 'success', message: `Loaded top performers for formation ${formation}!` });
  };

  // Assign player to slot
  const handleSelectPlayerForSlot = (selectedPlayer: Player) => {
    if (!editingSlot) return;

    // Check duplicate selection
    const allAssignedIds = [
      ...starters.map((s) => s.player_id),
      ...substitutes.map((s) => s.player_id),
    ].filter((id) => id > 0);

    if (allAssignedIds.includes(selectedPlayer.id)) {
      alert(`${selectedPlayer.name} is already assigned to a position. Please select a different player.`);
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

  // Save awards settings
  const handleSaveAwards = async (explicitChanges: any = {}) => {
    setSaving(true);
    setFeedback(null);

    const payload = {
      pot_mode: potMode,
      pot_player_id: potMode === 'manual' ? potPlayerId : null,
      pot_locked: potLocked,
      pot_revealed: potRevealed,
      tott_revealed: tottRevealed,
      tott_data: {
        formation,
        starters,
        substitutes,
      },
      ...explicitChanges,
    };

    try {
      const res = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save awards');

      setFeedback({ type: 'success', message: 'Tournament awards configuration saved successfully!' });
      fetchAwardsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating awards' });
    } finally {
      setSaving(false);
    }
  };

  // Reveal / Hide Player of the Tournament toggle
  const handleToggleRevealPOT = () => {
    const nextState = !potRevealed;
    if (nextState) {
      const confirmReveal = window.confirm(
        'Are you sure you want to officially REVEAL the Player of the Tournament to all public visitors? This will appear on the public awards ceremony page.'
      );
      if (!confirmReveal) return;
    }
    setPotRevealed(nextState);
    handleSaveAwards({ pot_revealed: nextState });
  };

  // Reveal / Hide Team of the Tournament toggle
  const handleToggleRevealTOTT = () => {
    // Validate that 5 starters and 2 subs are assigned
    const validStarters = starters.filter((s) => s.player_id > 0);
    const validSubs = substitutes.filter((s) => s.player_id > 0);

    if (!tottRevealed && (validStarters.length < 5 || validSubs.length < 2)) {
      alert('Please select all 5 starting players and 2 substitutes before revealing the Team of the Tournament.');
      return;
    }

    const nextState = !tottRevealed;
    if (nextState) {
      const confirmReveal = window.confirm(
        'Are you sure you want to officially REVEAL the Team of the Tournament (Best 7) to all public visitors?'
      );
      if (!confirmReveal) return;
    }
    setTottRevealed(nextState);
    handleSaveAwards({ tott_revealed: nextState });
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
        <p className="font-semibold text-sm">Loading tournament awards hub...</p>
      </div>
    );
  }

  // Current automatic leader
  const currentAutoLeader = playerOfTheTournament.length > 0 ? playerOfTheTournament[0].player : null;
  const currentSelectedWinner =
    potMode === 'manual'
      ? players.find((p) => p.id === potPlayerId) || null
      : currentAutoLeader;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Official End-of-Tournament Ceremony
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mt-1 flex items-center space-x-2.5">
            <span>Tournament Awards Hub</span>
            <Trophy className="w-7 h-7 text-amber-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Private administrator portal to monitor rankings, select Player of the Tournament, construct the Best 7, and officially reveal honors.
          </p>
        </div>

        <Link
          href="/awards"
          target="_blank"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-pitch-card hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 self-start sm:self-auto transition"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>View Public Ceremony Page ↗</span>
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2.5 ${
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

      {/* TABS: POT vs TEAM OF THE TOURNAMENT */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-pitch-card border border-pitch-border shadow-lg">
          <button
            onClick={() => setActiveTab('pot')}
            className={`flex items-center space-x-2 px-5 sm:px-8 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition ${
              activeTab === 'pot'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-pitch-darkest shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>👑 Player of the Tournament</span>
          </button>
          <button
            onClick={() => setActiveTab('tott')}
            className={`flex items-center space-x-2 px-5 sm:px-8 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition ${
              activeTab === 'tott'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-pitch-darkest shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>⭐ Team of Tournament (Best 7)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PLAYER OF THE TOURNAMENT */}
      {activeTab === 'pot' && (
        <div className="space-y-6">
          {/* Status & Reveal Control Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-pitch-card to-pitch-darkest space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Public Status:</span>
                  {potRevealed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                      <Eye className="w-3 h-3 text-emerald-400" />
                      <span>🌐 Officially Revealed (Public)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>🔒 Secret (Admin Only - Hidden from Public)</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  {potRevealed
                    ? 'The award is currently published on the public awards page. Visitors can see the Golden Ball certificate and tournament stats.'
                    : 'The candidate leaderboard and winner selection are strictly confidential. Visitors only see the locked ceremony announcement until you click Reveal.'}
                </p>
              </div>

              {/* Reveal Action Button */}
              <button
                type="button"
                onClick={handleToggleRevealPOT}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center space-x-2 self-start sm:self-auto ${
                  potRevealed
                    ? 'bg-white/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-pitch-darkest shadow-glow'
                }`}
              >
                {potRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Hide Award from Public</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>🏆 Reveal Award to Public</span>
                  </>
                )}
              </button>
            </div>

            {/* Winner Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Winner Spotlight Card */}
              <div className="p-5 rounded-2xl bg-pitch-darkest/90 border border-amber-500/30 flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-3xl shadow-glow text-pitch-darkest flex-shrink-0">
                  👑
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    {potMode === 'auto' ? 'Automatic Selected Winner (#1)' : 'Manual Admin Selected Winner'}
                  </span>
                  <h3 className="text-xl font-black text-white truncate" dir="auto">
                    {currentSelectedWinner ? currentSelectedWinner.name : 'No winner chosen'}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span dir="auto">{currentSelectedWinner?.team_name || 'Team'}</span>
                    <span className="text-amber-400 font-mono font-bold">
                      • {currentSelectedWinner?.overall_points || 0} POT Points
                    </span>
                  </div>
                </div>
              </div>

              {/* Selection Mode Controls */}
              <div className="space-y-3 p-4 rounded-2xl bg-pitch-card border border-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase">Selection Mode:</span>
                  <div className="inline-flex p-1 rounded-xl bg-pitch-darkest border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPotMode('auto')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        potMode === 'auto' ? 'bg-amber-400 text-pitch-darkest' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ Auto (#1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPotMode('manual')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        potMode === 'manual' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔒 Manual
                    </button>
                  </div>
                </div>

                {potMode === 'manual' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Choose Winner (Any Registered Player):
                    </label>
                    <select
                      value={potPlayerId || ''}
                      onChange={(e) => setPotPlayerId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-pitch-darkest border border-amber-500/40 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Choose Winner --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.team_name}) - {p.overall_points || 0} pts
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setPotLocked(!potLocked)}
                    className="flex items-center space-x-1.5 text-slate-400 hover:text-white font-semibold"
                  >
                    {potLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{potLocked ? 'Selection Locked' : 'Selection Unlocked'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveAwards()}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-black uppercase tracking-wider transition shadow-sm flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Winner'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* INTERNAL CANDIDATE LEADERBOARD */}
          <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Candidate Leaderboard (Confidential Admin View)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Calculated automatically from Goals(×5) + Assists(×3) + MVPs(×10) + Apps(×2) − Cards
                  </span>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-mono">
                {playerOfTheTournament.length} Ranked Contenders
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                    <th className="py-3 px-3 text-center w-14">Rank</th>
                    <th className="py-3 px-4">Player Name</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-3 text-center">Apps</th>
                    <th className="py-3 px-3 text-center">Goals</th>
                    <th className="py-3 px-3 text-center">Assists</th>
                    <th className="py-3 px-3 text-center">MVPs</th>
                    <th className="py-3 px-4 text-center font-black text-amber-400">Performance Points</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {playerOfTheTournament.map((item, index) => {
                    const isSelected =
                      (potMode === 'manual' && potPlayerId === item.player.id) ||
                      (potMode === 'auto' && index === 0);

                    return (
                      <tr
                        key={item.player.id}
                        className={`transition hover:bg-white/[0.04] ${
                          isSelected ? 'bg-amber-500/15 border-l-2 border-amber-400' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-bold">
                          {index === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50 text-xs font-black">
                              1
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">{item.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white" dir="auto">
                          <div className="flex items-center space-x-2">
                            <span className="hover:text-amber-400 transition">{item.player.name}</span>
                            {item.player.is_captain && (
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-bold">
                                (C)
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] bg-amber-400 text-pitch-darkest px-2 py-0.2 rounded font-black uppercase">
                                Winner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs" dir="auto">
                          {item.player.team_name}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-white">
                          {item.appearances || item.player.matches_played || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-white">
                          {item.goals}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-white">
                          {item.assists}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                          {item.mvps} ⭐
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-amber-400">
                          {item.points} pts
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPotMode('manual');
                              setPotPlayerId(item.player.id);
                              handleSaveAwards({ pot_mode: 'manual', pot_player_id: item.player.id });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-pitch-darkest hover:bg-amber-400 hover:text-pitch-darkest border border-white/10 text-[11px] font-bold text-slate-300 transition"
                          >
                            Pick Winner
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

      {/* SECTION 2: TEAM OF THE TOURNAMENT (5 STARTERS + 2 SUBS = 7 PLAYERS) */}
      {activeTab === 'tott' && (
        <div className="space-y-6">
          {/* Status & Formation Header */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-pitch-card to-pitch-darkest space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Public Status:</span>
                  {tottRevealed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                      <Eye className="w-3 h-3 text-emerald-400" />
                      <span>🌐 Officially Revealed (Public)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>🔒 Secret (Admin Only - Hidden from Public)</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Official tournament format: <strong>5 Starting on Pitch + 2 Substitutes on Bench = 7 Players Total.</strong>
                </p>
              </div>

              <div className="flex items-center space-x-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleLoadSuggestion}
                  className="px-4 py-2.5 rounded-xl bg-pitch-card hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition flex items-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Pick Best 7</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleRevealTOTT}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center space-x-2 ${
                    tottRevealed
                      ? 'bg-white/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest shadow-glow'
                  }`}
                >
                  {tottRevealed ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Hide Lineup</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      <span>⭐ Reveal Team of Tournament</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Formation Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase text-slate-300">5-a-side Formation:</span>
                {['1-2-1', '2-2', '1-1-2', '2-1-1'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleFormationChange(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      formation === f
                        ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                        : 'bg-pitch-darkest text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAwards()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider transition flex items-center space-x-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Lineup...' : 'Save Lineup Selection'}</span>
              </button>
            </div>
          </div>

          {/* VISUAL 5-A-SIDE PITCH EDITOR */}
          <div className="glass-panel rounded-3xl p-4 sm:p-8 border border-pitch-border bg-pitch-card/90 space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tactical Board</span>
              <h3 className="text-xl font-black text-white">Starting 5 ({formation})</h3>
              <p className="text-xs text-slate-400">Click any position slot to assign or swap a tournament player.</p>
            </div>

            {/* Pitch Container */}
            <div className="relative w-full max-w-xl mx-auto aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden border-4 border-emerald-500/50 shadow-2xl bg-gradient-to-b from-emerald-950/70 via-emerald-900/50 to-emerald-950/80">
              {/* Pitch Markings */}
              {/* Half-way line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2" />
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 w-28 h-28 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
              {/* Center Spot */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
              {/* Top Goal Box (Opponent) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 border-b border-x border-white/20 rounded-b-xl" />
              {/* Bottom Goal Box (GK Area) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-x border-white/25 rounded-t-xl" />
              {/* Penalty Spot Bottom */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/40 rounded-full" />

              {/* 5 Starter Player Cards on Pitch */}
              {starters.map((slot) => {
                const isAssigned = slot.player_id > 0;

                return (
                  <div
                    key={slot.slot_id}
                    onClick={() =>
                      setEditingSlot({
                        slot_id: slot.slot_id,
                        slot_type: 'starter',
                        position_label: slot.position_label,
                      })
                    }
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition hover:scale-105 z-10"
                    style={{ left: `${slot.pitch_x}%`, top: `${slot.pitch_y}%` }}
                  >
                    <div
                      className={`w-24 sm:w-28 p-2 rounded-2xl border text-center shadow-xl backdrop-blur-md transition ${
                        isAssigned
                          ? 'bg-pitch-darkest/90 border-emerald-400/80 text-white shadow-glow'
                          : 'bg-pitch-darkest/60 border-dashed border-white/30 text-slate-400 hover:border-emerald-400'
                      }`}
                    >
                      {/* Position Tag */}
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500 text-pitch-darkest">
                        {slot.position_label}
                      </span>

                      {/* Player Initials Avatar */}
                      <div className="w-10 h-10 mx-auto my-1 rounded-full bg-pitch-card border border-white/20 flex items-center justify-center font-black text-xs text-white">
                        {isAssigned
                          ? slot.player_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : '+'}
                      </div>

                      {/* Player Name */}
                      <div className="text-[11px] font-bold truncate leading-tight" dir="auto">
                        {isAssigned ? slot.player_name : 'Assign'}
                      </div>

                      {/* Team / Stats */}
                      {isAssigned && (
                        <div className="text-[9px] text-slate-300 font-mono mt-0.5 truncate">
                          {slot.goals > 0 && `${slot.goals}G `}
                          {slot.assists > 0 && `${slot.assists}A `}
                          {slot.mvps > 0 && `${slot.mvps}⭐ `}
                          {slot.goals === 0 && slot.assists === 0 && slot.mvps === 0 && slot.player_team_name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUBSTITUTES BENCH (2 PLAYERS) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-pitch-darkest/90 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Substitutes Bench (Exactly 2 Players)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {substitutes.filter((s) => s.player_id > 0).length} / 2 Assigned
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {substitutes.map((slot) => {
                  const isAssigned = slot.player_id > 0;

                  return (
                    <div
                      key={slot.slot_id}
                      onClick={() =>
                        setEditingSlot({
                          slot_id: slot.slot_id,
                          slot_type: 'substitute',
                          position_label: slot.position_label,
                        })
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition hover:border-emerald-400 ${
                        isAssigned
                          ? 'bg-pitch-card border-white/10 text-white'
                          : 'bg-pitch-darkest border-dashed border-white/20 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 flex-shrink-0">
                          {slot.position_label}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold truncate block" dir="auto">
                            {isAssigned ? slot.player_name : '+ Click to Assign Substitute'}
                          </span>
                          {isAssigned && (
                            <span className="text-[10px] text-slate-400 truncate block" dir="auto">
                              {slot.player_team_name} • {slot.goals}G {slot.assists}A {slot.mvps}⭐
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-emerald-400 font-bold ml-2">Edit</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLOT ASSIGNMENT MODAL (Select Player) */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex min-h-full items-start justify-center">
          <div
            className="w-full max-w-lg bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Select Player for {editingSlot.position_label}
                </span>
                <h3 className="text-base font-black text-white">
                  Assign to {editingSlot.slot_type === 'starter' ? 'Starting 5' : 'Bench'}
                </h3>
              </div>
              <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pick any registered tournament player. Players are sorted by performance points.
            </p>

            {/* Players List */}
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {players.map((p) => {
                const allAssignedIds = [
                  ...starters.map((s) => s.player_id),
                  ...substitutes.map((s) => s.player_id),
                ].filter((id) => id > 0);
                const isAlreadySelected = allAssignedIds.includes(p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => !isAlreadySelected && handleSelectPlayerForSlot(p)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      isAlreadySelected
                        ? 'bg-pitch-darkest/40 border-white/5 opacity-40 cursor-not-allowed'
                        : 'bg-pitch-card hover:bg-emerald-500/15 border-white/10 hover:border-emerald-500/40 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-xs" dir="auto">
                          {p.name}
                        </span>
                        {p.is_captain && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded font-bold">
                            (C)
                          </span>
                        )}
                        {isAlreadySelected && (
                          <span className="text-[9px] bg-white/10 text-slate-400 px-1.5 rounded font-medium">
                            Assigned
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block" dir="auto">
                        {p.team_name}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {p.overall_points || 0} pts
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        {p.goals || 0}G • {p.assists || 0}A • {p.mvps || 0}⭐
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20 transition"
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
