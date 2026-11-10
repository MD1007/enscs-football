import { Match, Player } from './types';

// Pure helpers behind the pre-match preview (form guide, head-to-head, star
// players, match stakes). No database access, so they run on server and client.

export type FormResult = 'W' | 'D' | 'L';

export interface FormEntry {
  result: FormResult;
  match_id: number;
  opponent: string;
  goals_for: number;
  goals_against: number;
}

const byTimeDesc = (a: Match, b: Match) =>
  new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime() || b.id - a.id;

const isFinished = (m: Match) => m.status === 'finished' && m.home_score != null && m.away_score != null;

/** Result of a finished match from one team's point of view (shootouts decide drawn knockout ties). */
export function resultFor(match: Match, teamId: number): FormResult {
  const isHome = match.home_team_id === teamId;
  const gf = (isHome ? match.home_score : match.away_score) ?? 0;
  const ga = (isHome ? match.away_score : match.home_score) ?? 0;
  if (gf > ga) return 'W';
  if (gf < ga) return 'L';
  if (match.home_penalties != null && match.away_penalties != null && match.home_penalties !== match.away_penalties) {
    const pf = isHome ? match.home_penalties : match.away_penalties;
    const pa = isHome ? match.away_penalties : match.home_penalties;
    return pf > pa ? 'W' : 'L';
  }
  return 'D';
}

/** Most recent finished results for a team, newest first. */
export function getTeamForm(teamId: number, matches: Match[], limit = 3): FormEntry[] {
  return matches
    .filter((m) => isFinished(m) && (m.home_team_id === teamId || m.away_team_id === teamId))
    .sort(byTimeDesc)
    .slice(0, limit)
    .map((m) => {
      const isHome = m.home_team_id === teamId;
      return {
        result: resultFor(m, teamId),
        match_id: m.id,
        opponent: (isHome ? m.away_team_name : m.home_team_name) || 'TBD',
        goals_for: (isHome ? m.home_score : m.away_score) ?? 0,
        goals_against: (isHome ? m.away_score : m.home_score) ?? 0,
      };
    });
}

/** Earlier finished meetings between the two teams, newest first. */
export function getHeadToHead(match: Match, matches: Match[]): Match[] {
  const a = match.home_team_id;
  const b = match.away_team_id;
  if (!a || !b) return [];
  return matches
    .filter(
      (m) =>
        m.id !== match.id &&
        isFinished(m) &&
        ((m.home_team_id === a && m.away_team_id === b) || (m.home_team_id === b && m.away_team_id === a))
    )
    .sort(byTimeDesc);
}

/** The team's top contributor so far, or null when nobody has a goal, assist or MVP yet. */
export function getStarPlayer(teamId: number, players: Player[]): Player | null {
  const squad = players.filter((p) => p.team_id === teamId);
  const score = (p: Player) => (p.goals || 0) + (p.assists || 0);
  const ranked = [...squad].sort(
    (x, y) =>
      score(y) - score(x) ||
      (y.goals || 0) - (x.goals || 0) ||
      (y.mvps || 0) - (x.mvps || 0) ||
      x.name.localeCompare(y.name)
  );
  const top = ranked[0];
  if (!top || score(top) + (top.mvps || 0) === 0) return null;
  return top;
}

// ------------------------------------------------------------------ stakes

type Outcome = 'H' | 'D' | 'A';

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/**
 * What is at stake, worked out by playing every possible combination of the
 * group's remaining results. Only points are simulated, so a tie on points is
 * never reported as a guarantee (tie-breakers decide those).
 */
export function getMatchStakes(match: Match, matches: Match[]): string[] {
  const home = match.home_team_name;
  const away = match.away_team_name;

  if (match.stage === 'semi_final') {
    return [
      'Winner goes to the Grand Final; the loser plays the 3rd place match.',
      'If the score is level at full time, a penalty shootout decides it.',
    ];
  }
  if (match.stage === 'final') {
    return ['The Grand Final: the winner lifts the trophy.', 'Level at full time means a penalty shootout.'];
  }
  if (match.stage === 'third_place') {
    return ['The bronze medal is on the line: the winner finishes 3rd in the tournament.'];
  }
  if (match.stage !== 'group' || !match.group_id || !match.home_team_id || !match.away_team_id || !home || !away) {
    return [];
  }

  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group_id === match.group_id && m.home_team_id && m.away_team_id && m.status !== 'cancelled'
  );
  const teamIds = Array.from(new Set(groupMatches.flatMap((m) => [m.home_team_id, m.away_team_id])));
  const basePoints: Record<number, number> = {};
  const played: Record<number, number> = {};
  for (const id of teamIds) {
    basePoints[id] = 0;
    played[id] = 0;
  }
  for (const m of groupMatches.filter(isFinished)) {
    const r = resultFor(m, m.home_team_id);
    basePoints[m.home_team_id] += r === 'W' ? 3 : r === 'D' ? 1 : 0;
    basePoints[m.away_team_id] += r === 'L' ? 3 : r === 'D' ? 1 : 0;
    played[m.home_team_id] += 1;
    played[m.away_team_id] += 1;
  }

  const remaining = groupMatches.filter((m) => !isFinished(m));
  const others = remaining.filter((m) => m.id !== match.id);
  if (!remaining.some((m) => m.id === match.id) || others.length > 7) return [];

  const outcomes: Outcome[] = ['H', 'D', 'A'];
  const apply = (pts: Record<number, number>, m: Match, o: Outcome) => {
    if (o === 'H') pts[m.home_team_id] += 3;
    else if (o === 'A') pts[m.away_team_id] += 3;
    else {
      pts[m.home_team_id] += 1;
      pts[m.away_team_id] += 1;
    }
  };

  // For each result of THIS match: does the team always top the group, and can it at all?
  type Scenario = { clinch: boolean; alive: boolean; topTwoAlive: boolean };
  const analyse = (teamId: number, thisOutcome: Outcome): Scenario => {
    let clinch = true;
    let alive = false;
    let topTwoAlive = false;
    const total = Math.pow(3, others.length);
    for (let i = 0; i < total; i++) {
      const pts = { ...basePoints };
      apply(pts, match, thisOutcome);
      let code = i;
      for (const m of others) {
        apply(pts, m, outcomes[code % 3]);
        code = Math.floor(code / 3);
      }
      const mine = pts[teamId];
      const rivals = teamIds.filter((id) => id !== teamId).map((id) => pts[id]);
      const above = rivals.filter((p) => p > mine).length;
      const level = rivals.filter((p) => p === mine).length;
      if (above > 0 || level > 0) clinch = false;
      if (above === 0) alive = true;
      if (above <= 1) topTwoAlive = true;
    }
    return { clinch, alive, topTwoAlive };
  };

  const group = `Group ${match.group_id}`;
  const lines: string[] = [];

  const describe = (teamId: number, name: string, isHome: boolean) => {
    const win = analyse(teamId, isHome ? 'H' : 'A');
    const draw = analyse(teamId, 'D');
    const loss = analyse(teamId, isHome ? 'A' : 'H');
    const pts = basePoints[teamId];

    if (loss.clinch) return `${name} has already secured top spot in ${group}.`;
    if (draw.clinch) return `${name} wins ${group} with a win or a draw.`;
    if (win.clinch) return `${name} wins ${group} with a win.`;
    if (!win.alive) {
      return win.topTwoAlive
        ? `${name} can no longer finish top of ${group}, but a win keeps the best runner-up route alive.`
        : `${name} is out of the qualification race and plays for pride.`;
    }
    if (!draw.alive) return `${name} must win to stay in the race for top spot in ${group}.`;
    if (!loss.alive) return `${name} must avoid defeat to stay in the race for top spot in ${group}.`;
    if (played[teamId] === 0) return `${name} opens its campaign: a win means an ideal 3-point start.`;
    return `${name} is on ${pts} pt${pts === 1 ? '' : 's'}; a win would take it to ${pts + 3}.`;
  };

  lines.push(describe(match.home_team_id, home, true));
  lines.push(describe(match.away_team_id, away, false));

  // Table context: who is where right now.
  const table = [...teamIds].sort((x, y) => basePoints[y] - basePoints[x]);
  const posOf = (id: number) => table.findIndex((t) => t === id) + 1;
  if (played[match.home_team_id] + played[match.away_team_id] > 0) {
    lines.push(
      `Table before kick-off: ${home} ${ordinal(posOf(match.home_team_id))} (${basePoints[match.home_team_id]} pts), ${away} ${ordinal(
        posOf(match.away_team_id)
      )} (${basePoints[match.away_team_id]} pts).`
    );
  }
  lines.push('Group winners qualify for the semi-finals, joined by the best runner-up across the three groups.');

  return lines;
}
