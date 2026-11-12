import { Team, Player, Match, GroupId, StandingRow, MatchEvent, MatchGuest, TeamOfTournamentData, TeamOfTournamentPlayer } from './types';

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

/** Jokers / guests recorded on a match, with the side they played for. */
export function getMatchGuests(m: Match): MatchGuest[] {
  if (Array.isArray(m.guests)) return m.guests;
  const raw = (m as unknown as { guests_json?: string | null }).guests_json;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g) => g && Number(g.player_id) > 0 && Number(g.team_id) > 0)
      .map((g) => ({ player_id: Number(g.player_id), team_id: Number(g.team_id) }));
  } catch {
    return [];
  }
}

/**
 * Goalkeeper of one side in one match: the keeper chosen for that match,
 * otherwise the team's usual keeper.
 */
export function getMatchGoalkeeperId(
  m: Match,
  side: 'home' | 'away',
  players: Player[],
  teams?: Team[]
): number | null {
  const explicit = side === 'home' ? m.home_gk_id : m.away_gk_id;
  if (explicit) return Number(explicit);
  const teamId = side === 'home' ? m.home_team_id : m.away_team_id;
  if (!teamId) return null;
  const team = teams?.find((t) => t.id === teamId);
  if (team?.goalkeeper_id) return team.goalkeeper_id;
  return (
    players.find((p) => p.team_id === teamId && !p.is_joker && (p.is_goalkeeper || p.position === 'Goalkeeper'))?.id ??
    null
  );
}

/**
 * Aggregates player stats: Goals, Assists, Cards from match events
 */
export function aggregatePlayerStats(
  players: Player[],
  teams: Team[],
  matches: Match[],
  customWeights?: Record<string, number>,
  customMinAppearances: number = 3
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
      clean_sheets: 0,
      goals_conceded: 0,
      matches_as_gk: 0,
      gk_goals: 0,
      gk_assists: 0,
      saves: 0,
      penalty_saves: 0,
      overall_points: 0,
      nicknames: [],
    };
  });

  // Track assists to avoid double-counting between linked events
  const countedAssists = new Set<string>();

  // Per-match goalkeepers and the teams each joker has played for
  const matchKeepers: Record<number, { home: number | null; away: number | null }> = {};
  const guestTeams: Record<number, Set<string>> = {};

  // Collect all events, appearances, and MVPs from matches
  for (const m of matches) {
    // Who kept goal for each side in this match, and which jokers played.
    const guests = getMatchGuests(m);
    const guestIds = new Set(guests.map((g) => g.player_id));
    const homeGKId = getMatchGoalkeeperId(m, 'home', players, teams);
    const awayGKId = getMatchGoalkeeperId(m, 'away', players, teams);
    matchKeepers[m.id] = { home: homeGKId, away: awayGKId };

    // Jokers: remember which teams they turned out for.
    for (const g of guests) {
      const name = teamMap[g.team_id]?.name;
      if (name && playerMap[g.player_id]) {
        if (!guestTeams[g.player_id]) guestTeams[g.player_id] = new Set();
        guestTeams[g.player_id].add(name);
      }
    }

    if (m.status === 'finished') {
      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;

      // Appearances. Squad members: every finished match of their team.
      // Jokers: only the matches they were actually part of.
      const involved = new Set<number>(guestIds);
      for (const ev of m.events || []) {
        involved.add(ev.player_id);
        if (ev.assister_id) involved.add(ev.assister_id);
      }
      if (homeGKId) involved.add(homeGKId);
      if (awayGKId) involved.add(awayGKId);

      players.forEach((p) => {
        if (!playerMap[p.id]) return;
        const inSquad = !p.is_joker && (p.team_id === m.home_team_id || p.team_id === m.away_team_id);
        const asGuest = (p.is_joker || guestIds.has(p.id)) && involved.has(p.id);
        if (inSquad || asGuest) {
          playerMap[p.id].matches_played = (playerMap[p.id].matches_played || 0) + 1;
        }
      });

      // Goalkeepers: clean sheets, goals conceded, saves and penalty saves.
      const creditKeeper = (gkId: number | null, conceded: number, saves: number, penSaves: number) => {
        if (!gkId || !playerMap[gkId]) return;
        const gk = playerMap[gkId];
        gk.matches_as_gk = (gk.matches_as_gk || 0) + 1;
        gk.goals_conceded = (gk.goals_conceded || 0) + conceded;
        gk.saves = (gk.saves || 0) + saves;
        gk.penalty_saves = (gk.penalty_saves || 0) + penSaves;
        if (conceded === 0) gk.clean_sheets = (gk.clean_sheets || 0) + 1;
      };
      creditKeeper(homeGKId, awayScore, Number(m.home_saves) || 0, Number(m.home_pen_saves) || 0);
      creditKeeper(awayGKId, homeScore, Number(m.away_saves) || 0, Number(m.away_pen_saves) || 0);

      // Defenders share clean sheets (the keeper is credited above).
      const creditDefenders = (teamId: number, conceded: number, gkId: number | null) => {
        if (conceded !== 0) return;
        players
          .filter((p) => p.team_id === teamId && p.position === 'Defender' && p.id !== gkId)
          .forEach((def) => {
            if (playerMap[def.id]) playerMap[def.id].clean_sheets = (playerMap[def.id].clean_sheets || 0) + 1;
          });
      };
      creditDefenders(m.home_team_id, awayScore, homeGKId);
      creditDefenders(m.away_team_id, homeScore, awayGKId);
    }

    if (m.mvp_player_id && playerMap[m.mvp_player_id]) {
      playerMap[m.mvp_player_id].mvps = (playerMap[m.mvp_player_id].mvps || 0) + 1;
    }

    if (!m.events) continue;
    const isKeeperHere = (playerId: number) => playerId === homeGKId || playerId === awayGKId;
    for (const ev of m.events) {
      const p = playerMap[ev.player_id];

      // Goal handling: Own goals do NOT count toward the scorer's goal tally
      if (ev.event_type === 'goal') {
        if (ev.sub_type !== 'own_goal' && p) {
          p.goals = (p.goals || 0) + 1;
          if (isKeeperHere(ev.player_id)) p.gk_goals = (p.gk_goals || 0) + 1;
        }

        // Direct assist on goal event
        if (ev.assister_id && playerMap[ev.assister_id]) {
          const assistKey = `goal-${ev.id || m.id}-${ev.assister_id}-${ev.minute || 0}`;
          if (!countedAssists.has(assistKey)) {
            countedAssists.add(assistKey);
            const assister = playerMap[ev.assister_id];
            assister.assists = (assister.assists || 0) + 1;
            if (isKeeperHere(ev.assister_id)) assister.gk_assists = (assister.gk_assists || 0) + 1;
          }
        }
      } else if (ev.event_type === 'assist' && p) {
        const assistKey = `assist-${ev.id || m.id}-${ev.player_id}-${ev.minute || 0}`;
        if (!countedAssists.has(assistKey)) {
          countedAssists.add(assistKey);
          p.assists = (p.assists || 0) + 1;
          if (isKeeperHere(ev.player_id)) p.gk_assists = (p.gk_assists || 0) + 1;
        }
      } else if (ev.event_type === 'yellow_card' && p) {
        p.yellow_cards = (p.yellow_cards || 0) + 1;
      } else if (ev.event_type === 'red_card' && p) {
        p.red_cards = (p.red_cards || 0) + 1;
      }
    }
  }

  const allPlayersWithStats = Object.values(playerMap);

  // Scoring Weights Configuration
  const weights = {
    goal: customWeights?.goal ?? 4,
    assist: customWeights?.assist ?? 3,
    motm: customWeights?.motm ?? 3,
    gk_clean_sheet: customWeights?.gk_clean_sheet ?? 4,
    def_clean_sheet: customWeights?.def_clean_sheet ?? 2,
    yellow_card: customWeights?.yellow_card ?? -1,
    red_card: customWeights?.red_card ?? -3,
    // Goalkeeper bonuses: a goal or assist by the keeper is worth far more
    gk_goal: customWeights?.gk_goal ?? 15,
    gk_assist: customWeights?.gk_assist ?? 6,
    gk_save: customWeights?.gk_save ?? 1,
    gk_penalty_save: customWeights?.gk_penalty_save ?? 5,
  };

  // Jokers show the teams they guested for instead of the hidden squad's name
  for (const p of allPlayersWithStats) {
    if (!p.is_joker) continue;
    p.guest_teams = guestTeams[p.id] ? Array.from(guestTeams[p.id]) : [];
    p.team_name = p.guest_teams.length > 0 ? `Joker · ${p.guest_teams.join(' / ')}` : 'Joker';
  }

  // Calculate Ratios and Overall Performance Points
  for (const p of allPlayersWithStats) {
    p.goals_per_match = (p.matches_played || 0) > 0 ? Number(((p.goals || 0) / p.matches_played!).toFixed(2)) : 0;
    p.assists_per_match = (p.matches_played || 0) > 0 ? Number(((p.assists || 0) / p.matches_played!).toFixed(2)) : 0;
    p.clean_sheet_percentage = (p.matches_as_gk || 0) > 0 ? Number((((p.clean_sheets || 0) / p.matches_as_gk!) * 100).toFixed(1)) : 0;
    p.goals_conceded_per_match = (p.matches_as_gk || 0) > 0 ? Number(((p.goals_conceded || 0) / p.matches_as_gk!).toFixed(2)) : 0;

    // Anyone who actually kept goal in a match counts as a keeper for these bonuses.
    const isGK = (p.matches_as_gk || 0) > 0 || p.is_goalkeeper || p.position === 'Goalkeeper';
    const isDEF = !isGK && p.position === 'Defender';
    const gkCleanSheetPoints = isGK ? (p.clean_sheets || 0) * weights.gk_clean_sheet : 0;
    const defCleanSheetPoints = isDEF ? (p.clean_sheets || 0) * weights.def_clean_sheet : 0;

    // Goals / assists made while in goal use the keeper weights, the rest the normal ones.
    const gkGoals = Math.min(p.gk_goals || 0, p.goals || 0);
    const gkAssists = Math.min(p.gk_assists || 0, p.assists || 0);

    p.overall_points = Math.max(
      0,
      ((p.goals || 0) - gkGoals) * weights.goal +
        gkGoals * weights.gk_goal +
        ((p.assists || 0) - gkAssists) * weights.assist +
        gkAssists * weights.gk_assist +
        (p.saves || 0) * weights.gk_save +
        (p.penalty_saves || 0) * weights.gk_penalty_save +
        (p.mvps || 0) * weights.motm +
        gkCleanSheetPoints +
        defCleanSheetPoints +
        (p.matches_played || 0) * 1 +
        (p.yellow_cards || 0) * weights.yellow_card +
        (p.red_cards || 0) * weights.red_card
    );
  }
  void matchKeepers;

  // 1. Golden Boot: Top scorers (goals > 0, excluding own goals)
  const topScorers = allPlayersWithStats
    .filter((p) => (p.goals || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.goals_per_match || 0) - (a.goals_per_match || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      goals: player.goals || 0,
      appearances: player.matches_played || 0,
      goals_per_match: player.goals_per_match || 0,
      rank: idx + 1,
    }));

  // 2. Best Playmaker: Top assists (assists > 0)
  const topAssists = allPlayersWithStats
    .filter((p) => (p.assists || 0) > 0)
    .sort((a, b) => (b.assists || 0) - (a.assists || 0) || (b.assists_per_match || 0) - (a.assists_per_match || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      assists: player.assists || 0,
      appearances: player.matches_played || 0,
      assists_per_match: player.assists_per_match || 0,
      rank: idx + 1,
    }));

  // 3. Most Man of the Match (MVPs)
  const topMVPs = allPlayersWithStats
    .filter((p) => (p.mvps || 0) > 0)
    .sort((a, b) => (b.mvps || 0) - (a.mvps || 0) || (a.matches_played || 0) - (b.matches_played || 0) || a.name.localeCompare(b.name))
    .map((player, idx) => ({
      player,
      mvps: player.mvps || 0,
      appearances: player.matches_played || 0,
      rank: idx + 1,
    }));

  // 4. Best Goalkeeper Ranking
  const allGoalkeepers = allPlayersWithStats.filter(
    (p) => (p.matches_as_gk || 0) > 0 || (!p.is_joker && (p.is_goalkeeper || p.position === 'Goalkeeper'))
  );

  const bestGoalkeepers = allGoalkeepers
    .sort((a, b) => {
      // 1. Clean sheets
      if ((b.clean_sheets || 0) !== (a.clean_sheets || 0)) return (b.clean_sheets || 0) - (a.clean_sheets || 0);
      // 2. Clean sheet percentage
      if ((b.clean_sheet_percentage || 0) !== (a.clean_sheet_percentage || 0)) return (b.clean_sheet_percentage || 0) - (a.clean_sheet_percentage || 0);
      // 3. Goals conceded per match (lower is better)
      if ((a.goals_conceded_per_match || 0) !== (b.goals_conceded_per_match || 0)) return (a.goals_conceded_per_match || 0) - (b.goals_conceded_per_match || 0);
      // 4. Penalty saves, then great saves
      if ((b.penalty_saves || 0) !== (a.penalty_saves || 0)) return (b.penalty_saves || 0) - (a.penalty_saves || 0);
      if ((b.saves || 0) !== (a.saves || 0)) return (b.saves || 0) - (a.saves || 0);
      return (b.matches_as_gk || 0) - (a.matches_as_gk || 0);
    })
    .map((player, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : null;
      const next = idx < arr.length - 1 ? arr[idx + 1] : null;
      const is_tied = Boolean(
        (prev && prev.clean_sheets === player.clean_sheets && prev.goals_conceded === player.goals_conceded) ||
        (next && next.clean_sheets === player.clean_sheets && next.goals_conceded === player.goals_conceded)
      );

      return {
        player,
        clean_sheets: player.clean_sheets || 0,
        goals_conceded: player.goals_conceded || 0,
        clean_sheet_percentage: player.clean_sheet_percentage || 0,
        penalty_saves: player.penalty_saves || 0,
        appearances: player.matches_as_gk || player.matches_played || 0,
        rank: idx + 1,
        is_tied,
      };
    });

  // 5. Most Clean Sheets Ranking
  const cleanSheetsLeaderboard = [...allGoalkeepers]
    .sort((a, b) => {
      if ((b.clean_sheets || 0) !== (a.clean_sheets || 0)) return (b.clean_sheets || 0) - (a.clean_sheets || 0);
      if ((b.clean_sheet_percentage || 0) !== (a.clean_sheet_percentage || 0)) return (b.clean_sheet_percentage || 0) - (a.clean_sheet_percentage || 0);
      return (b.matches_as_gk || 0) - (a.matches_as_gk || 0);
    })
    .map((player, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : null;
      const next = idx < arr.length - 1 ? arr[idx + 1] : null;
      const is_tied = Boolean(
        (prev && prev.clean_sheets === player.clean_sheets) ||
        (next && next.clean_sheets === player.clean_sheets)
      );

      return {
        player,
        clean_sheets: player.clean_sheets || 0,
        matches_as_gk: player.matches_as_gk || player.matches_played || 0,
        clean_sheet_percentage: player.clean_sheet_percentage || 0,
        rank: idx + 1,
        is_tied,
      };
    });

  // 6. Player of the Tournament (with min 3 appearances eligibility check)
  const minApps = customMinAppearances;
  const playerOfTheTournament = allPlayersWithStats
    .filter((p) => (p.overall_points || 0) > 0 || (p.mvps || 0) > 0 || (p.goals || 0) > 0)
    .sort((a, b) => {
      const aEligible = (a.matches_played || 0) >= minApps;
      const bEligible = (b.matches_played || 0) >= minApps;
      if (aEligible !== bEligible) return aEligible ? -1 : 1;
      if ((b.overall_points || 0) !== (a.overall_points || 0)) {
        return (b.overall_points || 0) - (a.overall_points || 0);
      }
      if ((b.mvps || 0) !== (a.mvps || 0)) return (b.mvps || 0) - (a.mvps || 0);
      if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
      return a.name.localeCompare(b.name);
    })
    .map((player, idx) => ({
      player,
      points: player.overall_points || 0,
      rank: idx + 1,
      goals: player.goals || 0,
      assists: player.assists || 0,
      mvps: player.mvps || 0,
      appearances: player.matches_played || 0,
      is_eligible: (player.matches_played || 0) >= minApps,
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
    bestGoalkeepers,
    cleanSheetsLeaderboard,
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
 * Rule 4: Goalkeepers are rated on a keeper's job: clean sheet +12, each great save +1,
 *         penalty save +4, and a keeper who scores (+10) or assists (+5) is rewarded extra.
 * Jokers (guests) count for the side they played for in this match.
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
    gkGoal: 10,
    gkAssist: 5,
    gkCleanSheet: 12,
    gkSave: 1,
    gkPenaltySave: 4,
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

  // Side each player is on in THIS match: guests play for the team they were added to.
  const guestSide: Record<number, number> = {};
  for (const g of getMatchGuests(match)) guestSide[g.player_id] = g.team_id;
  const sideOf = (p: Player): number | null => {
    if (guestSide[p.id]) return guestSide[p.id];
    if (p.is_joker) return null;
    return p.team_id === match.home_team_id || p.team_id === match.away_team_id ? p.team_id : null;
  };

  const homeGKId = getMatchGoalkeeperId(match, 'home', players);
  const awayGKId = getMatchGoalkeeperId(match, 'away', players);
  const isKeeper = (playerId: number) => playerId === homeGKId || playerId === awayGKId;

  const matchPlayers = players.filter((p) => sideOf(p) !== null);

  const scoresMap: Record<
    number,
    {
      player: Player;
      teamId: number;
      score: number;
      isWinner: boolean;
      isGoalkeeper: boolean;
      breakdown: {
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        ownGoals: number;
        cleanSheet: boolean;
        saves: number;
        penaltySaves: number;
      };
    }
  > = {};

  const matchCounts = match.status === 'finished' || match.status === 'live';

  for (const p of matchPlayers) {
    const teamId = sideOf(p) as number;
    const keeper = isKeeper(p.id);
    scoresMap[p.id] = {
      player: p,
      teamId,
      score: 0,
      isWinner: winnerTeamId ? teamId === winnerTeamId : false,
      isGoalkeeper: keeper,
      breakdown: {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        ownGoals: 0,
        cleanSheet: false,
        saves: 0,
        penaltySaves: 0,
      },
    };

    if (!matchCounts) continue;
    const isHomeSide = teamId === match.home_team_id;

    // Clean sheet bonus: the keeper earns the most for it
    const conceded = isHomeSide ? awayScore : homeScore;
    if (conceded === 0) {
      scoresMap[p.id].score += keeper ? weights.gkCleanSheet : weights.cleanSheet;
      scoresMap[p.id].breakdown.cleanSheet = true;
    }

    // Saves and penalty saves belong to the keeper of that side
    if (keeper) {
      const saves = Number(isHomeSide ? match.home_saves : match.away_saves) || 0;
      const penSaves = Number(isHomeSide ? match.home_pen_saves : match.away_pen_saves) || 0;
      scoresMap[p.id].score += saves * weights.gkSave + penSaves * weights.gkPenaltySave;
      scoresMap[p.id].breakdown.saves = saves;
      scoresMap[p.id].breakdown.penaltySaves = penSaves;
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
          scoresMap[ev.player_id].score += isKeeper(ev.player_id) ? weights.gkGoal : weights.goal;
          scoresMap[ev.player_id].breakdown.goals += 1;
        }
        if (ev.assister_id && scoresMap[ev.assister_id]) {
          scoresMap[ev.assister_id].score += isKeeper(ev.assister_id) ? weights.gkAssist : weights.assist;
          scoresMap[ev.assister_id].breakdown.assists += 1;
        }
      }
    } else if (ev.event_type === 'assist' && scoresMap[ev.player_id]) {
      scoresMap[ev.player_id].score += isKeeper(ev.player_id) ? weights.gkAssist : weights.assist;
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
    const winningCandidates = allScores.filter((c) => c.teamId === winnerTeamId);
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
 * Suggests the 7 players (5 starting + 2 substitutes) based on tournament performance and positions
 */
export function suggestTeamOfTournament(players: Player[], formation = '1-2-1'): TeamOfTournamentData {
  const sorted = [...players].sort((a, b) => (b.overall_points || 0) - (a.overall_points || 0));
  const slots = getFormationSlots(formation);
  const usedIds = new Set<number>();

  const starters: TeamOfTournamentPlayer[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    let candidate: Player | undefined;

    if (slot.position_label === 'GK') {
      candidate = sorted.find(
        (p) => !usedIds.has(p.id) && (p.is_goalkeeper || (p.matches_as_gk || 0) > 0)
      );
    }

    // Outfield players: choose top performing players
    if (!candidate) {
      candidate = sorted.find((p) => !usedIds.has(p.id)) || sorted[0];
    }

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

