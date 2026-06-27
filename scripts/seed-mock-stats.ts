/**
 * One-off seed for mock stats data. Usage:
 *   bun scripts/seed-mock-stats.ts
 */

import { calculateAdherence } from '../src/lib/habits/adherence';
import type { Habit } from '../src/lib/database.types';
import { shiftDateKey, weekdayInTimezone } from '../src/lib/habits/schedule';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const USER_ID = '1320d50c-5989-4ae2-9168-bbb415757804';
const TIMEZONE = 'Europe/Berlin';
const START = '2026-05-12';
const END = '2026-06-26';

const habits: Habit[] = [
	{
		id: '25d77aac-4f89-40f4-9a20-c36d1ae5d1d9',
		user_id: USER_ID,
		name: 'wake up',
		type: 'do_on_time',
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: false,
		max_consecutive_skips: 3,
		anchor_time: '06:00:00',
		target_value: null,
		target_unit: null,
		target_time: '06:00:00',
		grace_minutes: 5,
		falloff_minutes_per_10_percent: 6,
		log_step: 5,
		archived_at: null,
		created_at: '2026-05-10T08:00:00.000Z',
		updated_at: '2026-05-10T08:00:00.000Z'
	},
	{
		id: '0730e22f-f0c4-4295-8d91-7280a9235de6',
		user_id: USER_ID,
		name: 'poop',
		type: 'rate',
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: true,
		max_consecutive_skips: 7,
		anchor_time: '23:00:00',
		target_value: null,
		target_unit: null,
		target_time: null,
		grace_minutes: 5,
		falloff_minutes_per_10_percent: 6,
		log_step: 5,
		archived_at: null,
		created_at: '2026-05-10T08:00:00.000Z',
		updated_at: '2026-05-10T08:00:00.000Z'
	},
	{
		id: 'a7105e8b-1788-4702-bd35-24991e8dd61f',
		user_id: USER_ID,
		name: 'pee',
		type: 'do_target',
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: false,
		max_consecutive_skips: 3,
		anchor_time: '23:30:00',
		target_value: 3,
		target_unit: 'times',
		target_time: null,
		grace_minutes: 5,
		falloff_minutes_per_10_percent: 6,
		log_step: 5,
		archived_at: null,
		created_at: '2026-05-10T08:00:00.000Z',
		updated_at: '2026-05-10T08:00:00.000Z'
	}
];

function hash(dateKey: string, salt: string): number {
	let h = 0;
	for (const char of `${dateKey}:${salt}`) {
		h = (h * 31 + char.charCodeAt(0)) >>> 0;
	}
	return h;
}

function dateKeysInclusive(start: string, end: string): string[] {
	const keys: string[] = [];
	let cursor = start;
	while (cursor <= end) {
		keys.push(cursor);
		cursor = shiftDateKey(cursor, 1);
	}
	return keys;
}

function isWeekend(dateKey: string): boolean {
	const weekday = weekdayInTimezone(new Date(`${dateKey}T12:00:00Z`), TIMEZONE);
	return weekday === 0 || weekday === 6;
}

function sqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

type LogRow = {
	habit_id: string;
	log_date: string;
	status: 'logged' | 'skipped';
	actual_value: number | null;
	actual_time: string | null;
	satisfaction: number | null;
	adherence_score: number | null;
};

function wakeUpLog(dateKey: string): LogRow | null {
	const h = hash(dateKey, 'wake');
	const weekend = isWeekend(dateKey);
	const roll = h % 100;

	if (weekend) {
		if (roll < 18) return null;
		if (roll < 48) {
			const actualTime = roll < 33 ? '06:02:00' : '06:08:00';
			return loggedWake(actualTime);
		}
		const lateMinutes = 20 + (h % 90);
		const hours = 6 + Math.floor(lateMinutes / 60);
		const mins = lateMinutes % 60;
		return loggedWake(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`);
	}

	if (roll < 6) return null;
	if (roll < 76) return loggedWake('06:01:00');
	if (roll < 90) return loggedWake('06:12:00');
	return loggedWake('06:38:00');
}

function loggedWake(actualTime: string): LogRow {
	const habit = habits[0];
	const score = calculateAdherence(habit, { actualTime });
	return {
		habit_id: habit.id,
		log_date: '',
		status: 'logged',
		actual_value: null,
		actual_time: actualTime,
		satisfaction: null,
		adherence_score: score
	};
}

function poopLog(dateKey: string, consecutiveSkips: number): LogRow | null {
	const h = hash(dateKey, 'poop');
	const roll = h % 100;

	if (roll < 11 && consecutiveSkips < 6) {
		return {
			habit_id: habits[1].id,
			log_date: '',
			status: 'skipped',
			actual_value: null,
			actual_time: null,
			satisfaction: null,
			adherence_score: null
		};
	}

	const satisfaction =
		roll < 22 ? 5 : roll < 44 ? 4 : roll < 66 ? 3 : roll < 82 ? 2 : 1;
	const score = calculateAdherence(habits[1], { satisfaction });
	return {
		habit_id: habits[1].id,
		log_date: '',
		status: 'logged',
		actual_value: null,
		actual_time: null,
		satisfaction,
		adherence_score: score
	};
}

function peeLog(dateKey: string): LogRow | null {
	const h = hash(dateKey, 'pee');
	const dayIndex = dateKeysInclusive(START, dateKey).length;
	const struggle = dayIndex > 30 ? 18 : dayIndex > 20 ? 10 : 0;
	const roll = (h + struggle) % 100;

	if (roll < 7) return null;

	const actual =
		roll < 52 ? 3 : roll < 78 ? 2 : roll < 93 ? 1 : 0;
	const score = calculateAdherence(habits[2], { actualValue: actual });
	return {
		habit_id: habits[2].id,
		log_date: '',
		status: 'logged',
		actual_value: actual,
		actual_time: null,
		satisfaction: null,
		adherence_score: score
	};
}

function buildLogs(): LogRow[] {
	const rows: LogRow[] = [];
	let poopSkips = 0;

	for (const dateKey of dateKeysInclusive(START, END)) {
		const wake = wakeUpLog(dateKey);
		if (wake) rows.push({ ...wake, log_date: dateKey });

		const poop = poopLog(dateKey, poopSkips);
		if (poop) {
			rows.push({ ...poop, log_date: dateKey });
			poopSkips = poop.status === 'skipped' ? poopSkips + 1 : 0;
		}

		const pee = peeLog(dateKey);
		if (pee) rows.push({ ...pee, log_date: dateKey });
	}

	return rows;
}

function loadDatabaseUrl(): string {
	const envPath = resolve(import.meta.dir, '../.env');
	const env = readFileSync(envPath, 'utf8');
	const projectId = env.match(/^SUPABASE_PROJECT_ID=(.+)$/m)?.[1]?.trim();
	const password = env.match(/^SUPABASE_DB_PASSWORD=(.+)$/m)?.[1]?.trim();
	if (!projectId || !password) {
		throw new Error('Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD in .env');
	}
	return `postgresql://postgres.${projectId}:${password}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
}

const logs = buildLogs();

const sql = [
	`UPDATE habits SET created_at = '2026-05-10T08:00:00.000Z', updated_at = '2026-05-10T08:00:00.000Z' WHERE user_id = '${USER_ID}';`,
	`DELETE FROM habit_logs WHERE user_id = '${USER_ID}';`,
	...logs.map((log) => {
		const actualValue = log.actual_value == null ? 'null' : log.actual_value;
		const actualTime = log.actual_time == null ? 'null' : sqlString(log.actual_time);
		const satisfaction = log.satisfaction == null ? 'null' : log.satisfaction;
		const adherence = log.adherence_score == null ? 'null' : log.adherence_score;
		return `INSERT INTO habit_logs (habit_id, user_id, log_date, status, actual_value, actual_time, satisfaction, adherence_score)
VALUES ('${log.habit_id}', '${USER_ID}', '${log.log_date}', '${log.status}', ${actualValue}, ${actualTime}, ${satisfaction}, ${adherence});`;
	})
].join('\n');

const dbUrl = loadDatabaseUrl();
const result = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
	encoding: 'utf8'
});

if (result.status !== 0) {
	console.error(result.stderr || result.stdout);
	process.exit(1);
}

console.log(`Seeded ${logs.length} habit logs for ${USER_ID} (${START} → ${END}).`);
console.log(result.stdout.trim());
