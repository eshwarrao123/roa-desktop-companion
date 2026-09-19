import type Database from 'better-sqlite3';
import { Timer, TimerType } from '@shared/types/timers';
import { getDb } from '../../db';

export class TimersRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDb();
  }

  public create(timer: Timer): void {
    const stmt = this.db.prepare(`
      INSERT INTO timers (
        id, label, type, duration_ms, started_at, ends_at, remaining_ms,
        state, pomodoro_phase, pomodoro_cycle, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      timer.id,
      timer.label,
      timer.type,
      timer.duration_ms,
      timer.started_at,
      timer.ends_at,
      timer.remaining_ms,
      timer.state,
      timer.pomodoro_phase ?? null,
      timer.pomodoro_cycle ?? 0,
      timer.created_at,
      timer.updated_at
    );
  }

  public get(id: string): Timer | null {
    const row = this.db.prepare('SELECT * FROM timers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRowToTimer(row) : null;
  }

  public getActive(type?: TimerType): Timer | null {
    let sql = `SELECT * FROM timers WHERE state IN ('running', 'paused')`;
    const params: unknown[] = [];

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY updated_at DESC LIMIT 1`;
    const row = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    return row ? this.mapRowToTimer(row) : null;
  }

  public getRunningTimers(): Timer[] {
    const rows = this.db.prepare(`SELECT * FROM timers WHERE state = 'running'`).all() as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRowToTimer(r));
  }

  public list(limit = 50): Timer[] {
    const rows = this.db.prepare(`SELECT * FROM timers ORDER BY created_at DESC LIMIT ?`).all(limit) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRowToTimer(r));
  }

  public update(id: string, partial: Partial<Timer>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(partial)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value === undefined ? null : value);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const sql = `UPDATE timers SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  public delete(id: string): void {
    this.db.prepare('DELETE FROM timers WHERE id = ?').run(id);
  }

  private mapRowToTimer(row: Record<string, unknown>): Timer {
    return {
      id: row.id as string,
      label: row.label as string,
      type: row.type as Timer['type'],
      duration_ms: Number(row.duration_ms),
      started_at: row.started_at ? Number(row.started_at) : null,
      ends_at: row.ends_at ? Number(row.ends_at) : null,
      remaining_ms: Number(row.remaining_ms),
      state: row.state as Timer['state'],
      pomodoro_phase: (row.pomodoro_phase as Timer['pomodoro_phase']) ?? undefined,
      pomodoro_cycle: row.pomodoro_cycle !== null && row.pomodoro_cycle !== undefined ? Number(row.pomodoro_cycle) : undefined,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    };
  }
}
