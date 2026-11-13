'use client';

import React, { useState, useEffect } from 'react';
import MatchCard from '@/components/MatchCard';
import { Match, Player, GroupId } from '@/lib/types';
import { syncServerTime } from '@/lib/liveClock';
import { Calendar, Filter, Search, Vote } from 'lucide-react';
import Link from 'next/link';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedMatchday, setSelectedMatchday] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        syncServerTime(data.server_time);
        setMatches(data.matches || []);
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load matches:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();

    // Auto-sync every 15 seconds
    const interval = setInterval(loadData, 15000);

    // Refresh immediately when student switches back to browser tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const filteredMatches = matches.filter((m) => {
    // Group filter
    if (selectedGroup !== 'all') {
      if (selectedGroup === 'knockout') {
        if (m.stage === 'group') return false;
      } else {
        if (m.group_id !== selectedGroup || m.stage !== 'group') return false;
      }
    }

    // Matchday filter
    if (selectedMatchday !== 'all') {
      if (m.matchday?.toString() !== selectedMatchday) return false;
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (m.status !== selectedStatus) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const home = (m.home_team_name || '').toLowerCase();
      const away = (m.away_team_name || '').toLowerCase();
      if (!home.includes(q) && !away.includes(q)) return false;
    }

    return true;
  });

  // Fixtures as a calendar: live first, then each match day in order, then
  // matches without a date, then results (newest first).
  const dayKey = (m: Match) => (m.scheduled_time || '').slice(0, 10);
  const time = (m: Match) => new Date(m.scheduled_time).getTime() || 0;
  const sections: { key: string; title: string; hint?: string; tone: string; matches: Match[] }[] = [];
  const live = filteredMatches.filter((m) => m.status === 'live').sort((a, b) => time(a) - time(b));
  if (live.length) sections.push({ key: 'live', title: 'Live now', tone: 'text-red-300', matches: live });

  const scheduled = filteredMatches
    .filter((m) => (m.status === 'upcoming' || m.status === 'postponed') && m.is_time_set)
    .sort((a, b) => time(a) - time(b) || a.id - b.id);
  const todayKey = new Date().toLocaleDateString('en-CA');
  for (const m of scheduled) {
    const key = dayKey(m);
    let section = sections.find((s) => s.key === key);
    if (!section) {
      const [y, mo, d] = key.split('-').map(Number);
      const title = new Date(y, (mo || 1) - 1, d || 1).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      section = {
        key,
        title,
        hint: key === todayKey ? 'Today' : key < todayKey ? 'Result pending' : undefined,
        tone: 'text-emerald-300',
        matches: [],
      };
      sections.push(section);
    }
    section.matches.push(m);
  }

  const unscheduled = filteredMatches.filter(
    (m) => (m.status === 'upcoming' || m.status === 'postponed') && !m.is_time_set
  );
  if (unscheduled.length)
    sections.push({ key: 'tba', title: 'Date to be announced', tone: 'text-amber-300', matches: unscheduled });

  const others = filteredMatches
    .filter((m) => m.status === 'finished' || m.status === 'cancelled')
    .sort((a, b) => time(b) - time(a) || b.id - a.id);
  if (others.length) sections.push({ key: 'results', title: 'Results', tone: 'text-slate-300', matches: others });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fixtures & Results</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Tournament Matches</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Follow all 18 group matches and upcoming knockout ties. Tap a finished match for its full timeline, or an upcoming one for the preview: form guide, head-to-head, star players and what is at stake.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <Link
            href="/fan-zone"
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition shadow-sm"
          >
            <Vote className="w-3.5 h-3.5 text-purple-400" />
            <span>Fan Predictions & Polls</span>
          </Link>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Auto-Sync Active</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-pitch-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Group pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: 'all', label: 'All Fixtures' },
              { id: 'A', label: 'Group A (Green)' },
              { id: 'B', label: 'Group B (Blue)' },
              { id: 'C', label: 'Group C (Red)' },
              { id: 'knockout', label: 'Knockout Stage' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition ${selectedGroup === tab.id
                    ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                    : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-pitch-darkest border border-pitch-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Sub-filters: Matchday & Status */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Matchday:</span>
            {['all', '1', '2', '3'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedMatchday(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${selectedMatchday === d
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {d === 'all' ? 'All Days' : `Journée ${d}`}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Status:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'live', label: 'Live' },
              { id: 'finished', label: 'Finished' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${selectedStatus === s.id
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading tournament fixtures...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-pitch-border">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No matches found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key} aria-label={section.title} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className={`text-sm sm:text-base font-black uppercase tracking-wider ${section.tone}`}>
                  {section.key === 'live' && (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping mr-2 align-middle" />
                  )}
                  {section.title}
                </h2>
                {section.hint && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {section.hint}
                  </span>
                )}
                <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
                <span className="text-[11px] text-slate-500 font-mono">
                  {section.matches.length} match{section.matches.length === 1 ? '' : 'es'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.matches.map((match) => (
                  <MatchCard key={match.id} match={match} allMatches={matches} allPlayers={players} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

