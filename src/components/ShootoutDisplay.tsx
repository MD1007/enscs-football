import React from 'react';
import { Match, ShootoutKick } from '@/lib/types';
import { Target, Check, X } from 'lucide-react';

interface ShootoutDisplayProps {
  match: Match;
  className?: string;
}

export default function ShootoutDisplay({ match, className = '' }: ShootoutDisplayProps) {
  const kicks = match.shootout || [];
  if (!kicks || kicks.length === 0) return null;

  const homeKicks = kicks.filter((k) => k.team_id === match.home_team_id);
  const awayKicks = kicks.filter((k) => k.team_id === match.away_team_id);

  const homeScore =
    match.home_penalties !== null && match.home_penalties !== undefined
      ? match.home_penalties
      : homeKicks.filter((k) => k.result === 'scored').length;

  const awayScore =
    match.away_penalties !== null && match.away_penalties !== undefined
      ? match.away_penalties
      : awayKicks.filter((k) => k.result === 'scored').length;

  let winnerLine: string | null = null;
  if (match.status === 'finished' && homeScore !== awayScore) {
    const isHomeWinner = homeScore > awayScore;
    const winnerName = isHomeWinner ? match.home_team_name : match.away_team_name;
    const high = Math.max(homeScore, awayScore);
    const low = Math.min(homeScore, awayScore);
    winnerLine = `${winnerName || 'Winner'} win ${high}-${low} on penalties`;
  }

  const renderKickBadge = (kick: ShootoutKick, index: number) => {
    const isScored = kick.result === 'scored';
    const isSaved = kick.result === 'saved';
    // 'scored' | 'missed' | 'saved'

    let badgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
    let icon = <X className="w-3.5 h-3.5 stroke-[3]" />;
    let label = 'Missed';

    if (isScored) {
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      icon = <Check className="w-3.5 h-3.5 stroke-[3]" />;
      label = 'Scored';
    } else if (isSaved) {
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      icon = <span className="text-xs leading-none">🧤</span>;
      label = 'Saved';
    }

    return (
      <div key={index} className="flex flex-col items-center gap-1 group relative">
        <div
          title={`Kick ${index + 1}: ${kick.player_name ? kick.player_name + ' - ' : ''}${label}`}
          className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-110 ${badgeClass}`}
        >
          {icon}
        </div>
        {kick.player_name && (
          <span
            dir="auto"
            className="text-[10px] font-medium text-slate-300 max-w-[70px] truncate text-center"
            title={kick.player_name}
          >
            {kick.player_name}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-7 border border-pitch-border bg-pitch-card/90 space-y-5 ${className}`}>
      {/* Title & Shootout Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight flex items-center gap-2">
              <span>Penalty Shootout</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {homeScore} - {awayScore}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Official penalty shootout record</p>
          </div>
        </div>

        {winnerLine && (
          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
            🏆 {winnerLine}
          </div>
        )}
      </div>

      {/* Team Rows */}
      <div className="space-y-4">
        {/* Home Team Row */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-pitch-darkest/70 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: match.home_team_color || '#10B981' }}
              />
              <span className="font-bold text-sm text-white truncate" dir="auto">
                {match.home_team_name || 'Home Team'}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-emerald-400 bg-white/5 px-2.5 py-1 rounded-lg">
              {homeScore} scored
            </span>
          </div>

          <div className="flex items-start gap-2.5 overflow-x-auto pb-1 pt-1 overscroll-contain">
            {homeKicks.length > 0 ? (
              homeKicks.map((k, i) => renderKickBadge(k, i))
            ) : (
              <span className="text-xs text-slate-500 italic">No penalties recorded</span>
            )}
          </div>
        </div>

        {/* Away Team Row */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-pitch-darkest/70 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: match.away_team_color || '#3B82F6' }}
              />
              <span className="font-bold text-sm text-white truncate" dir="auto">
                {match.away_team_name || 'Away Team'}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-blue-400 bg-white/5 px-2.5 py-1 rounded-lg">
              {awayScore} scored
            </span>
          </div>

          <div className="flex items-start gap-2.5 overflow-x-auto pb-1 pt-1 overscroll-contain">
            {awayKicks.length > 0 ? (
              awayKicks.map((k, i) => renderKickBadge(k, i))
            ) : (
              <span className="text-xs text-slate-500 italic">No penalties recorded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

