import React from 'react';
import StandingsTable from '@/components/StandingsTable';
import { getFullTournamentData } from '@/lib/tournamentService';
import { Trophy, Award, Shield, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StandingsPage() {
  const data = getFullTournamentData();
  const { standings, best_second } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Page Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Official Tables</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Group Standings</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Three independent groups competing for semi-final qualification. The winner of each group plus the single best 2nd-place team across all groups advance to the knockout stage.
        </p>
      </div>

      {/* Qualification Criteria Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Qualification Pathway: 3 Group Winners + 1 Best Runner-up</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Tie-breaking hierarchy: 1. Head-to-head result • 2. Overall Goal Difference (GD) • 3. Goals Scored (GF).
            </div>
          </div>
        </div>
      </div>

      {/* The 3 Separate Group Tables */}
      <div className="space-y-10">
        {/* GROUP A (Green) */}
        <section className="space-y-3">
          <StandingsTable
            groupId="A"
            groupName="Poule A (OSPF, Wolves, Spider-Feet, Laghbina)"
            rows={standings.A || []}
            colorTheme="green"
          />
        </section>

        {/* GROUP B (Blue) */}
        <section className="space-y-3">
          <StandingsTable
            groupId="B"
            groupName="Poule B (Rats Team, PVC, Nscs, Barca)"
            rows={standings.B || []}
            colorTheme="blue"
          />
        </section>

        {/* GROUP C (Red) */}
        <section className="space-y-3">
          <StandingsTable
            groupId="C"
            groupName="Poule C (Zoro, FC deddou, فريق الرجال, FC Rono)"
            rows={standings.C || []}
            colorTheme="red"
          />
        </section>
      </div>

      {/* Best Second Place Comparison Table */}
      <section className="glass-panel rounded-2xl border border-amber-500/30 bg-pitch-card/90 overflow-hidden shadow-xl">
        <div className="p-5 bg-gradient-to-r from-amber-950/40 to-pitch-card border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Best Second-Place Race (Wildcard Semi-Finalist)
              </h3>
              <p className="text-xs text-slate-400">
                The top-ranked 2nd place team across Group A, B, and C earns the 4th semi-final ticket.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full uppercase">
            1 Qualifies
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                <th className="py-3 px-4 text-center w-12">Rank</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">Group</th>
                <th className="py-3 px-3 text-center">MP</th>
                <th className="py-3 px-3 text-center">W</th>
                <th className="py-3 px-3 text-center">D</th>
                <th className="py-3 px-3 text-center">L</th>
                <th className="py-3 px-3 text-center">GD</th>
                <th className="py-3 px-4 text-center font-black text-white">Pts</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {best_second.map((row, idx) => {
                const isBest = idx === 0;
                return (
                  <tr
                    key={row.team_id}
                    className={`transition hover:bg-white/[0.04] ${
                      isBest ? 'bg-amber-950/20 border-l-4 border-l-amber-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold font-mono text-xs text-slate-300">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white" dir="auto">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: row.team_color || '#3B82F6' }}
                        />
                        <span dir="auto">{row.team_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-xs text-slate-400">
                      Group {row.group_id}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300">{row.played}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400">{row.won}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{row.drawn}</td>
                    <td className="py-3 px-3 text-center font-mono text-red-400">{row.lost}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-base text-white">
                      {row.points}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isBest ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Currently Qualified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          In Contention
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

