import db, { initDatabase, logActivity } from './db';
import {
  calculateGroupStandings,
  calculateBestSecondPlace,
  aggregatePlayerStats,
  calculateMatchMVP,
  isGroupStageComplete,
  suggestTeamOfTournament,
} from './calculations';
import {
  Team,
  Player,
  Match,
  MatchEvent,
  TournamentRule,
  TournamentData,
  GroupId,
  StandingRow,
  ActivityLog,
  AwardKey,
  AwardStatus,
  AwardItem,
  TournamentAwardsState,
} from './types';

// Ensure database is initialized
initDatabase();

export function getFullTournamentData(options?: { isAdmin?: boolean }): TournamentData {
  // 1. Teams
  const teamsRaw = db.prepare(`
    SELECT t.*, p.name as captain_name, gp.name as goalkeeper_name
    FROM teams t
    LEFT JOIN players p ON t.captain_id = p.id
    LEFT JOIN players gp ON t.goalkeeper_id = gp.id
    ORDER BY t.group_id ASC, t.name ASC
  `).all() as any[];

  // 2. Players
  const playersRaw = db.prepare(`
    SELECT p.*, t.name as team_name
    FROM players p
    JOIN teams t ON p.team_id = t.id
    ORDER BY p.team_id ASC, p.is_captain DESC, p.name ASC
  `).all() as any[];

  // Map players into teams
  const playersByTeam: Record<number, Player[]> = {};
  for (const p of playersRaw) {
    if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
    playersByTeam[p.team_id].push({
      ...p,
      is_captain: Boolean(p.is_captain),
      is_goalkeeper: Boolean(p.is_goalkeeper),
      position: p.position || 'Attacker',
    });
  }

  const teams: Team[] = teamsRaw.map((t) => ({
    ...t,
    players: playersByTeam[t.id] || [],
  }));

  // 3. Matches & Events
  const matchesRaw = db.prepare(`
    SELECT m.*,
           ht.name as home_team_name, ht.color as home_team_color,
           at.name as away_team_name, at.color as away_team_color,
           mp.name as mvp_player_name,
           mt.name as mvp_team_name
    FROM matches m
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN players mp ON m.mvp_player_id = mp.id
    LEFT JOIN teams mt ON mp.team_id = mt.id
    ORDER BY CASE 
               WHEN m.stage = 'group' THEN 1 
               WHEN m.stage = 'semi_final' THEN 2 
               WHEN m.stage = 'third_place' THEN 3 
               WHEN m.stage = 'final' THEN 4 
             END ASC, 
             m.matchday ASC, 
             m.id ASC
  `).all() as any[];

  const eventsRaw = db.prepare(`
    SELECT e.*, 
           p.name as player_name, 
           t.name as team_name,
           ap.name as assister_name
    FROM match_events e
    JOIN players p ON e.player_id = p.id
    JOIN teams t ON e.team_id = t.id
    LEFT JOIN players ap ON e.assister_id = ap.id
    ORDER BY COALESCE(e.minute, 999) ASC, e.id ASC
  `).all() as any[];

  const eventsByMatch: Record<number, MatchEvent[]> = {};
  for (const ev of eventsRaw) {
    if (!eventsByMatch[ev.match_id]) eventsByMatch[ev.match_id] = [];
    eventsByMatch[ev.match_id].push(ev);
  }

  const matches: Match[] = matchesRaw.map((m) => ({
    ...m,
    is_time_set: Boolean(m.is_time_set),
    events: eventsByMatch[m.id] || [],
  }));

  // 4. Tournament Rules
  const rules = db.prepare('SELECT * FROM tournament_rules ORDER BY display_order ASC').all() as TournamentRule[];

  // 5. Settings
  const settingsRaw = db.prepare('SELECT * FROM tournament_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const s of settingsRaw) {
    settings[s.key] = s.value;
  }

  const customWeights = {
    goal: Number(settings.mvp_weight_goal ?? 4),
    assist: Number(settings.mvp_weight_assist ?? 3),
    motm: Number(settings.mvp_weight_motm ?? 3),
    gk_clean_sheet: Number(settings.mvp_weight_gk_clean_sheet ?? 4),
    def_clean_sheet: Number(settings.mvp_weight_def_clean_sheet ?? 2),
    yellow_card: Number(settings.mvp_weight_yellow_card ?? -1),
    red_card: Number(settings.mvp_weight_red_card ?? -3),
  };
  const minAppearances = Number(settings.pot_min_appearances ?? 3);

  // 6. Standings & Player Stats
  const standings: Record<GroupId, StandingRow[]> = {
    A: calculateGroupStandings('A', teams, matches),
    B: calculateGroupStandings('B', teams, matches),
    C: calculateGroupStandings('C', teams, matches),
  };

  const best_second = calculateBestSecondPlace(standings);

  const {
    playersWithStats,
    topScorers,
    topAssists,
    topMVPs,
    bestGoalkeepers,
    cleanSheetsLeaderboard,
    playerOfTheTournament,
    yellowCards,
    redCards,
  } = aggregatePlayerStats(
    playersRaw.map((p) => ({
      ...p,
      is_captain: Boolean(p.is_captain),
      is_goalkeeper: Boolean(p.is_goalkeeper),
      position: p.position || 'Attacker',
    })),
    teams,
    matches,
    customWeights,
    minAppearances
  );

  // 7. Summary metrics
  const matchesPlayed = matches.filter((m) => m.status === 'finished').length;
  const matchesRemaining = matches.filter((m) => m.status === 'upcoming' || m.status === 'live').length;

  let totalGoals = 0;
  for (const m of matches) {
    if (m.home_score !== null && m.home_score !== undefined) totalGoals += m.home_score;
    if (m.away_score !== null && m.away_score !== undefined) totalGoals += m.away_score;
  }

  const upcomingMatches = matches
    .filter((m) => (m.status === 'upcoming' || m.status === 'live') && m.is_time_set && m.scheduled_time)
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

  // 8. Awards Management & Server-Side Security
  const awardsRows = db.prepare('SELECT * FROM tournament_awards').all() as any[];
  const awardsRowMap: Record<string, any> = {};
  for (const r of awardsRows) {
    awardsRowMap[r.award_key] = r;
  }

  const awardMeta: Record<AwardKey, { title: string; subtitle: string }> = {
    pot: { title: 'Player of the Tournament', subtitle: 'Official Golden Ball Award 2026' },
    tott: { title: 'Team of the Tournament', subtitle: 'Official Best 7 (5 Starters + 2 Substitutes)' },
    golden_boot: { title: 'Golden Boot', subtitle: 'Tournament Top Goalscorer' },
    best_playmaker: { title: 'Best Playmaker', subtitle: 'Tournament Assist Leader' },
    best_gk: { title: 'Best Goalkeeper', subtitle: 'Golden Glove Award' },
    most_clean_sheets: { title: 'Most Clean Sheets', subtitle: 'Defensive Wall of the Tournament' },
    most_mvps: { title: 'Most Man of the Match Awards', subtitle: 'Tournament Kingpin Award' },
  };

  const awardKeys: AwardKey[] = [
    'pot',
    'tott',
    'golden_boot',
    'best_playmaker',
    'best_gk',
    'most_clean_sheets',
    'most_mvps',
  ];

  const awardItems: AwardItem[] = [];

  for (const key of awardKeys) {
    const row = awardsRowMap[key] || {};
    const meta = awardMeta[key];
    const isLocked = Boolean(row.is_locked || (key === 'pot' && settings.awards_pot_locked === 'true'));
    const isRevealed = Boolean(
      row.is_revealed ||
      (key === 'pot' && settings.awards_pot_revealed === 'true') ||
      (key === 'tott' && settings.awards_tott_revealed === 'true')
    );
    const selectionMode = (row.selection_mode || (key === 'pot' ? (settings.awards_pot_mode || 'auto') : 'auto')) as 'auto' | 'manual';
    const manualWinnerId = row.winner_player_id || (key === 'pot' && settings.awards_pot_player_id ? Number(settings.awards_pot_player_id) : null);

    let candidates: any[] = [];
    let topCandidate: any = null;
    let winner: Player | null = null;
    let dataJson: any = null;

    if (key === 'pot') {
      candidates = playerOfTheTournament;
      topCandidate = playerOfTheTournament.length > 0 ? playerOfTheTournament[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    } else if (key === 'tott') {
      candidates = playersWithStats;
      if (row.data_json) {
        try {
          dataJson = JSON.parse(row.data_json);
        } catch (e) {
          dataJson = null;
        }
      }
      if (!dataJson && settings.awards_tott_data) {
        try {
          dataJson = JSON.parse(settings.awards_tott_data);
        } catch (e) {
          dataJson = null;
        }
      }
      if (!dataJson) {
        dataJson = suggestTeamOfTournament(playersWithStats, '1-2-1');
      }
    } else if (key === 'golden_boot') {
      candidates = topScorers;
      topCandidate = topScorers.length > 0 ? topScorers[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    } else if (key === 'best_playmaker') {
      candidates = topAssists;
      topCandidate = topAssists.length > 0 ? topAssists[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    } else if (key === 'best_gk') {
      candidates = bestGoalkeepers;
      topCandidate = bestGoalkeepers.length > 0 ? bestGoalkeepers[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    } else if (key === 'most_clean_sheets') {
      candidates = cleanSheetsLeaderboard;
      topCandidate = cleanSheetsLeaderboard.length > 0 ? cleanSheetsLeaderboard[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    } else if (key === 'most_mvps') {
      candidates = topMVPs;
      topCandidate = topMVPs.length > 0 ? topMVPs[0].player : null;
      winner = selectionMode === 'manual' && manualWinnerId
        ? playersWithStats.find((p) => p.id === manualWinnerId) || null
        : topCandidate;
    }

    let status: AwardStatus = 'not_started';
    if (isRevealed) {
      status = 'published';
    } else if (isLocked) {
      status = 'locked';
    } else if (winner || (key === 'tott' && dataJson)) {
      status = 'ready';
    } else if (matchesPlayed > 0) {
      status = 'in_progress';
    }

    // Assign official prestige badges when revealed
    if (isRevealed && winner) {
      if (!winner.nicknames) winner.nicknames = [];
      if (key === 'pot' && !winner.nicknames.some((n) => n.title.includes('PLAYER OF THE TOURNAMENT'))) {
        winner.nicknames.unshift({
          title: '👑 PLAYER OF THE TOURNAMENT',
          subtitle: 'Official Golden Ball Winner 2026',
          color: 'amber',
          icon: 'Crown',
        });
      } else if (key === 'golden_boot' && !winner.nicknames.some((n) => n.title.includes('GOLDEN BOOT'))) {
        winner.nicknames.unshift({
          title: '👟 GOLDEN BOOT',
          subtitle: `Top Goalscorer (${winner.goals || 0} Goals)`,
          color: 'amber',
          icon: 'Flame',
        });
      } else if (key === 'best_playmaker' && !winner.nicknames.some((n) => n.title.includes('BEST PLAYMAKER'))) {
        winner.nicknames.unshift({
          title: '🎯 BEST PLAYMAKER',
          subtitle: `Assist King (${winner.assists || 0} Assists)`,
          color: 'emerald',
          icon: 'Award',
        });
      } else if (key === 'best_gk' && !winner.nicknames.some((n) => n.title.includes('BEST GOALKEEPER'))) {
        winner.nicknames.unshift({
          title: '🧤 BEST GOALKEEPER',
          subtitle: 'Golden Glove Award Winner',
          color: 'blue',
          icon: 'Shield',
        });
      } else if (key === 'most_clean_sheets' && !winner.nicknames.some((n) => n.title.includes('MOST CLEAN SHEETS'))) {
        winner.nicknames.unshift({
          title: '🧱 MOST CLEAN SHEETS',
          subtitle: `Tournament Defensive Wall (${winner.clean_sheets || 0} Clean Sheets)`,
          color: 'emerald',
          icon: 'Shield',
        });
      } else if (key === 'most_mvps' && !winner.nicknames.some((n) => n.title.includes('TOURNAMENT KINGPIN'))) {
        winner.nicknames.unshift({
          title: '⭐ TOURNAMENT KINGPIN',
          subtitle: `Most MVP Awards (${winner.mvps || 0} MVPs)`,
          color: 'purple',
          icon: 'Star',
        });
      }
    }

    if (isRevealed && key === 'tott' && dataJson) {
      const tottPlayerIds = new Set([
        ...(dataJson.starters || []).map((p: any) => p.player_id),
        ...(dataJson.substitutes || []).map((p: any) => p.player_id),
      ]);
      playersWithStats.forEach((p) => {
        if (tottPlayerIds.has(p.id)) {
          if (!p.nicknames) p.nicknames = [];
          if (!p.nicknames.some((n) => n.title.includes('TEAM OF THE TOURNAMENT'))) {
            p.nicknames.push({
              title: '⭐ TEAM OF THE TOURNAMENT',
              subtitle: 'Official Best 7 Selection',
              color: 'emerald',
              icon: 'Star',
            });
          }
        }
      });
    }

    // Public Privacy: Never leak unpublished winners, candidates or rankings
    const publicWinner = (isRevealed || options?.isAdmin) ? winner : null;
    const publicDataJson = (isRevealed || options?.isAdmin) ? dataJson : null;
    const publicCandidates = options?.isAdmin ? candidates : [];
    const publicTopCandidate = options?.isAdmin ? topCandidate : null;

    awardItems.push({
      award_key: key,
      title: meta.title,
      subtitle: meta.subtitle,
      winner_player_id: options?.isAdmin ? (winner ? winner.id : null) : (isRevealed && winner ? winner.id : null),
      winner: publicWinner,
      selection_mode: selectionMode,
      is_locked: isLocked,
      is_revealed: isRevealed,
      revealed_at: row.revealed_at || null,
      status,
      data_json: publicDataJson,
      candidates: publicCandidates,
      top_candidate: publicTopCandidate,
    });
  }

  const getAwardItem = (key: AwardKey) => awardItems.find((a) => a.award_key === key)!;
  const potItem = getAwardItem('pot');
  const tottItem = getAwardItem('tott');
  const gbItem = getAwardItem('golden_boot');
  const bpItem = getAwardItem('best_playmaker');
  const bgkItem = getAwardItem('best_gk');
  const mcsItem = getAwardItem('most_clean_sheets');
  const mmvpItem = getAwardItem('most_mvps');

  const awards: TournamentAwardsState = {
    awards_list: awardItems,

    pot_revealed: potItem.is_revealed,
    pot_revealed_at: potItem.revealed_at,
    pot_winner: potItem.winner,
    pot_mode: potItem.selection_mode,
    pot_locked: potItem.is_locked,

    tott_revealed: tottItem.is_revealed,
    tott_revealed_at: tottItem.revealed_at,
    tott_data: tottItem.data_json,

    golden_boot_revealed: gbItem.is_revealed,
    golden_boot_winner: gbItem.winner,

    best_playmaker_revealed: bpItem.is_revealed,
    best_playmaker_winner: bpItem.winner,

    best_gk_revealed: bgkItem.is_revealed,
    best_gk_winner: bgkItem.winner,

    most_clean_sheets_revealed: mcsItem.is_revealed,
    most_clean_sheets_winner: mcsItem.winner,

    most_mvps_revealed: mmvpItem.is_revealed,
    most_mvps_winner: mmvpItem.winner,

    weights: customWeights,
    min_appearances: minAppearances,
  };

  return {
    teams,
    players: playersWithStats,
    matches,
    rules,
    settings,
    standings,
    best_second,
    top_scorers: topScorers,
    top_assists: topAssists,
    top_mvps: topMVPs,
    best_goalkeepers: bestGoalkeepers,
    clean_sheets_leaderboard: cleanSheetsLeaderboard,
    player_of_tournament: (options?.isAdmin || potItem.is_revealed) ? playerOfTheTournament : [],
    awards,
    yellow_cards: yellowCards,
    red_cards: redCards,
    summary: {
      total_teams: teams.length,
      matches_played: matchesPlayed,
      matches_remaining: matchesRemaining,
      total_goals: totalGoals,
      current_stage: settings.current_stage || 'Group Stage',
      next_match: nextMatch,
      discrepancy_resolved: settings.discrepancy_resolved === 'true',
    },
  };
}

export function updateMatchSchedule(
  matchId: number,
  scheduledTime: string,
  venue: string = 'Terrain ENSCS',
  adminUsername: string = 'MAHDIDHMN'
) {
  const match = db.prepare(`
    SELECT m.*, ht.name as home_name, at.name as away_name
    FROM matches m
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ?
  `).get(matchId) as any;

  if (!match) throw new Error('Match not found');

  db.prepare(`
    UPDATE matches
    SET scheduled_time = ?,
        is_time_set = 1,
        venue = COALESCE(?, venue)
    WHERE id = ?
  `).run(scheduledTime, venue, matchId);

  logActivity(
    'SCHEDULE_MATCH',
    `Scheduled match: ${match.home_name || 'TBD'} vs ${match.away_name || 'TBD'} for ${scheduledTime}`,
    adminUsername
  );
}

export function updateMatchResult(
  matchId: number,
  data: {
    home_score: number | null;
    away_score: number | null;
    home_penalties?: number | null;
    away_penalties?: number | null;
    status: string;
    winner_team_id?: number | null;
    mvp_player_id?: number | null;
    mvp_mode?: 'auto' | 'manual' | null;
    mvp_score?: number | null;
    possession_home?: number | null;
    possession_away?: number | null;
    shots_home?: number | null;
    shots_away?: number | null;
    shots_on_target_home?: number | null;
    shots_on_target_away?: number | null;
    fouls_home?: number | null;
    fouls_away?: number | null;
    events: Array<{
      player_id: number;
      team_id: number;
      event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
      sub_type?: 'normal' | 'penalty' | 'own_goal' | null;
      minute?: number | null;
      detail?: string | null;
      assister_id?: number | null;
    }>;
  },
  adminUsername: string
) {
  const match = db.prepare(`
    SELECT m.*, ht.name as home_name, at.name as away_name
    FROM matches m
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ?
  `).get(matchId) as any;

  if (!match) throw new Error('Match not found');

  const transaction = db.transaction(() => {
    let finalMvpPlayerId = data.mvp_player_id !== undefined ? data.mvp_player_id : match.mvp_player_id;
    let finalMvpScore = data.mvp_score !== undefined ? data.mvp_score : match.mvp_score;
    const mvpMode = data.mvp_mode || match.mvp_mode || 'auto';

    // Calculate Automatic MVP if in auto mode
    if (mvpMode === 'auto' && (data.status === 'finished' || data.status === 'live')) {
      const matchObj: Match = {
        ...match,
        home_score: data.home_score,
        away_score: data.away_score,
        home_penalties: data.home_penalties,
        away_penalties: data.away_penalties,
        status: data.status as any,
        winner_team_id: data.winner_team_id,
      };

      const matchPlayers = db.prepare('SELECT * FROM players WHERE team_id IN (?, ?)').all(
        match.home_team_id,
        match.away_team_id
      ) as Player[];

      const formattedEvents: MatchEvent[] = (data.events || []).map((e, idx) => ({
        id: idx + 1,
        match_id: matchId,
        team_id: e.team_id,
        player_id: e.player_id,
        event_type: e.event_type,
        sub_type: e.sub_type || 'normal',
        minute: e.minute,
        detail: e.detail,
        assister_id: e.assister_id,
      }));

      const mvpRes = calculateMatchMVP(matchObj, matchPlayers, formattedEvents);
      finalMvpPlayerId = mvpRes.mvpPlayerId;
      finalMvpScore = mvpRes.mvpScore;
    }

    // 1. Update Match record
    db.prepare(`
      UPDATE matches
      SET home_score = ?,
          away_score = ?,
          home_penalties = ?,
          away_penalties = ?,
          status = ?,
          winner_team_id = ?,
          mvp_player_id = ?,
          mvp_mode = ?,
          mvp_score = ?,
          possession_home = ?,
          possession_away = ?,
          shots_home = ?,
          shots_away = ?,
          shots_on_target_home = ?,
          shots_on_target_away = ?,
          fouls_home = ?,
          fouls_away = ?
      WHERE id = ?
    `).run(
      data.home_score,
      data.away_score,
      data.home_penalties || null,
      data.away_penalties || null,
      data.status,
      data.winner_team_id || null,
      finalMvpPlayerId || null,
      mvpMode,
      finalMvpScore || null,
      data.possession_home !== undefined && data.possession_home !== null ? Number(data.possession_home) : null,
      data.possession_away !== undefined && data.possession_away !== null ? Number(data.possession_away) : null,
      data.shots_home !== undefined && data.shots_home !== null ? Number(data.shots_home) : null,
      data.shots_away !== undefined && data.shots_away !== null ? Number(data.shots_away) : null,
      data.shots_on_target_home !== undefined && data.shots_on_target_home !== null ? Number(data.shots_on_target_home) : null,
      data.shots_on_target_away !== undefined && data.shots_on_target_away !== null ? Number(data.shots_on_target_away) : null,
      data.fouls_home !== undefined && data.fouls_home !== null ? Number(data.fouls_home) : null,
      data.fouls_away !== undefined && data.fouls_away !== null ? Number(data.fouls_away) : null,
      matchId
    );

    // 2. Clear old events for this match
    db.prepare('DELETE FROM match_events WHERE match_id = ?').run(matchId);

    // 3. Insert new events
    if (data.events && data.events.length > 0) {
      const insertEvent = db.prepare(`
        INSERT INTO match_events (match_id, team_id, player_id, event_type, sub_type, minute, detail, assister_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ev of data.events) {
        insertEvent.run(
          matchId,
          ev.team_id,
          ev.player_id,
          ev.event_type,
          ev.sub_type || 'normal',
          ev.minute || null,
          ev.detail || null,
          ev.assister_id || null
        );
      }
    }

    // 4. If this is a semi-final that just finished, check if we can populate Final or 3rd Place!
    if (match.stage === 'semi_final' && data.status === 'finished') {
      checkAndAdvanceKnockout();
    }

    // 5. Activity log
    logActivity(
      'UPDATE_MATCH_RESULT',
      `Result and events entered for ${match.home_name || 'TBD'} vs ${match.away_name || 'TBD'}: ${data.home_score ?? 0} - ${data.away_score ?? 0} (${data.status}) [MVP: #${finalMvpPlayerId || 'None'} / ${mvpMode}]`,
      adminUsername
    );
  });

  transaction();
}

/**
 * Checks finished semi-finals and places winners in Final, losers in 3rd place match
 */
export function checkAndAdvanceKnockout() {
  const sfMatches = db.prepare(`
    SELECT * FROM matches WHERE stage = 'semi_final' ORDER BY id ASC
  `).all() as any[];

  if (sfMatches.length >= 2 && sfMatches[0].status === 'finished' && sfMatches[1].status === 'finished') {
    const getWinnerAndLoser = (m: any) => {
      let winnerId = m.winner_team_id;
      let loserId = null;
      if (!winnerId) {
        if (m.home_score > m.away_score) {
          winnerId = m.home_team_id;
          loserId = m.away_team_id;
        } else if (m.away_score > m.home_score) {
          winnerId = m.away_team_id;
          loserId = m.home_team_id;
        } else if ((m.home_penalties || 0) > (m.away_penalties || 0)) {
          winnerId = m.home_team_id;
          loserId = m.away_team_id;
        } else {
          winnerId = m.away_team_id;
          loserId = m.home_team_id;
        }
      } else {
        loserId = winnerId === m.home_team_id ? m.away_team_id : m.home_team_id;
      }
      return { winnerId, loserId };
    };

    const sf1 = getWinnerAndLoser(sfMatches[0]);
    const sf2 = getWinnerAndLoser(sfMatches[1]);

    // Update Final
    const finalMatch = db.prepare(`SELECT id FROM matches WHERE stage = 'final' LIMIT 1`).get() as any;
    if (finalMatch) {
      db.prepare(`UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?`).run(
        sf1.winnerId,
        sf2.winnerId,
        finalMatch.id
      );
    }

    // Update 3rd Place Match
    const thirdMatch = db.prepare(`SELECT id FROM matches WHERE stage = 'third_place' LIMIT 1`).get() as any;
    if (thirdMatch) {
      db.prepare(`UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?`).run(
        sf1.loserId,
        sf2.loserId,
        thirdMatch.id
      );
    }
  }
}

/**
 * Automatically populates the Knockout Bracket once Group Stage is complete
 */
export function autoPopulateKnockoutStage(adminUsername: string) {
  const fullData = getFullTournamentData();
  const groupA = fullData.standings.A;
  const groupB = fullData.standings.B;
  const groupC = fullData.standings.C;
  const bestSecond = fullData.best_second;

  if (!groupA.length || !groupB.length || !groupC.length || !bestSecond.length) {
    throw new Error('Group standings are incomplete.');
  }

  const team1A = groupA[0].team_id;
  const team1B = groupB[0].team_id;
  const team1C = groupC[0].team_id;
  const teamBest2nd = bestSecond[0].team_id;

  const sfMatches = db.prepare(`SELECT id FROM matches WHERE stage = 'semi_final' ORDER BY id ASC`).all() as any[];

  if (sfMatches.length < 2) {
    throw new Error('Semi-final fixtures are missing.');
  }

  // SF1: 1st Group A vs Best 2nd Place
  // SF2: 1st Group B vs 1st Group C
  db.prepare(`UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?`).run(
    team1A,
    teamBest2nd,
    sfMatches[0].id
  );

  db.prepare(`UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?`).run(
    team1B,
    team1C,
    sfMatches[1].id
  );

  db.prepare(`UPDATE tournament_settings SET value = 'Knockout Stage' WHERE key = 'current_stage'`).run();

  logActivity(
    'AUTO_POPULATE_KNOCKOUT',
    `Qualified teams allocated to Semi-Finals: 1st A (#${team1A}) vs Best 2nd (#${teamBest2nd}), and 1st B (#${team1B}) vs 1st C (#${team1C})`,
    adminUsername
  );

  return { success: true };
}

export function getActivityLogs(limit: number = 50): ActivityLog[] {
  return db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit) as ActivityLog[];
}

export function designateTeamGoalkeeper(
  teamId: number,
  playerId: number | null,
  adminUsername: string = 'MAHDIDHMN'
) {
  if (playerId) {
    const player = db.prepare('SELECT id, name, team_id FROM players WHERE id = ?').get(playerId) as any;
    if (!player || player.team_id !== teamId) {
      throw new Error('Selected player does not belong to this team.');
    }
  }

  const tx = db.transaction(() => {
    // 1. Reset current GK on this team
    db.prepare(`UPDATE players SET is_goalkeeper = 0 WHERE team_id = ?`).run(teamId);

    // 2. Assign team goalkeeper_id
    db.prepare(`UPDATE teams SET goalkeeper_id = ? WHERE id = ?`).run(playerId, teamId);

    // 3. Mark the new GK
    if (playerId) {
      db.prepare(`UPDATE players SET is_goalkeeper = 1, position = 'Goalkeeper' WHERE id = ?`).run(playerId);
    }
  });

  tx();
  logActivity('DESIGNATE_GOALKEEPER', `Designated player #${playerId || 'None'} as goalkeeper for team #${teamId}`, adminUsername);
  return { success: true };
}

export function updatePlayerPositions(
  updates: { id: number; position: string; is_goalkeeper?: boolean }[],
  adminUsername: string = 'MAHDIDHMN'
) {
  const updateStmt = db.prepare(`
    UPDATE players
    SET position = ?,
        is_goalkeeper = CASE WHEN ? = 'Goalkeeper' OR ? = 1 THEN 1 ELSE 0 END
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const u of updates) {
      updateStmt.run(u.position, u.position, u.is_goalkeeper ? 1 : 0, u.id);
    }
  });

  tx();
  logActivity('UPDATE_POSITIONS', `Updated positions for ${updates.length} players`, adminUsername);
  return { success: true };
}

export function updateAward(
  awardKey: AwardKey,
  params: {
    winner_player_id?: number | null;
    selection_mode?: 'auto' | 'manual';
    is_locked?: boolean;
    is_revealed?: boolean;
    data_json?: any;
  },
  adminUsername: string = 'MAHDIDHMN'
) {
  const existing = db.prepare('SELECT * FROM tournament_awards WHERE award_key = ?').get(awardKey) as any;

  const winner_player_id = params.winner_player_id !== undefined ? params.winner_player_id : existing?.winner_player_id;
  const selection_mode = params.selection_mode !== undefined ? params.selection_mode : (existing?.selection_mode || 'auto');
  const is_locked = params.is_locked !== undefined ? (params.is_locked ? 1 : 0) : (existing?.is_locked || 0);
  const is_revealed = params.is_revealed !== undefined ? (params.is_revealed ? 1 : 0) : (existing?.is_revealed || 0);
  const data_json = params.data_json !== undefined ? (params.data_json ? JSON.stringify(params.data_json) : null) : existing?.data_json;
  const revealed_at = is_revealed ? (existing?.revealed_at || new Date().toISOString()) : null;

  db.prepare(`
    INSERT INTO tournament_awards (award_key, title, subtitle, winner_player_id, selection_mode, is_locked, is_revealed, revealed_at, data_json, updated_at)
    VALUES (?, COALESCE(?, ?), ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(award_key) DO UPDATE SET
      winner_player_id = excluded.winner_player_id,
      selection_mode = excluded.selection_mode,
      is_locked = excluded.is_locked,
      is_revealed = excluded.is_revealed,
      revealed_at = excluded.revealed_at,
      data_json = excluded.data_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    awardKey,
    existing?.title || awardKey,
    awardKey,
    existing?.subtitle || null,
    winner_player_id,
    selection_mode,
    is_locked,
    is_revealed,
    revealed_at,
    data_json
  );

  // Sync with legacy settings keys for compatibility
  const insertSetting = db.prepare('INSERT OR REPLACE INTO tournament_settings (key, value) VALUES (?, ?)');
  if (awardKey === 'pot') {
    insertSetting.run('awards_pot_mode', selection_mode);
    insertSetting.run('awards_pot_locked', is_locked ? 'true' : 'false');
    insertSetting.run('awards_pot_revealed', is_revealed ? 'true' : 'false');
    if (winner_player_id) insertSetting.run('awards_pot_player_id', String(winner_player_id));
    if (is_revealed && revealed_at) insertSetting.run('awards_pot_revealed_at', revealed_at);
  } else if (awardKey === 'tott') {
    insertSetting.run('awards_tott_revealed', is_revealed ? 'true' : 'false');
    if (data_json) insertSetting.run('awards_tott_data', data_json);
    if (is_revealed && revealed_at) insertSetting.run('awards_tott_revealed_at', revealed_at);
  }

  logActivity('UPDATE_AWARD', `Updated award ${awardKey} (revealed: ${Boolean(is_revealed)}, locked: ${Boolean(is_locked)})`, adminUsername);
  return { success: true };
}

export function revealAllAwards(isRevealed: boolean, adminUsername: string = 'MAHDIDHMN') {
  const revealedVal = isRevealed ? 1 : 0;
  const now = isRevealed ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE tournament_awards
    SET is_revealed = ?,
        revealed_at = ?,
        updated_at = CURRENT_TIMESTAMP
  `).run(revealedVal, now);

  const insertSetting = db.prepare('INSERT OR REPLACE INTO tournament_settings (key, value) VALUES (?, ?)');
  insertSetting.run('awards_pot_revealed', isRevealed ? 'true' : 'false');
  insertSetting.run('awards_tott_revealed', isRevealed ? 'true' : 'false');
  if (isRevealed && now) {
    insertSetting.run('awards_pot_revealed_at', now);
    insertSetting.run('awards_tott_revealed_at', now);
  }

  logActivity('REVEAL_ALL_AWARDS', `${isRevealed ? 'Revealed all' : 'Hidden all'} tournament awards together`, adminUsername);
  return { success: true };
}

export function updateScoringWeights(
  weights: Record<string, number>,
  minAppearances: number = 3,
  adminUsername: string = 'MAHDIDHMN'
) {
  const insertSetting = db.prepare('INSERT OR REPLACE INTO tournament_settings (key, value) VALUES (?, ?)');
  if (weights.goal !== undefined) insertSetting.run('mvp_weight_goal', String(weights.goal));
  if (weights.assist !== undefined) insertSetting.run('mvp_weight_assist', String(weights.assist));
  if (weights.motm !== undefined) insertSetting.run('mvp_weight_motm', String(weights.motm));
  if (weights.gk_clean_sheet !== undefined) insertSetting.run('mvp_weight_gk_clean_sheet', String(weights.gk_clean_sheet));
  if (weights.def_clean_sheet !== undefined) insertSetting.run('mvp_weight_def_clean_sheet', String(weights.def_clean_sheet));
  if (weights.yellow_card !== undefined) insertSetting.run('mvp_weight_yellow_card', String(weights.yellow_card));
  if (weights.red_card !== undefined) insertSetting.run('mvp_weight_red_card', String(weights.red_card));
  insertSetting.run('pot_min_appearances', String(minAppearances));

  logActivity('UPDATE_WEIGHTS', `Updated tournament award scoring weights (min apps: ${minAppearances})`, adminUsername);
  return { success: true };
}

export function updateAwardsSettings(
  params: {
    pot_mode?: 'auto' | 'manual';
    pot_player_id?: number | null;
    pot_locked?: boolean;
    pot_revealed?: boolean;
    tott_revealed?: boolean;
    tott_data?: any;
  },
  adminUsername: string = 'MAHDIDHMN'
) {
  const insertSetting = db.prepare('INSERT OR REPLACE INTO tournament_settings (key, value) VALUES (?, ?)');

  if (params.pot_mode !== undefined) {
    insertSetting.run('awards_pot_mode', params.pot_mode);
  }
  if (params.pot_player_id !== undefined) {
    insertSetting.run('awards_pot_player_id', params.pot_player_id ? String(params.pot_player_id) : '');
  }
  if (params.pot_locked !== undefined) {
    insertSetting.run('awards_pot_locked', params.pot_locked ? 'true' : 'false');
  }
  if (params.pot_revealed !== undefined) {
    insertSetting.run('awards_pot_revealed', params.pot_revealed ? 'true' : 'false');
    if (params.pot_revealed) {
      insertSetting.run('awards_pot_revealed_at', new Date().toISOString());
    }
  }
  if (params.tott_revealed !== undefined) {
    insertSetting.run('awards_tott_revealed', params.tott_revealed ? 'true' : 'false');
    if (params.tott_revealed) {
      insertSetting.run('awards_tott_revealed_at', new Date().toISOString());
    }
  }
  if (params.tott_data !== undefined) {
    insertSetting.run('awards_tott_data', params.tott_data ? JSON.stringify(params.tott_data) : '');
  }

  logActivity('UPDATE_AWARDS', `Awards ceremony settings updated by ${adminUsername}`, adminUsername);
  return { success: true };
}

