'use client';

import React, { useState, useEffect } from 'react';
import { Team, Player, GroupId } from '@/lib/types';
import { Users, Plus, Edit2, Trash2, Shield, Save, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [groupId, setGroupId] = useState<GroupId>('A');
  const [color, setColor] = useState('#10B981');
  const [captainId, setCaptainId] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams || []);
        setPlayers(data.players || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingTeam(null);
    setName('');
    setNameAr('');
    setGroupId('A');
    setColor('#10B981');
    setCaptainId('');
    setModalOpen(true);
    setFeedback(null);
  };

  const openEditModal = (t: Team) => {
    setEditingTeam(t);
    setName(t.name);
    setNameAr(t.name_ar || '');
    setGroupId(t.group_id);
    setColor(t.color || '#3B82F6');
    setCaptainId(t.captain_id ? t.captain_id.toString() : '');
    setModalOpen(true);
    setFeedback(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const isEdit = Boolean(editingTeam);
      const url = '/api/admin/teams';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        id: editingTeam?.id,
        name,
        name_ar: nameAr || null,
        group_id: groupId,
        color,
        captain_id: captainId ? parseInt(captainId) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save team');

      setFeedback({ type: 'success', message: `Team successfully ${isEdit ? 'updated' : 'created'}!` });
      fetchData();
      setTimeout(() => setModalOpen(false), 1000);
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

  const teamPlayers = editingTeam ? players.filter((p) => p.team_id === editingTeam.id) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Rosters & Clubs</span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Team Management</h1>
          <p className="text-sm text-slate-400">
            Create, edit team details, assign colors, designate team captains, or remove teams.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Team</span>
        </button>
      </div>

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
                  {t.players?.length || 0} Players
                </span>
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                  style={{ backgroundColor: t.color || '#3B82F6' }}
                >
                  <Shield className="w-5 h-5 opacity-90" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-base text-white truncate" dir="auto">
                    {t.name}
                  </h3>
                  {t.name_ar && (
                    <p className="text-xs text-slate-400 font-ar" dir="rtl">
                      {t.name_ar}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-300 py-1 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-500">Captain:</span>
                <span className="font-semibold text-white truncate max-w-[150px]" dir="auto">
                  {t.captain_name || 'None'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
              <button
                onClick={() => openEditModal(t)}
                className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Team</span>
              </button>
              <button
                onClick={() => handleDeleteTeam(t.id, t.name)}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                title="Delete Team"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TEAM EDIT / CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-pitch-darkest border border-pitch-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white">
                {editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create New Team'}
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
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Team Name (Standard)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OSPF or Spider-Feet"
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
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
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-ar text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Group Allocation</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value as GroupId)}
                    className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
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
                      className="w-10 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {editingTeam && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Designate Team Captain
                  </label>
                  <select
                    value={captainId}
                    onChange={(e) => setCaptainId(e.target.value)}
                    className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="">No designated captain</option>
                    {teamPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  {saving ? 'Saving...' : 'Save Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

