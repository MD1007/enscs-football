'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Settings, ShieldCheck, X } from 'lucide-react';

interface DiscrepancyBannerProps {
  isResolved: boolean;
  onResolved?: () => void;
}

export default function DiscrepancyBanner({ isResolved, onResolved }: DiscrepancyBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [choice, setChoice] = useState<'confirm_12_teams' | 'switch_to_11_teams'>('confirm_12_teams');
  const [note, setNote] = useState('Confirmed official visual reference: 12 teams (4 teams per group, 18 group matches total).');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isResolved || dismissed) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_discrepancy',
          choice,
          note,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setDismissed(true);
        if (onResolved) onResolved();
      } else {
        alert('Failed to save resolution');
      }
    } catch (err) {
      alert('Error updating configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-950/80 via-pitch-card to-amber-900/60 border border-amber-500/40 rounded-2xl p-4 sm:p-5 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-white font-bold text-sm sm:text-base">
                  Data Discrepancy Detected: 11 Teams vs 12 Teams
                </h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Admin Action Required
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The initial written announcement stated 11 teams (two groups of 4 and one of 3; 15 matches). However, the official tournament schedule graphics depict <strong>12 teams</strong> across 3 groups of 4 (18 matches total). The platform currently loads the 12-team schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-pitch-darkest font-black text-xs uppercase tracking-wider transition shadow-glow"
            >
              Configure / Confirm
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-pitch-darkest border border-pitch-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Tournament Format Configuration</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-300">
                Please confirm the active tournament structure. You can maintain the 12-team schedule from the official visual fixture poster or adjust team assignments:
              </p>

              <div className="space-y-3">
                <label
                  onClick={() => {
                    setChoice('confirm_12_teams');
                    setNote('Official reference confirmed: 12 teams in 3 groups of 4 with 18 matches.');
                  }}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    choice === 'confirm_12_teams'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-pitch-card border-pitch-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-white text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Option A: Confirm 12 Teams (Graphic Reference)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Group A (4 teams), Group B (4 teams), Group C (4 teams). Total 18 group matches. All group winners + best 2nd place qualify.
                  </p>
                </label>

                <label
                  onClick={() => {
                    setChoice('switch_to_11_teams');
                    setNote('Administrator selected 11-team format (2 groups of 4, 1 group of 3).');
                  }}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    choice === 'switch_to_11_teams'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-pitch-card border-pitch-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-white text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Option B: 11 Teams Structure (Announcement Text)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Two groups of 4 and one group of 3. You can remove or adjust the extra team from the Teams Management tab anytime.
                  </p>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  Admin Confirmation Notes:
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-pitch-card border border-pitch-border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-darkest font-bold text-xs uppercase tracking-wider shadow-glow transition"
              >
                {loading ? 'Saving...' : 'Confirm Tournament Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

