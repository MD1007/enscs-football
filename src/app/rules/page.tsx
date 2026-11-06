import React from 'react';
import { getFullTournamentData } from '@/lib/tournamentService';
import { BookOpen, Shield, Award, CheckCircle, Scale, Clock, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  const data = getFullTournamentData();
  const { rules } = data;

  const iconMap: Record<string, any> = {
    format: Scale,
    tiebreaking: Award,
    qualification: CheckCircle,
    knockout_matches: Shield,
    roster_rules: Users,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Official Charter</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Rules & Regulations
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          The official competitive statutes governing the National Higher School of Cybersecurity (ENSCS) Football Championship.
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-6">
        {rules.map((rule, idx) => {
          const Icon = iconMap[rule.id] || BookOpen;

          return (
            <div
              key={rule.id}
              className="glass-panel rounded-2xl border border-pitch-border bg-pitch-card/80 p-6 sm:p-8 space-y-4 hover:border-emerald-500/30 transition shadow-lg"
            >
              <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                    Section {idx + 1} • {rule.category}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {rule.title}
                  </h3>
                </div>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line pl-1 sm:pl-13">
                {rule.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Sign-off banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-pitch-darkest to-blue-950/40 border border-white/10 text-center space-y-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <h4 className="font-bold text-white text-sm uppercase tracking-wide">
          ENSCS Sports & Athletics Committee
        </h4>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          All decisions of the officiating referees and organizing committee are final and binding. Sportsmanship, ethical conduct, and mutual respect are foundational.
        </p>
      </div>
    </div>
  );
}

