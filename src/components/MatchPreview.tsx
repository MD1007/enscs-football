import React from 'react';
import Link from 'next/link';
import { Match, Player } from '@/lib/types';
import { FormEntry, getHeadToHead, getMatchStakes, getStarPlayer, getTeamForm } from '@/lib/matchPreview';
import { Swords, TrendingUp, Star, Target, History } from 'lucide-react';

const PILL_STYLE: Record<FormEntry['result'], string> = {
  W: 'bg-emerald-500 text-pitch-darkest border-emerald-300',
  D: 'bg-yellow-400 text-pitch-darkest border-yellow-200',
  L: 'bg-red-500 text-white border-red-300',
};
const RESULT_WORD: Record<FormEntry['result'], string> = { W: 'Win', D: 'Draw', L: 'Loss' };

/** W / D / L pills, newest result first. */
export function FormPills({ form, size = 'md' }: { form: FormEntry[]; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-5 h-5 text-[10px] rounded-md' : 'w-7 h-7 text-xs rounded-lg';
  if (form.length === 0) {
    return <span className="text-[11px] text-slate-500 italic">No matches yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" role="list" aria-label="Recent form, newest first">
      {form.map((f) => (
        <span
          key={f.match_id}
          role="listitem"
          title={`${RESULT_WORD[f.result]} ${f.goals_for}-${f.goals_against} vs ${f.opponent}`}
          aria-label={`${RESULT_WORD[f.result]} ${f.goals_for}-${f.goals_against} against ${f.opponent}`}
          className={`${box} inline-flex items-center justify-center font-black border ${PILL_STYLE[f.result]}`}
        >
          {f.result}
        </span>
      ))}
    </span>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-slate-300">
      {icon}
      <span>{children}</span>
    </h4>
  );
}

function StarCard({ player, teamName, align }: { player: Player | null; teamName: string; align: 'left' | 'right' }) {
  const alignCls = align === 'right' ? 'sm:text-right sm:items-end' : 'sm:text-left sm:items-start';
  if (!player) {
    return (
      <div className={`flex-1 min-w-0 p-3 rounded-xl bg-pitch-darkest/70 border border-white/5 flex flex-col items-center text-center ${alignCls}`}>
        <span className="text-[10px] font-bold uppercase text-slate-500 truncate max-w-full" dir="auto">
          {teamName}
        </span>
        <span className="text-xs text-slate-500 italic mt-1">No goals or assists yet</span>
      </div>
    );
  }
  const g = player.goals || 0;
  const a = player.assists || 0;
  const m = player.mvps || 0;
  return (
    <div className={`flex-1 min-w-0 p-3 rounded-xl bg-pitch-darkest/70 border border-amber-500/25 flex flex-col items-center text-center ${alignCls}`}>
      <span className="text-[10px] font-bold uppercase text-slate-400 truncate max-w-full" dir="auto">
        {teamName}
      </span>
      <Link
        href={`/players/${player.id}`}
        dir="auto"
        className="font-black text-sm sm:text-base text-white hover:text-amber-300 transition break-words max-w-full mt-0.5"
      >
        {player.name}
        {player.is_captain ? ' (C)' : ''}
      </Link>
      <div className="flex items-center gap-1.5 mt-2 font-mono text-[11px]">
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">{g} G</span>
        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">{a} A</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">{m} MVP</span>
      </div>
    </div>
  );
}

interface MatchPreviewProps {
  match: Match;
  matches: Match[];
  players: Player[];
}

/** Pre-match preview: form guide, head-to-head, star player matchup and what is at stake. */
export default function MatchPreview({ match, matches, players }: MatchPreviewProps) {
  if (!match.home_team_id || !match.away_team_id) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        The preview appears as soon as both teams for this match are known.
      </p>
    );
  }

  const home = match.home_team_name || 'Home';
  const away = match.away_team_name || 'Away';
  const homeForm = getTeamForm(match.home_team_id, matches);
  const awayForm = getTeamForm(match.away_team_id, matches);
  const h2h = getHeadToHead(match, matches);
  const homeStar = getStarPlayer(match.home_team_id, players);
  const awayStar = getStarPlayer(match.away_team_id, players);
  const stakes = getMatchStakes(match, matches);

  return (
    <div className="space-y-5">
      {/* Form guide */}
      <section className="space-y-2.5">
        <SectionTitle icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}>Form guide · last 3</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { name: home, form: homeForm },
            { name: away, form: awayForm },
          ].map((t) => (
            <div
              key={t.name}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-pitch-darkest/70 border border-white/5"
            >
              <span className="font-bold text-sm text-white truncate min-w-0" dir="auto">
                {t.name}
              </span>
              <FormPills form={t.form} />
            </div>
          ))}
        </div>
      </section>

      {/* Head to head */}
      <section className="space-y-2.5">
        <SectionTitle icon={<History className="w-3.5 h-3.5 text-blue-400" />}>Head-to-head</SectionTitle>
        {h2h.length === 0 ? (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 flex items-center space-x-2">
            <Swords className="w-4 h-4 flex-shrink-0 text-blue-300" />
            <span>
              <span className="font-black">First Tournament Meeting.</span> These two have not faced each other yet.
            </span>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {h2h.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-pitch-darkest/70 border border-white/5 hover:border-emerald-500/40 transition text-xs"
                >
                  <span className="flex-1 min-w-0 text-right font-bold text-white truncate" dir="auto">
                    {m.home_team_name}
                  </span>
                  <span className="font-mono font-black text-sm text-white px-2.5 py-0.5 rounded-lg bg-pitch-dark border border-white/10 whitespace-nowrap">
                    {m.home_score} : {m.away_score}
                  </span>
                  <span className="flex-1 min-w-0 text-left font-bold text-white truncate" dir="auto">
                    {m.away_team_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Star players */}
      <section className="space-y-2.5">
        <SectionTitle icon={<Star className="w-3.5 h-3.5 text-amber-400" />}>Star player matchup</SectionTitle>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <StarCard player={homeStar} teamName={home} align="right" />
          <div className="flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            vs
          </div>
          <StarCard player={awayStar} teamName={away} align="left" />
        </div>
      </section>

      {/* Stakes */}
      {stakes.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle icon={<Target className="w-3.5 h-3.5 text-red-400" />}>What&apos;s at stake</SectionTitle>
          <ul className="space-y-1.5">
            {stakes.map((line, i) => (
              <li
                key={i}
                dir="auto"
                className={`p-3 rounded-xl text-xs leading-relaxed border ${
                  i < 2 && match.stage === 'group'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100 font-semibold'
                    : 'bg-pitch-darkest/70 border-white/5 text-slate-300'
                }`}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
