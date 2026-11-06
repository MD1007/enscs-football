import React from 'react';
import KnockoutBracket from '@/components/KnockoutBracket';
import { getFullTournamentData } from '@/lib/tournamentService';
import { isGroupStageComplete } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export default function KnockoutPage() {
  const data = getFullTournamentData();
  const { matches } = data;

  const groupMatches = matches.filter((m) => m.stage === 'group');
  const finishedGroupMatches = groupMatches.filter((m) => m.status === 'finished').length;
  const isComplete = isGroupStageComplete(matches);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <KnockoutBracket
        matches={matches}
        isComplete={isComplete}
        totalGroupMatches={groupMatches.length}
        finishedGroupMatches={finishedGroupMatches}
      />
    </div>
  );
}

