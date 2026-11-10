'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Team, Player, GroupId, TournamentData } from '@/lib/types';
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Users,
} from 'lucide-react';

type Feedback = { type: 'success' | 'error'; message: string } | null;

type PlayerFormValues = {
  name: string;
  nameAr: string;
  squadNumber: string;
  isCaptain: boolean;
  isGoalkeeper: boolean;
};

const EMPTY_PLAYER_FORM: PlayerFormValues = {
  name: '',
  nameAr: '',
  squadNumber: '',
  isCaptain: false,
  isGoalkeeper: false,
};

// 16px text on phones stops iOS from zooming the page when an input is focused.
const inputClass =
  'w-full bg-pitch-card border border-pitch-border rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold';

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const ok = feedback.type === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
        ok
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/15 border-red-500/30 text-red-300'
      }`}
    >
      {ok ? (
        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      <span dir="auto">{feedback.message}</span>
    </div>
  );
}

function PlayerForm({
  title,
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: PlayerFormValues;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: PlayerFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PlayerFormValues>(initial);
  const set = (patch: Partial<PlayerFormValues>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="p-3 sm:p-4 rounded-2xl bg-pitch-card/60 border border-emerald-500/40 space-y-3"
    >
      <h5 className="text-xs font-black uppercase tracking-wider text-emerald-300">{title}</h5>

      <div>
        <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Player Name *</label>
        <input
          type="text"
          required
          autoFocus
          dir="auto"
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Hadjar Ayoub or حجار ايوب"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Arabic Name (Optional)</label>
          <input
            type="text"
            dir="rtl"
            value={values.nameAr}
            onChange={(e) => set({ nameAr: e.target.value })}
            placeholder="الاسم بالعربية"
            className={`${inputClass} font-ar text-right`}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Squad No.</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={values.squadNumber}
            onChange={(e) => set({ squadNumber: e.target.value })}
            placeholder="#"
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center space-x-3 px-3 min-h-[44px] rounded-xl bg-pitch-darkest border border-pitch-border cursor-pointer">
          <input
            type="checkbox"
            checked={values.isCaptain}
            onChange={(e) => set({ isCaptain: e.target.checked })}
            className="w-5 h-5 rounded accent-amber-400"
          />
          <span className="text-xs font-bold text-white">👑 Team Captain (C)</span>
        </label>
        <label className="flex items-center space-x-3 px-3 min-h-[44px] rounded-xl bg-pitch-darkest border border-pitch-border cursor-pointer">
          <input
            type="checkbox"
            checked={values.isGoalkeeper}
            onChange={(e) => set({ isGoalkeeper: e.target.checked })}
            className="w-5 h-5 rounded accent-blue-400"
          />
          <span className="text-xs font-bold text-white">🧤 Goalkeeper (GK)</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-pitch-darkest font-black text-xs uppercase tracking-wider transition"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

  // Team form inputs
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [groupId, setGroupId] = useState<GroupId>('A');
  const [color, setColor] = useState('#10B981');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Roster states
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterFeedback, setRosterFeedback] = useState<Feedback>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tournament', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load teams');
      const data: TournamentData = await res.json();
      setTeams(data.teams || []);
      setPlayers(data.players || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Always read the team being edited from fresh data so the roster view
  // reflects every add / edit / remove immediately.
  const editingTeam = editingTeamId !== null ? teams.find((t) => t.id === editingTeamId) || null : null;
  const teamPlayers = editingTeam
    ? players
        .filter((p) => p.team_id === editingTeam.id)
        .sort((a, b) => (a.squad_number ?? 999) - (b.squad_number ?? 999) || a.id - b.id)
    : [];

  const resetRosterUi = () => {
    setAddingPlayer(false);
    setEditingPlayerId(null);
    setRosterFeedback(null);
  };

  const openCreateModal = () => {
    setEditingTeamId(null);
    setName('');
    setNameAr('');
    setGroupId('A');
    setColor('#10B981');
    setFeedback(null);
    resetRosterUi();
    setModalOpen(true);
  };

  const openEditModal = (t: Team) => {
    setEditingTeamId(t.id);
    setName(t.name);
    setNameAr(t.name_ar || '');
    setGroupId(t.group_id);
    setColor(t.color || '#3B82F6');
    setFeedback(null);
    resetRosterUi();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetRosterUi();
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const isEdit = editingTeamId !== null;
      // Captain and goalkeeper are managed from the roster below, so they are
      // deliberately not sent here (the API leaves them untouched).
      const res = await fetch('/api/admin/teams', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTeamId ?? undefined,
          name: name.trim(),
          name_ar: nameAr.trim() || null,
          group_id: groupId,
          color,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save team');

      await fetchData();
      if (isEdit) {
        setFeedback({ type: 'success', message: 'Team details saved.' });
      } else {
        // Stay in the modal on the new team so its roster can be filled right away.
        setEditingTeamId(Number(resData.team_id));
        setFeedback({ type: 'success', message: 'Team created. Add its players below.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This will delete all its rostered players and match ties.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/teams?id=${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete team.');
      }
    } catch (err) {
      alert('Error deleting team.');
    }
  };

  const savePlayer = async (values: PlayerFormValues, playerId?: number) => {
    if (!editingTeam) return;
    setRosterBusy(true);
    setRosterFeedback(null);

    try {
      const res = await fetch('/api/admin/players', {
        method: playerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: playerId,
          name: values.name.trim(),
          name_ar: values.nameAr.trim() || null,
          team_id: editingTeam.id,
          squad_number: values.squadNumber ? parseInt(values.squadNumber, 10) : null,
          is_captain: values.isCaptain,
          is_goalkeeper: values.isGoalkeeper,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save player');

      await fetchData();
      setAddingPlayer(false);
      setEditingPlayerId(null);
      setRosterFeedback({
        type: 'success',
        message: playerId ? `"${values.name.trim()}" updated.` : `"${values.name.trim()}" added to ${editingTeam.name}.`,
      });
    } catch (err: any) {
      setRosterFeedback({ type: 'error', message: err.message || 'Failed to save player' });
    } finally {
      setRosterBusy(false);
    }
  };

  const removePlayer = async (p: Player) => {
    if (!editingTeam) return;

    const recorded = (p.goals || 0) + (p.assists || 0) + (p.yellow_cards || 0) + (p.red_cards || 0) + (p.mvps || 0);
    if (recorded > 0) {
      // Removing would erase recorded goals/assists/cards, so it is not offered.
      setRosterFeedback({
        type: 'error',
        message: `"${p.name}" has match records (${p.goals || 0} goals, ${p.assists || 0} assists, ${
          (p.yellow_cards || 0) + (p.red_cards || 0)
        } cards, ${p.mvps || 0} MVPs) and cannot be removed. Use Edit to rename or replace the player instead.`,
      });
      return;
    }

    if (!confirm(`Remove "${p.name}" from ${editingTeam.name}? This cannot be undone.`)) return;

    setRosterBusy(true);
    setRosterFeedback(null);
    try {
      const res = await fetch(`/api/admin/players?id=${p.id}`, { method: 'DELETE' });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.error || 'Failed to remove player');

      await fetchData();
      if (editingPlayerId === p.id) setEditingPlayerId(null);
      setRosterFeedback({ type: 'success', message: `"${p.name}" removed from ${editingTeam.name}.` });
    } catch (err: any) {
      setRosterFeedback({ type: 'error', message: err.message || 'Failed to remove player' });
    } finally {
      setRosterBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Rosters & Goalkeepers</span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Team Management</h1>
          <p className="text-sm text-slate-400">
            Create and edit clubs, manage each team's player roster, and designate captains and goalkeepers.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Team</span>
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading teams…</p>}
      {loadError && <FeedbackBanner feedback={{ type: 'error', message: loadError }} />}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((t) => (
          <div
            key={t.id}
            className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 p-5 space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
                  Group {t.group_id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {t.players?.length || 0} / 7 Players
                </span>
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                  style={{ backgroundColor: t.color || '#3B82F6' }}
                >
                  <Shield className="w-5 h-5 opacity-90" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-white truncate" dir="auto">
                    {t.name}
                  </h3>
                  {t.name_ar && t.name_ar !== t.name && (
                    <p className="text-xs text-slate-400 font-ar truncate" dir="auto">
                      {t.name_ar}
                    </p>
                  )}
                </div>
              </div>

              {/* Roster Badges: Captain & Designated Goalkeeper */}
              <div className="space-y-1.5 py-2 border-t border-white/5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 flex-shrink-0">👑 Captain:</span>
                  <span className="font-semibold text-white truncate" dir="auto">
                    {t.captain_name || <span className="text-slate-500 italic">Unassigned</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-400 flex-shrink-0">🧤 Goalkeeper:</span>
                  {t.goalkeeper_name ? (
                    <span
                      className="bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-200 truncate"
                      dir="auto"
                    >
                      {t.goalkeeper_name}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Not Designated</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
              <button
                onClick={() => openEditModal(t)}
                className="flex-1 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Manage Team & Roster</span>
              </button>
              <button
                onClick={() => handleDeleteTeam(t.id, t.name)}
                className="w-11 h-11 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition flex items-center justify-center flex-shrink-0"
                title="Delete Team"
                aria-label={`Delete team ${t.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TEAM EDIT / CREATE MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-md"
          onClick={closeModal}
        >
          <div className="flex min-h-full items-start sm:items-center justify-center p-2 sm:p-6">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xl bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-6 shadow-2xl my-2 sm:my-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white break-words" dir="auto">
                    {editingTeam ? `Manage Club: ${editingTeam.name}` : 'Create New Team'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingTeam
                      ? 'Edit club details and manage the player roster.'
                      : 'Enter new club specifications. You can add players right after saving.'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  aria-label="Close"
                  className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TEAM DETAILS */}
              <form onSubmit={handleSaveTeam} className="space-y-4">
                <FeedbackBanner feedback={feedback} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Team Name (Standard)</label>
                    <input
                      type="text"
                      required
                      dir="auto"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. OSPF or Spider-Feet"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Team Name (Arabic - Optional)
                    </label>
                    <input
                      type="text"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder="e.g. فريق الرجال or زورو"
                      dir="rtl"
                      className={`${inputClass} font-ar text-right`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Group Allocation</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value as GroupId)}
                      className={inputClass}
                    >
                      <option value="A">Group A (Green)</option>
                      <option value="B">Group B (Blue)</option>
                      <option value="C">Group C (Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Club Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        aria-label="Pick club color"
                        className="w-11 h-11 rounded-lg bg-transparent border-0 cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        aria-label="Club color hex value"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition"
                  >
                    {saving ? 'Saving...' : editingTeam ? 'Save Team Details' : 'Create Team'}
                  </button>
                </div>
              </form>

              {/* TEAM ROSTER */}
              {editingTeam && (
                <section className="space-y-3 pt-5 border-t border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">Team Roster</h4>
                      <p className="text-[11px] text-slate-400">
                        {teamPlayers.length} / 7 players · changes are saved immediately
                      </p>
                    </div>
                  </div>

                  <FeedbackBanner feedback={rosterFeedback} />

                  {teamPlayers.length === 0 && !addingPlayer && (
                    <p className="text-xs text-slate-500 italic py-3 text-center">
                      No players on this team yet.
                    </p>
                  )}

                  <ul className="space-y-2">
                    {teamPlayers.map((p) =>
                      editingPlayerId === p.id ? (
                        <li key={p.id}>
                          <PlayerForm
                            title="Edit Player"
                            initial={{
                              name: p.name,
                              nameAr: p.name_ar || '',
                              squadNumber: p.squad_number ? String(p.squad_number) : '',
                              isCaptain: Boolean(p.is_captain),
                              isGoalkeeper: Boolean(p.is_goalkeeper),
                            }}
                            saving={rosterBusy}
                            submitLabel="Save Player"
                            onSubmit={(values) => savePlayer(values, p.id)}
                            onCancel={() => setEditingPlayerId(null)}
                          />
                        </li>
                      ) : (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 p-2 pl-3 rounded-xl bg-pitch-card/70 border border-pitch-border"
                        >
                          <span className="w-7 text-center font-mono text-xs text-slate-400 flex-shrink-0">
                            {p.squad_number ? `#${p.squad_number}` : '–'}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold text-sm text-white break-words min-w-0" dir="auto">
                                {p.name}
                              </span>
                              {p.is_captain && (
                                <span
                                  className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded font-black"
                                  title="Captain"
                                >
                                  (C)
                                </span>
                              )}
                              {p.is_goalkeeper && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                                  🧤 GK
                                </span>
                              )}
                            </div>
                            {p.name_ar && p.name_ar !== p.name && (
                              <p className="text-xs text-slate-400 font-ar" dir="auto">
                                {p.name_ar}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={rosterBusy}
                            onClick={() => {
                              setAddingPlayer(false);
                              setRosterFeedback(null);
                              setEditingPlayerId(p.id);
                            }}
                            className="h-11 px-3 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={rosterBusy}
                            onClick={() => removePlayer(p)}
                            className="w-11 h-11 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                            title="Remove player from team"
                            aria-label={`Remove ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      )
                    )}
                  </ul>

                  {addingPlayer ? (
                    <PlayerForm
                      title={`Add Player to ${editingTeam.name}`}
                      initial={EMPTY_PLAYER_FORM}
                      saving={rosterBusy}
                      submitLabel="Add Player"
                      onSubmit={(values) => savePlayer(values)}
                      onCancel={() => setAddingPlayer(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlayerId(null);
                        setRosterFeedback(null);
                        setAddingPlayer(true);
                      }}
                      className="w-full min-h-[48px] rounded-xl border border-dashed border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Player to Team</span>
                    </button>
                  )}
                </section>
              )}

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
