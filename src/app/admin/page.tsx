import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { getFullTournamentData, getActivityLogs } from '@/lib/tournamentService';
import { getPersistenceStatus } from '@/lib/persistence';
import { isAdminPasswordPrivate } from '@/lib/db';
import DiscrepancyBanner from '@/components/DiscrepancyBanner';
import {
  Trophy,
  Calendar,
  Users,
  Flame,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const data = getFullTournamentData();
  const logs = getActivityLogs(8);
  const storage = getPersistenceStatus();
  const adminPasswordPrivate = isAdminPasswordPrivate();

  const { matches, summary, teams } = data;

  // Matches requiring results (either live, or scheduled before now and still upcoming)
  const pendingResults = matches.filter(
    (m) => m.status === 'live' || (m.status === 'upcoming' && m.stage === 'group')
  ).slice(0, 5);

  const isDiscrepancyResolved = data.summary.discrepancy_resolved;

  return (
    <div className="space-y-8">
      {/* Discrepancy Notification Banner */}
      <DiscrepancyBanner isResolved={isDiscrepancyResolved} />

      {/* Admin password warning */}
      {!adminPasswordPrivate && (
        <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-300">Admin password is not private yet</p>
            <p className="text-slate-300">
              The current password was published in the project&apos;s code history, so anyone could log in. Set a new
              one as <span className="font-mono">ADMIN_PASSWORD</span> in the server&apos;s Environment settings; the
              old password stops working as soon as it is saved.
            </p>
          </div>
        </div>
      )}

      {/* Cloud backup status */}
      {storage.enabled && storage.started && !storage.last_error ? (
        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-start space-x-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-300">Cloud backup is ON</p>
            <p className="text-slate-300">
              Results are saved automatically and restored after any restart or update.
              {storage.last_backup_at && (
                <> Last saved: {new Date(storage.last_backup_at).toLocaleString('en-GB', { timeZone: 'Africa/Algiers' })}.</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">
              {storage.enabled ? 'Cloud backup has a problem' : 'Cloud backup is OFF'}
            </p>
            <p className="text-slate-300">
              {storage.enabled
                ? storage.last_error || 'Backups are not running yet.'
                : 'Results entered here can be lost when the server restarts or is updated. Set GITHUB_BACKUP_TOKEN on the server to turn it on (see DEPLOYMENT_GUIDE.md).'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Control Center</span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-400">
            Monitor, record results, manage teams and configure tournament settings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/matches"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>Enter Match Results</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-pitch-border bg-pitch-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Teams</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{summary.total_teams}</div>
          <p className="text-[11px] text-slate-400 mt-1">12 official tournament clubs</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-pitch-border bg-pitch-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{summary.matches_played}</div>
          <p className="text-[11px] text-slate-400 mt-1">Finished matches with scores</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-pitch-border bg-pitch-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Remaining</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{summary.matches_remaining}</div>
          <p className="text-[11px] text-slate-400 mt-1">Upcoming or live fixtures</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-pitch-border bg-pitch-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Total Goals</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{summary.total_goals}</div>
          <p className="text-[11px] text-slate-400 mt-1">Tied to registered goal events</p>
        </div>
      </div>

      {/* Two Column Layout: Action Queue & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Matches Awaiting Result Entry */}
        <div className="glass-panel rounded-3xl p-6 border border-pitch-border bg-pitch-card/90 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Next Matches to Record</h3>
            </div>
            <Link
              href="/admin/matches"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingResults.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-pitch-darkest/70 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm" dir="auto">
                      {m.home_team_name || 'TBD'} vs {m.away_team_name || 'TBD'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                      Poule {m.group_id} • J{m.matchday}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {new Date(m.scheduled_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {m.venue || 'Terrain ENSCS'}
                  </div>
                </div>

                <Link
                  href={`/admin/matches?match_id=${m.id}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition border border-emerald-500/30"
                >
                  Enter Result
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Audit / Activity Log */}
        <div className="glass-panel rounded-3xl p-6 border border-pitch-border bg-pitch-card/90 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-base">Recent Activities</h3>
            </div>
            <Link
              href="/admin/activity"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Full Audit Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No administrator activity logged yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-pitch-darkest/70 border border-white/5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

