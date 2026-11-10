'use client';

import React, { useState, useEffect } from 'react';
import { Player, Team } from '@/lib/types';
import { UserPlus, Edit2, Trash2, Shield, Search, Star, Plus, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [teamId, setTeamId] = useState<number>(0);
  const [isCaptain, setIsCaptain] = useState(false);
  const [squadNumber, setSquadNumber] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players || []);
        setTeams(data.teams || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = (defaultTeamId?: number) => {
    setEditingPlayer(null);
    setName('');
    setNameAr('');
    setTeamId(defaultTeamId || (teams.length > 0 ? teams[0].id : 0));
    setIsCaptain(false);
    setSquadNumber('');
    setModalOpen(true);
    setFeedback(null);
  };

  const openEditModal = (p: Player) => {
    setEditingPlayer(p);
    setName(p.name);
    setNameAr(p.name_ar || '');
    setTeamId(p.team_id);
    setIsCaptain(Boolean(p.is_captain));
    setSquadNumber(p.squad_number ? p.squad_number.toString() : '');
    setModalOpen(true);
    setFeedback(null);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const isEdit = Boolean(editingPlayer);
      const url = '/api/admin/players';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        id: editingPlayer?.id,
        name,
        name_ar: nameAr || null,
        team_id: teamId,
        is_captain: isCaptain,
        squad_number: squadNumber ? parseInt(squadNumber) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save player');

      setFeedback({ type: 'success', message: `Player successfully ${isEdit ? 'updated' : 'added'}!` });
      fetchData();
      setTimeout(() => setModalOpen(false), 900);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    if (!confirm(`Are you sure you want to delete player "${playerName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/players?id=${playerId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete player');
      }
    } catch {
      alert('Error deleting player');
    }
  };

  const filteredPlayers = players.filter((p) => {
    if (selectedTeamFilter !== 'all' && p.team_id.toString() !== selectedTeamFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchAr = p.name_ar ? p.name_ar.includes(q) : false;
      const matchTeam = (p.team_name || '').toLowerCase().includes(q);
      if (!matchName && !matchAr && !matchTeam) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Player Registry</span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Player Management</h1>
          <p className="text-sm text-slate-400">
            Register new players, assign squad numbers, edit captains, or complete Barca's pending roster.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Player</span>
        </button>
      </div>

      {/* Barca Special Notice Banner if Barca has fewer than 7 players */}
      {(() => {
        const barca = teams.find((t) => t.name === 'Barca');
        const barcaPlayers = players.filter((p) => barca && p.team_id === barca.id);
        if (barca && barcaPlayers.length < 7) {
          return (
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Barca Roster Pending Confirmation</h4>
                  <p className="text-xs text-slate-300">
                    Barca currently has {barcaPlayers.length} player(s) registered (Captain: Hocine (agent)). You can complete the 7-player roster here anytime.
                  </p>
                </div>
              </div>
              <button
                onClick={() => openAddModal(barca.id)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-pitch-darkest font-bold text-xs uppercase tracking-wider transition whitespace-nowrap"
              >
                + Add Player to Barca
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-pitch-border flex flex-wrap items-center justify-between gap-4">
        {/* Team filter dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Filter Team:</span>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-pitch-darkest border border-pitch-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">All Teams ({players.length} Players)</option>
            {teams.map((t) => (
              <option dir="auto" key={t.id} value={t.id}>
                {t.name} (Poule {t.group_id})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search player name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-pitch-darkest border border-pitch-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Player Name</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">Captain?</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.map((p, idx) => (
                <tr key={p.id} className="transition hover:bg-white/[0.04]">
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-white" dir="auto">
                    <div className="flex items-center space-x-2">
                      <span dir="auto">{p.name}</span>
                      {p.is_goalkeeper && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                          🧤 GK
                        </span>
                      )}
                      {p.name_ar && p.name_ar !== p.name && (
                        <span className="text-xs text-slate-400 font-ar" dir="rtl">
                          ({p.name_ar})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300 font-semibold" dir="auto">
                    {p.team_name}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {p.is_captain ? (
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-black uppercase">
                        Captain
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition"
                      title="Edit player"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p.id, p.name)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      title="Delete player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLAYER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex min-h-full items-start justify-center">
          <div
            className="w-full max-w-lg bg-pitch-darkest border border-pitch-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 shadow-2xl my-6 sm:my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 dir="auto" className="text-xl font-bold text-white">
                {editingPlayer ? `Edit Player: ${editingPlayer.name}` : 'Register New Player'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Player Name (Latin or Arabic)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oussama Meraihai or كابرين محمد لؤي"
                  dir="auto"
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Team Assignment
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(parseInt(e.target.value))}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {teams.map((t) => (
                    <option dir="auto" key={t.id} value={t.id}>
                      {t.name} (Poule {t.group_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-pitch-card border border-pitch-border">
                <input
                  type="checkbox"
                  id="captain_check"
                  checked={isCaptain}
                  onChange={(e) => setIsCaptain(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-pitch-darkest border-pitch-border"
                />
                <label htmlFor="captain_check" className="text-xs font-bold text-white cursor-pointer">
                  Assign as Team Captain (C)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition"
                >
                  {saving ? 'Saving...' : 'Save Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

