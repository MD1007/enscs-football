import db, { initDatabase, logActivity } from './db';
import {
  calculateGroupStandings,
  calculateBestSecondPlace,
  aggregatePlayerStats,
  calculateMatchMVP,
  isGroupStageComplete,
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
} from './types';

// Ensure database is initialized
initDatabase();

export function getFullTournamentData(): TournamentData {
  // 1. Teams
  const teamsRaw = db.prepare(`
    SELECT t.*, p.name as captain_name
    FROM teams t
    LEFT JOIN players p ON t.captain_id = p.id
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

  // 6. Standings & Player Stats
  const standings: Record<GroupId, StandingRow[]> = {
    A: calculateGroupStandings('A', teams, matches),
    B: calculateGroupStandings('B', teams, matches),
    C: calculateGroupStandings('C', teams, matches),
  };

  const best_second = calculateBestSecondPlace(standings);

  const { playersWithStats, topScorers, topAssists, topMVPs, playerOfTheTournament, yellowCards, redCards } = aggregatePlayerStats(
    playersRaw.map((p) => ({ ...p, is_captain: Boolean(p.is_captain) })),
    teams,
    matches
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
    player_of_tournament: playerOfTheTournament,
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

