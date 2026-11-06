import React from 'react';
import { getFullTournamentData } from '@/lib/tournamentService';
import { ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CardsPage() {
  const data = getFullTournamentData();
  const { yellow_cards, red_cards } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Fair Play & Disciplinary</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Disciplinary Cards</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Disciplinary sanctions recorded by tournament match officials. Yellow cards and direct/double-yellow red cards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Yellow Cards Section */}
        <section className="glass-panel rounded-2xl border border-amber-500/30 bg-pitch-card/80 overflow-hidden shadow-xl space-y-0">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 to-pitch-card border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-4 h-6 rounded bg-amber-400 shadow-sm inline-block"></span>
              <div>
                <h3 className="font-bold text-white text-base">Yellow Cards</h3>
                <p className="text-xs text-slate-400">Cautioned players</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              {yellow_cards.length} Total
            </span>
          </div>

          {yellow_cards.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-sm">No yellow cards recorded.</p>
              <p className="text-xs text-slate-500">Fair play is currently spotless across the competition!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-center font-bold text-amber-400">Cards 🟨</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {yellow_cards.map((item) => (
                    <tr key={item.player.id} className="transition hover:bg-white/[0.04]">
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">{item.rank}</td>
                      <td className="py-3 px-4 font-semibold text-white" dir="auto">
                        <span>{item.player.name}</span>
                        {item.player.is_captain && (
                          <span className="ml-1.5 text-[10px] text-slate-400">(C)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300" dir="auto">
                        {item.player.team_name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Red Cards Section */}
        <section className="glass-panel rounded-2xl border border-red-500/30 bg-pitch-card/80 overflow-hidden shadow-xl space-y-0">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/40 to-pitch-card border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-4 h-6 rounded bg-red-600 shadow-sm inline-block"></span>
              <div>
                <h3 className="font-bold text-white text-base">Red Cards</h3>
                <p className="text-xs text-slate-400">Dismissals & Expulsions</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 rounded-full">
              {red_cards.length} Total
            </span>
          </div>

          {red_cards.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <ShieldX className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-sm">No red cards recorded.</p>
              <p className="text-xs text-slate-500">Zero dismissals in the tournament so far.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-pitch-darkest/40">
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-center font-bold text-red-400">Cards 🟥</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {red_cards.map((item) => (
                    <tr key={item.player.id} className="transition hover:bg-white/[0.04]">
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">{item.rank}</td>
                      <td className="py-3 px-4 font-semibold text-white" dir="auto">
                        <span>{item.player.name}</span>
                        {item.player.is_captain && (
                          <span className="ml-1.5 text-[10px] text-slate-400">(C)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300" dir="auto">
                        {item.player.team_name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-red-500">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

