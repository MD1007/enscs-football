'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Team, Player, GroupId } from '@/lib/types';
import { Users, Shield, Trophy, ChevronRight, Search, Star } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredTeams = teams.filter((t) => {
    if (selectedGroup !== 'all' && t.group_id !== selectedGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchAr = t.name_ar ? t.name_ar.includes(q) : false;
      const matchPlayer = t.players?.some((p) => p.name.toLowerCase().includes(q));
      if (!matchName && !matchAr && !matchPlayer) return false;
    }
    return true;
  });

  const getGroupBadgeColor = (group: GroupId) => {
    switch (group) {
      case 'A':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'B':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'C':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Club Directory</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Teams & Rosters</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Browse all 12 registered teams, official squad lists, team captains, and player performance profiles.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-pitch-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Teams' },
            { id: 'A', label: 'Group A (Green)' },
            { id: 'B', label: 'Group B (Blue)' },
            { id: 'C', label: 'Group C (Red)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedGroup(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition ${
                selectedGroup === tab.id
                  ? 'bg-emerald-500 text-pitch-darkest shadow-glow'
                  : 'bg-pitch-card hover:bg-pitch-cardHover text-slate-300 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search team or player name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-pitch-darkest border border-pitch-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading teams and player squads...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-pitch-border">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No teams found</h3>
          <p className="text-xs text-slate-400 mt-1">Try searching with a different team or player name.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const players = team.players || [];
            const captain = players.find((p) => p.is_captain);

            return (
              <div
                key={team.id}
                className="glass-card rounded-2xl border border-pitch-border bg-pitch-card/80 p-5 space-y-4 hover:border-emerald-500/40 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Group Badge & Color */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getGroupBadgeColor(
                        team.group_id
                      )}`}
                    >
                      Poule {team.group_id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {players.length} Registered Player{players.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Team Crest & Name */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0"
                      style={{ backgroundColor: team.color || '#3B82F6' }}
                    >
                      <Shield className="w-6 h-6 opacity-90" />
                    </div>
                    <div className="truncate">
                      <h3
                        className="text-lg font-black text-white tracking-tight truncate"
                        dir="auto"
                      >
                        {team.name}
                      </h3>
                      {team.name_ar && (
                        <p className="text-xs text-slate-400 font-ar" dir="rtl">
                          {team.name_ar}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Captain Info */}
                  <div className="p-3 rounded-xl bg-pitch-darkest/60 border border-white/5 flex items-center space-x-2 text-xs mb-4">
                    <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-slate-400">Captain:</span>
                    <span className="font-bold text-white truncate" dir="auto">
                      {captain ? captain.name : team.captain_name || 'To be confirmed'}
                    </span>
                  </div>

                  {/* Player Roster Preview */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                      Squad Roster
                    </span>
                    {players.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Roster pending confirmation</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {players.map((p, idx) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05]"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                              <span
                                className={`truncate ${p.is_captain ? 'font-bold text-emerald-300' : 'text-slate-300'}`}
                                dir="auto"
                              >
                                {p.name}
                              </span>
                            </div>
                            {p.is_captain && (
                              <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-black">
                                (C)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <Link
                    href={`/teams/${team.id}`}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-bold text-slate-300 transition"
                  >
                    <span>View Full Team Stats</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

