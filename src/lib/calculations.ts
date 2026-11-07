import { Team, Player, Match, GroupId, StandingRow, MatchEvent, TeamOfTournamentData, TeamOfTournamentPlayer } from './types';

/**
 * Calculates standings for a group according to official tournament rules:
 * Tie-breaking rules:
 * 1. Points (Win = 3, Draw = 1, Loss = 0)
 * 2. Head-to-head results between tied teams (points, GD, GF)
 * 3. Overall Goal Difference (GD)
 * 4. Overall Goals Scored (GF)
 */
export function calculateGroupStandings(
  groupId: GroupId,
  teams: Team[],
  matches: Match[]
): StandingRow[] {
  const groupTeams = teams.filter((t) => t.group_id === groupId);
  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group_id === groupId && (m.status === 'finished' || m.status === 'live')
  );

  // Initialize stats for each team
  const statsMap: Record<number, StandingRow> = {};
  for (const team of groupTeams) {
    statsMap[team.id] = {
      position: 1,
      team_id: team.id,
      team_name: team.name,
      team_color: team.color || '#3B82F6',
      group_id: groupId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [],
    };
  }

  // Process matches
  for (const m of groupMatches) {
    if (m.home_score === null || m.home_score === undefined || m.away_score === null || m.away_score === undefined) {
      continue;
    }

    const home = statsMap[m.home_team_id];
    const away = statsMap[m.away_team_id];

    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.goals_for += m.home_score;
    home.goals_against += m.away_score;
    away.goals_for += m.away_score;
    away.goals_against += m.home_score;

    if (m.home_score > m.away_score) {
      home.won += 1;
      home.points += 3;
      home.form = [...(home.form || []), 'W'];

      away.lost += 1;
      away.form = [...(away.form || []), 'L'];
    } else if (m.home_score < m.away_score) {
      away.won += 1;
      away.points += 3;
      away.form = [...(away.form || []), 'W'];

      home.lost += 1;
      home.form = [...(home.form || []), 'L'];
    } else {
      home.drawn += 1;
      home.points += 1;
      home.form = [...(home.form || []), 'D'];

      away.drawn += 1;
      away.points += 1;
      away.form = [...(away.form || []), 'D'];
    }
  }

  // Calculate goal differences
  for (const id in statsMap) {
    statsMap[id].goal_difference = statsMap[id].goals_for - statsMap[id].goals_against;
  }

  const rows = Object.values(statsMap);

  // Sort with Head-to-Head and GD/GF tiebreakers
  rows.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // 2. Head-to-Head between tied teams
    const h2hMatches = groupMatches.filter(
      (m) =>
        (m.home_team_id === a.team_id && m.away_team_id === b.team_id) ||
        (m.home_team_id === b.team_id && m.away_team_id === a.team_id)
    );

    if (h2hMatches.length > 0) {
      let aH2HPoints = 0;
      let bH2HPoints = 0;
      let aH2HGD = 0;

      for (const m of h2hMatches) {
        if (m.home_score === null || m.away_score === null) continue;
        const aScore = m.home_team_id === a.team_id ? m.home_score : m.away_score;
        const bScore = m.home_team_id === b.team_id ? m.home_score : m.away_score;

        if (aScore! > bScore!) {
          aH2HPoints += 3;
        } else if (bScore! > aScore!) {
          bH2HPoints += 3;
        } else {
          aH2HPoints += 1;
          bH2HPoints += 1;
        }
        aH2HGD += (aScore! - bScore!);
      }

      if (bH2HPoints !== aH2HPoints) {
        return bH2HPoints - aH2HPoints;
      }
      if (aH2HGD !== 0) {
        return -aH2HGD;
      }
    }

    // 3. Goal Difference
    if (b.goal_difference !== a.goal_difference) {
      return b.goal_difference - a.goal_difference;
    }

    // 4. Goals For
    if (b.goals_for !== a.goals_for) {
      return b.goals_for - a.goals_for;
    }

    // Fallback: Alphabetical
    return a.team_name.localeCompare(b.team_name);
  });

  // Assign positions (1-based)
  rows.forEach((row, idx) => {
    row.position = idx + 1;
  });

  return rows;
}

/**
 * Calculates the best 2nd place team across all groups
 */
export function calculateBestSecondPlace(
  standings: Record<GroupId, StandingRow[]>
): StandingRow[] {
  const secondPlaces: StandingRow[] = [];

  for (const group of ['A', 'B', 'C'] as GroupId[]) {
    const groupRows = standings[group];
    if (groupRows && groupRows.length >= 2) {
      secondPlaces.push({ ...groupRows[1] });
    }
  }

  // Sort second-placed teams by:
  // 1. Points
  // 2. Goal difference
  // 3. Goals for
  secondPlaces.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });

  // Mark best 2nd as qualified
  if (secondPlaces.length > 0) {
    secondPlaces[0].is_qualified = true;
  }

  return secondPlaces;
}

/**
 * Aggregates player stats: Goals, Assists, Cards from match events
 */
export function aggregatePlayerStats(
  players: Player[],
  teams: Team[],
  matches: Match[]
) {
  const playerMap: Record<number, Player> = {};
  const teamMap: Record<number, Team> = {};

  teams.forEach((t) => {
    teamMap[t.id] = t;
  });

  players.forEach((p) => {
    playerMap[p.id] = {
      ...p,
      team_name: teamMap[p.team_id]?.name || 'Unknown',
      goals: 0,
      assists: 0,
      matches_played: 0,
      yellow_cards: 0,
      red_cards: 0,
      mvps: 0,
      overall_points: 0,
      nicknames: [],
    };
  });

  // Track assists to avoid double-counting between linked events
  const countedAssists = new Set<string>();

  // Collect all events, appearances, and MVPs from matches
  for (const m of matches) {
    // Count appearances for finished matches
    if (m.status === 'finished') {
      players.forEach((p) => {
        if (p.team_id === m.home_team_id || p.team_id === m.away_team_id) {
          if (playerMap[p.id]) {
            playerMap[p.id].matches_played = (playerMap[p.id].matches_played || 0) + 1;
          }
        }
      });
    }

    if (m.mvp_player_id && playerMap[m.mvp_player_id]) {
      playerMap[m.mvp_player_id].mvps = (playerMap[m.mvp_player_id].mvps || 0) + 1;
    }

    if (!m.events) continue;
    for (const ev of m.events) {
      const p = playerMap[ev.player_id];

      // Goal handling: Own goals do NOT count toward the scorer's goal tally
      if (ev.event_type === 'goal') {
        if (ev.sub_type !== 'own_goal' && p) {
          p.goals = (p.goals || 0) + 1;
        }

        // Direct assist on goal event
        if (ev.assister_id && playerMap[ev.assister_id]) {
          const assistKey = `goal-${ev.id || m.id}-${ev.assister_id}-${ev.minute || 0}`;
          if (!countedAssists.has(assistKey)) {
            countedAssists.add(assistKey);
            playerMap[ev.assister_id].assists = (playerMap[ev.assister_id].assists || 0) + 1;
          }
        }
      } else if (ev.event_type === 'assist' && p) {
        const assistKey = `assist-${ev.id || m.id}-${ev.player_id}-${ev.minute || 0}`;
        if (!countedAssists.has(assistKey)) {
          countedAssists.add(assistKey);
          p.assists = (p.assists || 0) + 1;
        }
      } else if (ev.event_type === 'yellow_card' && p) {
        p.yellow_cards = (p.yellow_cards || 0) + 1;
      } else if (ev.event_type === 'red_card' && p) {
        p.red_cards = (p.red_cards || 0) + 1;
      }
    }
  }

  const allPlayersWithStats = Object.values(playerMap);

  // Calculate Overall Performance Points for each player:
  // Goals (+5), Assists (+3), MVPs (+10), Appearances (+2), Yellow (-1), Red (-4)
  for (const p of allPlayersWithStats) {
    p.overall_points = Math.max(
      0,
      (p.goals || 0) * 5 +
        (p.assists || 0) * 3 +
        (p.mvps || 0) * 10 +
        (p.matches_played || 0) * 2 -
        (p.yellow_cards || 0) * 1 -
        (p.red_cards || 0) * 4
    );
  }

  // Top scorers (goals > 0, excluding own goals)
  const topScorers = allPlayersWithStats
    .filter((p) => (p.goals || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      goals: player.goals || 0,
      rank: idx + 1,
    }));

  // Top assists (assists > 0)
  const topAssists = allPlayersWithStats
    .filter((p) => (p.assists || 0) > 0)
    .sort((a, b) => (b.assists || 0) - (a.assists || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      assists: player.assists || 0,
      rank: idx + 1,
    }));

  // Top MVPs (mvps > 0)
  const topMVPs = allPlayersWithStats
    .filter((p) => (p.mvps || 0) > 0)
    .sort((a, b) => (b.mvps || 0) - (a.mvps || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      mvps: player.mvps || 0,
      rank: idx + 1,
    }));

  // Player of the Tournament (Overall Index)
  const playerOfTheTournament = allPlayersWithStats
    .filter((p) => (p.overall_points || 0) > 0 || (p.mvps || 0) > 0 || (p.goals || 0) > 0)
    .sort(
      (a, b) =>
        (b.overall_points || 0) - (a.overall_points || 0) ||
        (b.mvps || 0) - (a.mvps || 0) ||
        (b.goals || 0) - (a.goals || 0) ||
        a.name.localeCompare(b.name)
    )
    .map((player, idx) => ({
      player,
      points: player.overall_points || 0,
      rank: idx + 1,
      goals: player.goals || 0,
      assists: player.assists || 0,
      mvps: player.mvps || 0,
      appearances: player.matches_played || 0,
    }));

  // Assign Hyping Nicknames
  const maxGoals = topScorers.length > 0 ? topScorers[0].goals : 0;
  const maxAssists = topAssists.length > 0 ? topAssists[0].assists : 0;
  const maxMvps = topMVPs.length > 0 ? topMVPs[0].mvps : 0;

  for (const player of allPlayersWithStats) {
    player.nicknames = [];

    // Top Scorer Nickname
    if ((player.goals || 0) > 0 && player.goals === maxGoals) {
      player.nicknames.push({
        title: '⚡ EL CYBER GOLEADOR',
        subtitle: 'Tournament Top Scorer',
        color: 'amber',
        icon: 'Flame',
      });
    }

    // Top Assister Nickname
    if ((player.assists || 0) > 0 && player.assists === maxAssists) {
      player.nicknames.push({
        title: '🪄 THE MASTER ARCHITECT',
        subtitle: 'Tournament Assist King',
        color: 'emerald',
        icon: 'Award',
      });
    }

    // Most MVP Nickname
    if ((player.mvps || 0) > 0 && player.mvps === maxMvps) {
      player.nicknames.push({
        title: '👑 TOURNAMENT KINGPIN',
        subtitle: 'Most Match MVPs',
        color: 'purple',
        icon: 'Crown',
      });
    }

    // Triple Crown Easter Egg / Super Legend Title!
    if (player.nicknames.length === 3) {
      player.nicknames.unshift({
        title: '🌟 THE CYBER GOAT',
        subtitle: 'Triple Crown Master (Goals, Assists & MVPs)',
        color: 'blue',
        icon: 'Sparkles',
      });
    }
  }

  // Yellow cards (count > 0)
  const yellowCards = allPlayersWithStats
    .filter((p) => (p.yellow_cards || 0) > 0)
    .sort((a, b) => (b.yellow_cards || 0) - (a.yellow_cards || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      count: player.yellow_cards || 0,
      rank: idx + 1,
    }));

  // Red cards (count > 0)
  const redCards = allPlayersWithStats
    .filter((p) => (p.red_cards || 0) > 0)
    .sort((a, b) => (b.red_cards || 0) - (a.red_cards || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      count: player.red_cards || 0,
      rank: idx + 1,
    }));

  return {
    playersWithStats: allPlayersWithStats,
    topScorers,
    topAssists,
    topMVPs,
    playerOfTheTournament,
    yellowCards,
    redCards,
  };
}

/**
 * Calculates Automatic MVP for a specific match following official rules:
 * Rule 1: Winning team priority! (If match has a winner, MVP MUST come from the winning team).
 * Rule 2: Draws evaluate all players across both teams.
 * Rule 3: Weighted fair formula (Goals +5, Assists +3, Clean sheet +4, Yellow -1, Red -4, Own Goal -3).
 */
export function calculateMatchMVP(
  match: Match,
  players: Player[],
  events: MatchEvent[],
  weights = {
    goal: 5,
    assist: 3,
    cleanSheet: 4,
    yellowCard: -1,
    redCard: -4,
  }
) {
  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;

  // Determine winner team
  let winnerTeamId: number | null = match.winner_team_id || null;
  if (!winnerTeamId && (match.status === 'finished' || match.status === 'live')) {
    if (homeScore > awayScore) winnerTeamId = match.home_team_id;
    else if (awayScore > homeScore) winnerTeamId = match.away_team_id;
    else if (match.home_penalties != null && match.away_penalties != null) {
      if (Number(match.home_penalties) > Number(match.away_penalties)) winnerTeamId = match.home_team_id;
      else if (Number(match.away_penalties) > Number(match.home_penalties)) winnerTeamId = match.away_team_id;
    }
  }

  // Get all players for both participating teams
  const matchPlayers = players.filter(
    (p) => p.team_id === match.home_team_id || p.team_id === match.away_team_id
  );

  const scoresMap: Record<
    number,
    {
      player: Player;
      score: number;
      isWinner: boolean;
      breakdown: {
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        ownGoals: number;
        cleanSheet: boolean;
      };
    }
  > = {};

  for (const p of matchPlayers) {
    const isWinner = winnerTeamId ? p.team_id === winnerTeamId : false;
    scoresMap[p.id] = {
      player: p,
      score: 0,
      isWinner,
      breakdown: {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        ownGoals: 0,
        cleanSheet: false,
      },
    };

    // Clean sheet bonus: if team conceded 0 in a finished match
    if (match.status === 'finished' || match.status === 'live') {
      const conceded = p.team_id === match.home_team_id ? awayScore : homeScore;
      if (conceded === 0) {
        scoresMap[p.id].score += weights.cleanSheet;
        scoresMap[p.id].breakdown.cleanSheet = true;
      }
    }
  }

  // Process match events
  for (const ev of events) {
    if (ev.event_type === 'goal') {
      if (ev.sub_type === 'own_goal') {
        if (scoresMap[ev.player_id]) {
          scoresMap[ev.player_id].score -= 3;
          scoresMap[ev.player_id].breakdown.ownGoals += 1;
        }
      } else {
        if (scoresMap[ev.player_id]) {
          scoresMap[ev.player_id].score += weights.goal;
          scoresMap[ev.player_id].breakdown.goals += 1;
        }
        if (ev.assister_id && scoresMap[ev.assister_id]) {
          scoresMap[ev.assister_id].score += weights.assist;
          scoresMap[ev.assister_id].breakdown.assists += 1;
        }
      }
    } else if (ev.event_type === 'assist' && scoresMap[ev.player_id]) {
      scoresMap[ev.player_id].score += weights.assist;
      scoresMap[ev.player_id].breakdown.assists += 1;
    } else if (ev.event_type === 'yellow_card' && scoresMap[ev.player_id]) {
      scoresMap[ev.player_id].score += weights.yellowCard;
      scoresMap[ev.player_id].breakdown.yellowCards += 1;
    } else if (ev.event_type === 'red_card' && scoresMap[ev.player_id]) {
      scoresMap[ev.player_id].score += weights.redCard;
      scoresMap[ev.player_id].breakdown.redCards += 1;
    }
  }

  const allScores = Object.values(scoresMap);

  // RULE 1: WINNING TEAM PREFERENCE!
  // If match has a winner, ONLY players from the winning team are eligible for the Automatic MVP!
  let eligibleCandidates = allScores;
  if (winnerTeamId !== null) {
    const winningCandidates = allScores.filter((c) => c.player.team_id === winnerTeamId);
    if (winningCandidates.length > 0) {
      eligibleCandidates = winningCandidates;
    }
  }

  // Sort candidates by score descending
  eligibleCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.breakdown.goals !== a.breakdown.goals) return b.breakdown.goals - a.breakdown.goals;
    if (b.breakdown.assists !== a.breakdown.assists) return b.breakdown.assists - a.breakdown.assists;
    if (b.player.is_captain !== a.player.is_captain) return b.player.is_captain ? 1 : -1;
    return a.player.name.localeCompare(b.player.name);
  });

  const bestCandidate = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;

  return {
    mvpPlayerId: bestCandidate ? bestCandidate.player.id : null,
    mvpScore: bestCandidate ? bestCandidate.score : 0,
    topScore: bestCandidate ? bestCandidate.score : 0,
    bestCandidate,
    winnerTeamId,
    rankings: eligibleCandidates,
    sortedCandidates: eligibleCandidates,
    allScores,
  };
}

/**
 * Checks if the group stage is 100% complete
 */
export function isGroupStageComplete(matches: Match[]): boolean {
  const groupMatches = matches.filter((m) => m.stage === 'group');
  if (groupMatches.length === 0) return false;
  return groupMatches.every((m) => m.status === 'finished');
}

/**
 * Returns the 5 starter coordinate slots for 5-a-side pitch formations
 */
export function getFormationSlots(formation = '1-2-1') {
  switch (formation) {
    case '2-2':
      return [
        { slot_id: 'gk', slot_type: 'starter' as const, position_label: 'GK', pitch_x: 50, pitch_y: 86 },
        { slot_id: 'def_1', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 28, pitch_y: 62 },
        { slot_id: 'def_2', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 72, pitch_y: 62 },
        { slot_id: 'fwd_1', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 28, pitch_y: 24 },
        { slot_id: 'fwd_2', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 72, pitch_y: 24 },
      ];
    case '1-1-2':
      return [
        { slot_id: 'gk', slot_type: 'starter' as const, position_label: 'GK', pitch_x: 50, pitch_y: 86 },
        { slot_id: 'def_1', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 50, pitch_y: 66 },
        { slot_id: 'mid_1', slot_type: 'starter' as const, position_label: 'MID', pitch_x: 50, pitch_y: 44 },
        { slot_id: 'fwd_1', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 28, pitch_y: 22 },
        { slot_id: 'fwd_2', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 72, pitch_y: 22 },
      ];
    case '2-1-1':
      return [
        { slot_id: 'gk', slot_type: 'starter' as const, position_label: 'GK', pitch_x: 50, pitch_y: 86 },
        { slot_id: 'def_1', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 28, pitch_y: 64 },
        { slot_id: 'def_2', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 72, pitch_y: 64 },
        { slot_id: 'mid_1', slot_type: 'starter' as const, position_label: 'MID', pitch_x: 50, pitch_y: 42 },
        { slot_id: 'fwd_1', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 50, pitch_y: 20 },
      ];
    case '1-2-1':
    default:
      return [
        { slot_id: 'gk', slot_type: 'starter' as const, position_label: 'GK', pitch_x: 50, pitch_y: 86 },
        { slot_id: 'def_1', slot_type: 'starter' as const, position_label: 'DEF', pitch_x: 50, pitch_y: 65 },
        { slot_id: 'mid_1', slot_type: 'starter' as const, position_label: 'MID', pitch_x: 22, pitch_y: 44 },
        { slot_id: 'mid_2', slot_type: 'starter' as const, position_label: 'MID', pitch_x: 78, pitch_y: 44 },
        { slot_id: 'fwd_1', slot_type: 'starter' as const, position_label: 'FWD', pitch_x: 50, pitch_y: 20 },
      ];
  }
}

/**
 * Suggests the 7 players (5 starting + 2 substitutes) based on tournament performance
 */
export function suggestTeamOfTournament(players: Player[], formation = '1-2-1'): TeamOfTournamentData {
  const sorted = [...players].sort((a, b) => (b.overall_points || 0) - (a.overall_points || 0));
  const slots = getFormationSlots(formation);
  const usedIds = new Set<number>();

  const starters: TeamOfTournamentPlayer[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const candidate = sorted.find((p) => !usedIds.has(p.id)) || sorted[0];
    if (candidate) {
      usedIds.add(candidate.id);
      starters.push({
        slot_id: slot.slot_id,
        slot_type: 'starter',
        position_label: slot.position_label,
        pitch_x: slot.pitch_x,
        pitch_y: slot.pitch_y,
        player_id: candidate.id,
        player_name: candidate.name,
        player_team_id: candidate.team_id,
        player_team_name: candidate.team_name || 'Team',
        goals: candidate.goals || 0,
        assists: candidate.assists || 0,
        mvps: candidate.mvps || 0,
        points: candidate.overall_points || 0,
      });
    }
  }

  const substitutes: TeamOfTournamentPlayer[] = [];
  const subSlots = [
    { slot_id: 'sub_1', position_label: 'SUB 1' },
    { slot_id: 'sub_2', position_label: 'SUB 2' },
  ];

  for (const s of subSlots) {
    const candidate = sorted.find((p) => !usedIds.has(p.id)) || sorted[0];
    if (candidate) {
      usedIds.add(candidate.id);
      substitutes.push({
        slot_id: s.slot_id,
        slot_type: 'substitute',
        position_label: s.position_label,
        pitch_x: 0,
        pitch_y: 0,
        player_id: candidate.id,
        player_name: candidate.name,
        player_team_id: candidate.team_id,
        player_team_name: candidate.team_name || 'Team',
        goals: candidate.goals || 0,
        assists: candidate.assists || 0,
        mvps: candidate.mvps || 0,
        points: candidate.overall_points || 0,
      });
    }
  }

  return {
    formation,
    starters,
    substitutes,
  };
}

