import { Team, Player, Match, GroupId, StandingRow, MatchEvent } from './types';

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
      yellow_cards: 0,
      red_cards: 0,
      mvps: 0,
      nicknames: [],
    };
  });

  // Collect all events and MVPs from matches
  for (const m of matches) {
    if (m.mvp_player_id && playerMap[m.mvp_player_id]) {
      playerMap[m.mvp_player_id].mvps = (playerMap[m.mvp_player_id].mvps || 0) + 1;
    }

    if (!m.events) continue;
    for (const ev of m.events) {
      const p = playerMap[ev.player_id];
      if (!p) continue;

      if (ev.event_type === 'goal') {
        p.goals = (p.goals || 0) + 1;
      } else if (ev.event_type === 'assist') {
        p.assists = (p.assists || 0) + 1;
      } else if (ev.event_type === 'yellow_card') {
        p.yellow_cards = (p.yellow_cards || 0) + 1;
      } else if (ev.event_type === 'red_card') {
        p.red_cards = (p.red_cards || 0) + 1;
      }
    }
  }

  const allPlayersWithStats = Object.values(playerMap);

  // Top scorers (goals > 0)
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
    yellowCards,
    redCards,
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

