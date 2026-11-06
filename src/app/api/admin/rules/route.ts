import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 1. Update rule
    if (body.action === 'update_rule') {
      const { id, title, content, category } = body;
      db.prepare(`
        UPDATE tournament_rules
        SET title = COALESCE(?, title),
            content = COALESCE(?, content),
            category = COALESCE(?, category)
        WHERE id = ?
      `).run(title, content, category, id);

      logActivity('UPDATE_RULE', `Updated rule "${id}"`, admin.username);
      return NextResponse.json({ success: true });
    }

    // 2. Add rule
    if (body.action === 'add_rule') {
      const { id, title, content, category } = body;
      const count = (db.prepare('SELECT count(*) as count FROM tournament_rules').get() as any).count;
      db.prepare(`
        INSERT INTO tournament_rules (id, title, content, category, display_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, title, content, category, count + 1);

      logActivity('ADD_RULE', `Added new rule "${title}"`, admin.username);
      return NextResponse.json({ success: true });
    }

    // 3. Resolve discrepancy & update tournament settings
    if (body.action === 'resolve_discrepancy') {
      const { choice, note } = body; // 'confirm_12_teams' or 'switch_to_11_teams'
      db.prepare(`UPDATE tournament_settings SET value = 'true' WHERE key = 'discrepancy_resolved'`).run();
      db.prepare(`UPDATE tournament_settings SET value = ? WHERE key = 'teams_count_mode'`).run(choice);
      if (note) {
        db.prepare(`UPDATE tournament_settings SET value = ? WHERE key = 'discrepancy_notice'`).run(note);
      }

      logActivity('RESOLVE_DISCREPANCY', `Admin confirmed tournament format: ${choice}`, admin.username);
      return NextResponse.json({ success: true });
    }

    // 4. Update general setting
    if (body.action === 'update_setting') {
      const { key, value } = body;
      db.prepare(`
        INSERT INTO tournament_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(key, value);

      logActivity('UPDATE_SETTING', `Changed setting ${key} = ${value}`, admin.username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

