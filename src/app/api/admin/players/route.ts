import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity } from '@/lib/db';

export const dynamic = 'force-dynamic';

type PlayerRow = {
  id: number;
  name: string;
  name_ar: string | null;
  team_id: number;
  is_captain: number;
  squad_number: number | null;
  position: string | null;
  is_goalkeeper: number;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanSquadNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : null;
}

/**
 * Keeps the per-player flags (is_captain / is_goalkeeper) and the team pointers
 * (captain_id / goalkeeper_id) in agreement for one player on one team.
 */
function syncTeamRoles(playerId: number, teamId: number, isCaptain: boolean, isGoalkeeper: boolean) {
  if (isCaptain) {
    db.prepare('UPDATE players SET is_captain = 0 WHERE team_id = ? AND id != ?').run(teamId, playerId);
    db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(playerId, teamId);
  } else {
    db.prepare('UPDATE teams SET captain_id = NULL WHERE id = ? AND captain_id = ?').run(teamId, playerId);
  }

  if (isGoalkeeper) {
    db.prepare('UPDATE players SET is_goalkeeper = 0 WHERE team_id = ? AND id != ?').run(teamId, playerId);
    db.prepare('UPDATE teams SET goalkeeper_id = ? WHERE id = ?').run(playerId, teamId);
  } else {
    db.prepare('UPDATE teams SET goalkeeper_id = NULL WHERE id = ? AND goalkeeper_id = ?').run(teamId, playerId);
  }
}

/** Everything in the tournament record that points at this player. */
function getPlayerUsage(playerId: number) {
  const events = db
    .prepare('SELECT event_type, count(*) AS c FROM match_events WHERE player_id = ? GROUP BY event_type')
    .all(playerId) as { event_type: string; c: number }[];
  const byType: Record<string, number> = {};
  for (const e of events) byType[e.event_type] = e.c;

  const assists = (
    db.prepare('SELECT count(*) AS c FROM match_events WHERE assister_id = ?').get(playerId) as { c: number }
  ).c;
  const mvps = (
    db.prepare('SELECT count(*) AS c FROM matches WHERE mvp_player_id = ?').get(playerId) as { c: number }
  ).c;
  const awards = (
    db.prepare('SELECT count(*) AS c FROM tournament_awards WHERE winner_player_id = ?').get(playerId) as { c: number }
  ).c;

  const usage = {
    goals: byType.goal || 0,
    assists: assists + (byType.assist || 0),
    yellow_cards: byType.yellow_card || 0,
    red_cards: byType.red_card || 0,
    mvps,
    awards,
  };
  const total = Object.values(usage).reduce((a, b) => a + b, 0);
  return { usage, total };
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = cleanText(body.name);
    const nameAr = cleanText(body.name_ar) || null;
    const teamId = Number(body.team_id);

    if (!name || !Number.isInteger(teamId) || teamId <= 0) {
      return NextResponse.json({ error: 'Player name and team ID are required' }, { status: 400 });
    }

    const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(teamId) as
      | { id: number; name: string }
      | undefined;
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isCaptain = Boolean(body.is_captain);
    const isGK = Boolean(body.is_goalkeeper) || body.position === 'Goalkeeper';
    const position = isGK ? 'Goalkeeper' : cleanText(body.position) || 'Attacker';
    const squadNumber = cleanSquadNumber(body.squad_number);

    const create = db.transaction(() => {
      const res = db
        .prepare(
          `INSERT INTO players (name, name_ar, team_id, is_captain, squad_number, position, is_goalkeeper)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(name, nameAr, teamId, isCaptain ? 1 : 0, squadNumber, position, isGK ? 1 : 0);
      const id = Number(res.lastInsertRowid);
      syncTeamRoles(id, teamId, isCaptain, isGK);
      return id;
    });
    const playerId = create();

    logActivity('ADD_PLAYER', `Added player "${name}" (${position}) to team "${team.name}"`, admin.username);

    return NextResponse.json({ success: true, player_id: playerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Fields that are not sent keep their current value.
    const name = body.name !== undefined ? cleanText(body.name) : existing.name;
    if (!name) {
      return NextResponse.json({ error: 'Player name cannot be empty' }, { status: 400 });
    }
    const nameAr = body.name_ar !== undefined ? cleanText(body.name_ar) || null : existing.name_ar;
    const squadNumber =
      body.squad_number !== undefined ? cleanSquadNumber(body.squad_number) : existing.squad_number;

    const teamId = body.team_id !== undefined && body.team_id !== null ? Number(body.team_id) : existing.team_id;
    if (!db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId)) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isCaptain = body.is_captain !== undefined ? Boolean(body.is_captain) : Boolean(existing.is_captain);
    const isGK =
      body.is_goalkeeper !== undefined
        ? Boolean(body.is_goalkeeper)
        : body.position !== undefined
          ? body.position === 'Goalkeeper'
          : Boolean(existing.is_goalkeeper);

    const requestedPosition = cleanText(body.position);
    const previousOutfield =
      existing.position && existing.position !== 'Goalkeeper' ? existing.position : 'Attacker';
    const position = isGK
      ? 'Goalkeeper'
      : requestedPosition && requestedPosition !== 'Goalkeeper'
        ? requestedPosition
        : previousOutfield;

    const update = db.transaction(() => {
      db.prepare(
        `UPDATE players
         SET name = ?, name_ar = ?, team_id = ?, is_captain = ?, squad_number = ?, position = ?, is_goalkeeper = ?
         WHERE id = ?`
      ).run(name, nameAr, teamId, isCaptain ? 1 : 0, squadNumber, position, isGK ? 1 : 0, id);

      if (teamId !== existing.team_id) {
        // Moved to another team: the old team must not keep pointing at this player.
        db.prepare('UPDATE teams SET captain_id = NULL WHERE id = ? AND captain_id = ?').run(existing.team_id, id);
        db.prepare('UPDATE teams SET goalkeeper_id = NULL WHERE id = ? AND goalkeeper_id = ?').run(existing.team_id, id);
      }

      syncTeamRoles(id, teamId, isCaptain, isGK);
    });
    update();

    logActivity(
      'UPDATE_PLAYER',
      existing.name !== name ? `Renamed player #${id} "${existing.name}" → "${name}"` : `Updated player #${id} ("${name}")`,
      admin.username
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const player = db.prepare('SELECT id, name, team_id FROM players WHERE id = ?').get(id) as
      | { id: number; name: string; team_id: number }
      | undefined;
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Deleting a player cascades to their match events, which would silently
    // erase recorded goals/cards while the match scores stay. Refuse instead.
    const { usage, total } = getPlayerUsage(id);
    if (total > 0) {
      const parts = [
        usage.goals && `${usage.goals} goal(s)`,
        usage.assists && `${usage.assists} assist(s)`,
        usage.yellow_cards && `${usage.yellow_cards} yellow card(s)`,
        usage.red_cards && `${usage.red_cards} red card(s)`,
        usage.mvps && `${usage.mvps} match MVP(s)`,
        usage.awards && `${usage.awards} tournament award(s)`,
      ].filter(Boolean);
      return NextResponse.json(
        {
          error: `"${player.name}" cannot be removed: ${parts.join(', ')} recorded. Removing the player would erase these match records. Use Edit to rename/replace the player instead, or delete those events in the Match Center first.`,
          has_records: true,
          usage,
        },
        { status: 409 }
      );
    }

    const remove = db.transaction(() => {
      db.prepare('UPDATE teams SET captain_id = NULL WHERE captain_id = ?').run(id);
      db.prepare('UPDATE teams SET goalkeeper_id = NULL WHERE goalkeeper_id = ?').run(id);
      db.prepare('DELETE FROM players WHERE id = ?').run(id);
    });
    remove();

    logActivity('DELETE_PLAYER', `Removed player "${player.name}" from team #${player.team_id}`, admin.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
