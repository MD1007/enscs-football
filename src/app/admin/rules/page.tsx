'use client';

import React, { useState, useEffect } from 'react';
import { TournamentRule } from '@/lib/types';
import { Settings, Save, AlertTriangle, RefreshCcw, CheckCircle, AlertCircle, Edit2, ShieldAlert } from 'lucide-react';

export default function AdminRulesPage() {
  const [rules, setRules] = useState<TournamentRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing rule
  const [editingRule, setEditingRule] = useState<TournamentRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleContent, setRuleContent] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');

  // Reset confirmation
  const [resetPhrase, setResetPhrase] = useState('');
  const [resetting, setResetting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setRules(data.rules || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditRule = (r: TournamentRule) => {
    setEditingRule(r);
    setRuleTitle(r.title);
    setRuleContent(r.content);
    setRuleCategory(r.category);
    setFeedback(null);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_rule',
          id: editingRule.id,
          title: ruleTitle,
          content: ruleContent,
          category: ruleCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to update rule');

      setFeedback({ type: 'success', message: 'Rule successfully updated and published!' });
      fetchData();
      setEditingRule(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetTournament = async () => {
    if (resetPhrase !== 'RESET_ENSCS_TOURNAMENT') {
      alert('You must type exact phrase: RESET_ENSCS_TOURNAMENT');
      return;
    }

    if (!confirm('FINAL WARNING: This will reset all match scores, goals, and cards to original seeded fixtures. Continue?')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: resetPhrase }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to reset');

      alert('Tournament reset successful!');
      setResetPhrase('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Governance & Settings</span>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Rules & Configuration</h1>
        <p className="text-sm text-slate-400">
          Modify official tournament rules, edit competition statutes, or reset tournament data.
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

      {/* Rules Editor List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Tournament Rules & Guidelines</h3>

        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="glass-panel p-5 rounded-2xl border border-pitch-border bg-pitch-card/80 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {rule.category}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">{rule.title}</h4>
                </div>
                <button
                  onClick={() => openEditRule(rule)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Rule</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{rule.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-pitch-darkest border border-pitch-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Rule: {editingRule.title}</h3>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Rule Body Content</label>
                <textarea
                  rows={5}
                  required
                  value={ruleContent}
                  onChange={(e) => setRuleContent(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition"
                >
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloud Safety & Data Backup */}
      <div className="p-6 rounded-2xl bg-pitch-card border border-pitch-border space-y-4">
        <div className="flex items-center space-x-2 text-emerald-400">
          <Save className="w-5 h-5" />
          <h3 className="font-bold text-base uppercase tracking-wider text-white">Data Backup & Safety</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Safeguard your tournament results anytime. You can download an offline JSON backup of all teams, rosters, matches, scores, and disciplinary records to your phone or computer, or restore a previous snapshot.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/backup');
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `enscs_tournament_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (e) {
                alert('Failed to download backup');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Download Backup (.json)</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-pitch-darkest hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center space-x-2 cursor-pointer">
            <RefreshCcw className="w-4 h-4 text-amber-400" />
            <span>Restore From File (.json)</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!confirm(`Are you sure you want to restore data from "${file.name}"? This will replace current tournament state.`)) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                  try {
                    const json = JSON.parse(event.target?.result as string);
                    const res = await fetch('/api/admin/backup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(json),
                    });
                    const resData = await res.json();
                    if (!res.ok) throw new Error(resData.error || 'Restore failed');
                    alert('Tournament successfully restored from backup!');
                    fetchData();
                  } catch (err: any) {
                    alert('Error restoring backup: ' + err.message);
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Danger Zone: Tournament Reset */}
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-4">
        <div className="flex items-center space-x-2 text-red-400">
          <ShieldAlert className="w-5 h-5" />
          <h3 className="font-bold text-base uppercase tracking-wider">Danger Zone: Tournament Data Reset</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Resetting will wipe all recorded scores, goalscorers, assists, and disciplinary cards, restoring the competition to initial pre-tournament fixtures and original rosters from the reference images.
        </p>

        <div className="space-y-2 max-w-md pt-2">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Type <span className="text-red-400 font-mono">RESET_ENSCS_TOURNAMENT</span> to confirm:
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={resetPhrase}
              onChange={(e) => setResetPhrase(e.target.value)}
              placeholder="RESET_ENSCS_TOURNAMENT"
              className="flex-1 bg-pitch-darkest border border-red-500/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleResetTournament}
              disabled={resetting || resetPhrase !== 'RESET_ENSCS_TOURNAMENT'}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-40"
            >
              {resetting ? 'Resetting...' : 'Reset Tournament'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

