import React from 'react';
import { StandingRow, GroupId } from '@/lib/types';
import { Trophy, CheckCircle, Shield } from 'lucide-react';

interface StandingsTableProps {
  groupId: GroupId;
  groupName: string;
  rows: StandingRow[];
  colorTheme: 'green' | 'blue' | 'red';
}

export default function StandingsTable({
  groupId,
  groupName,
  rows,
  colorTheme,
}: StandingsTableProps) {
  const getThemeClasses = () => {
    switch (colorTheme) {
      case 'green':
        return {
          border: 'border-emerald-500/30',
          headerBg: 'bg-gradient-to-r from-emerald-950/60 to-pitch-card',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          accent: 'text-emerald-400',
          highlightRow: 'bg-emerald-950/30 border-l-4 border-l-emerald-500',
        };
      case 'blue':
        return {
          border: 'border-blue-500/30',
          headerBg: 'bg-gradient-to-r from-blue-950/60 to-pitch-card',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          accent: 'text-blue-400',
          highlightRow: 'bg-blue-950/30 border-l-4 border-l-blue-500',
        };
      case 'red':
        return {
          border: 'border-red-500/30',
          headerBg: 'bg-gradient-to-r from-red-950/60 to-pitch-card',
          badge: 'bg-red-500/20 text-red-300 border-red-500/40',
          accent: 'text-red-400',
          highlightRow: 'bg-red-950/30 border-l-4 border-l-red-500',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className={`rounded-2xl border ${theme.border} bg-pitch-card/80 overflow-hidden shadow-xl backdrop-blur-md`}>
      {/* Table Header Banner */}
      <div className={`p-4 sm:p-5 ${theme.headerBg} border-b border-white/5 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${theme.badge}`}>
            POULE {groupId}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {groupName}
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="hidden sm:inline">1st Qualifies + Best 2nd</span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
              <th className="py-3 px-3 sm:px-4 text-center w-12">Pos</th>
              <th className="py-3 px-3 sm:px-4">Team</th>
              <th className="py-3 px-2 sm:px-3 text-center">MP</th>
              <th className="py-3 px-2 sm:px-3 text-center">W</th>
              <th className="py-3 px-2 sm:px-3 text-center">D</th>
              <th className="py-3 px-2 sm:px-3 text-center">L</th>
              <th className="py-3 px-2 sm:px-3 text-center">GF</th>
              <th className="py-3 px-2 sm:px-3 text-center">GA</th>
              <th className="py-3 px-2 sm:px-3 text-center">GD</th>
              <th className="py-3 px-3 sm:px-4 text-center font-black text-white">Pts</th>
              <th className="py-3 px-3 text-center hidden md:table-cell">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const isFirst = row.position === 1;
              const isSecond = row.position === 2;

              return (
                <tr
                  key={row.team_id}
                  className={`transition hover:bg-white/[0.04] ${isFirst ? theme.highlightRow : ''}`}
                >
                  {/* Position */}
                  <td className="py-3.5 px-3 sm:px-4 text-center font-bold">
                    <div className="flex items-center justify-center">
                      {isFirst ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black">
                          1
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">{row.position}</span>
                      )}
                    </div>
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-3 sm:px-4 font-semibold text-white">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.team_color || '#3B82F6' }}
                      />
                      <span className="font-bold tracking-tight text-white hover:text-emerald-400 transition" dir="auto">
                        {row.team_name}
                      </span>
                      {isFirst && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider hidden sm:inline">
                          Leader
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Stats */}
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-slate-300">{row.played}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-emerald-400 font-semibold">{row.won}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-slate-400">{row.drawn}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-red-400">{row.lost}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-slate-300">{row.goals_for}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono text-slate-400">{row.goals_against}</td>
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono font-bold">
                    <span
                      className={
                        row.goal_difference > 0
                          ? 'text-emerald-400'
                          : row.goal_difference < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }
                    >
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </span>
                  </td>

                  {/* Points */}
                  <td className="py-3.5 px-3 sm:px-4 text-center font-mono font-black text-base text-white">
                    {row.points}
                  </td>

                  {/* Form */}
                  <td className="py-3.5 px-3 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center space-x-1">
                      {row.form && row.form.length > 0 ? (
                        row.form.map((res, i) => (
                          <span
                            key={i}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black uppercase font-mono ${
                              res === 'W'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : res === 'D'
                                ? 'bg-slate-700/50 text-slate-300'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {res}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="p-3 bg-pitch-darkest/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/40 border border-amber-400"></span>
            <span>1st Place (Automatic Semi-Final)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-400/30 border border-blue-400/50"></span>
            <span>2nd Place (Best 2nd qualifies)</span>
          </div>
        </div>
        <span className="italic hidden sm:inline">Tiebreakers: 1. H2H 2. GD 3. GF</span>
      </div>
    </div>
  );
}

