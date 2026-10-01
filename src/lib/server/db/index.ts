import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

let dbPath = process.env.DATABASE_URL || 'data/shalendar.db';

try {
	const { env } = await import('$env/dynamic/private');
	if (env && env.DATABASE_URL) {
		dbPath = env.DATABASE_URL;
	}
} catch (e) {
	// Standalone script environment fallback
}

// Ensure directory exists
const dir = path.dirname(dbPath);
if (dir && dir !== '.' && !fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

const client = new Database(dbPath);

// Enable WAL mode & foreign keys in SQLite
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

// Auto-initialize SQLite database tables on startup if they don't exist yet
client.exec(`
	CREATE TABLE IF NOT EXISTS calendars (
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS partners (
		id TEXT PRIMARY KEY NOT NULL,
		calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		display_color TEXT NOT NULL,
		timezone TEXT NOT NULL DEFAULT 'UTC'
	);

	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY NOT NULL,
		calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
		partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		external_shortcut_id TEXT,
		created_at INTEGER NOT NULL
	);
`);

// Keep file-backed databases created by earlier versions compatible.
const ensureColumn = (table: string, column: string, definition: string) => {
	const columns = client.pragma(`table_info(${table})`) as { name: string }[];
	if (!columns.some((entry) => entry.name === column)) {
		client.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
};

ensureColumn('calendars', 'privacy_enabled', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('calendars', 'owner_partner_id', 'TEXT');
ensureColumn('partners', 'access_password_hash', 'TEXT');
ensureColumn('events', 'source', "TEXT NOT NULL DEFAULT 'manual'");
client.exec(`
	UPDATE events SET source = 'apple'
	WHERE source = 'manual'
	  AND external_shortcut_id IS NOT NULL
	  AND external_shortcut_id NOT LIKE 'web-%';
`);

export const db = drizzle(client, { schema });
export { schema };
