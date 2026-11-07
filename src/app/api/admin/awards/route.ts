import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import {
  getFullTournamentData,
  updateAwardsSettings,
  updateAward,
  revealAllAwards,
  updateScoringWeights,
} from '@/lib/tournamentService';
import { suggestTeamOfTournament } from '@/lib/calculations';
import { AwardKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const data = getFullTournamentData({ isAdmin: true });
    const suggestions = {
      '1-2-1': suggestTeamOfTournament(data.players, '1-2-1'),
      '2-2': suggestTeamOfTournament(data.players, '2-2'),
      '1-1-2': suggestTeamOfTournament(data.players, '1-1-2'),
      '2-1-1': suggestTeamOfTournament(data.players, '2-1-1'),
    };

    return NextResponse.json({
      awards: data.awards,
      player_of_tournament: data.player_of_tournament,
      best_goalkeepers: data.best_goalkeepers || [],
      clean_sheets_leaderboard: data.clean_sheets_leaderboard || [],
      top_scorers: data.top_scorers || [],
      top_assists: data.top_assists || [],
      top_mvps: data.top_mvps || [],
      players: data.players,
      teams: data.teams,
      suggestions,
    });
  } catch (error: any) {
    console.error('Error fetching admin awards data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch awards data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reveal_all') {
      const isRevealed = Boolean(body.is_revealed);
      revealAllAwards(isRevealed, admin.username);
    } else if (action === 'update_weights') {
      const { weights, min_appearances } = body;
      updateScoringWeights(weights || {}, min_appearances || 3, admin.username);
    } else if (action === 'update_award') {
      const { award_key, winner_player_id, selection_mode, is_locked, is_revealed, data_json } = body;
      if (!award_key) {
        return NextResponse.json({ error: 'award_key is required' }, { status: 400 });
      }
      updateAward(
        award_key as AwardKey,
        {
          winner_player_id,
          selection_mode,
          is_locked,
          is_revealed,
          data_json,
        },
        admin.username
      );
    } else {
      // Legacy compatibility handler
      const {
        pot_mode,
        pot_player_id,
        pot_locked,
        pot_revealed,
        tott_revealed,
        tott_data,
      } = body;

      updateAwardsSettings(
        {
          pot_mode,
          pot_player_id,
          pot_locked,
          pot_revealed,
          tott_revealed,
          tott_data,
        },
        admin.username
      );
    }

    const updated = getFullTournamentData({ isAdmin: true });
    return NextResponse.json({
      success: true,
      message: 'Awards updated successfully',
      awards: updated.awards,
      player_of_tournament: updated.player_of_tournament,
    });
  } catch (error: any) {
    console.error('Error updating awards:', error);
    return NextResponse.json({ error: error.message || 'Failed to update awards' }, { status: 500 });
  }
}

