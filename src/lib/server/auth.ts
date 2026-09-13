import bcrypt from 'bcryptjs';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
const SESSION_SECRET = process.env.SESSION_SECRET || 'shalendar-secret-key-3000';

export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

export async function getCalendarByName(name: string) {
	const result = await db
		.select()
		.from(schema.calendars)
		.where(eq(schema.calendars.name, name.trim().toLowerCase()))
		.limit(1);

	return result[0] || null;
}

export async function authenticateCalendar(name: string, password: string) {
	if (!name || !password) return null;
	const calendar = await getCalendarByName(name);
	if (!calendar) return null;

	const isValid = await verifyPassword(password, calendar.passwordHash);
	if (!isValid) return null;

	return calendar;
}

export function generateSessionToken(calendarId: string, calendarName: string): string {
	const payload = `${calendarId}:${calendarName.toLowerCase()}:${Date.now()}`;
	const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
	return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifySessionToken(token: string, expectedCalendarName?: string): { calendarId: string; calendarName: string } | null {
	try {
		if (!token) return null;
		const [encodedPayload, signature] = token.split('.');
		if (!encodedPayload || !signature) return null;

		const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
		const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

		if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			const [calendarId, calendarName] = payload.split(':');
			if (expectedCalendarName && calendarName !== expectedCalendarName.toLowerCase()) {
				return null;
			}
			return { calendarId, calendarName };
		}
	} catch (e) {
		return null;
	}
	return null;
}
