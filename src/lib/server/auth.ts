import bcrypt from 'bcryptjs';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
// Use a per-process fallback in local development; deployments should set a stable secret.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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

export function generateSessionToken(calendarId: string, calendarName: string, partnerId?: string): string {
	const payload = `${calendarId}:${calendarName.toLowerCase()}:${Date.now()}:${partnerId || ''}`;
	const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
	return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifySessionToken(token: string, expectedCalendarName?: string): { calendarId: string; calendarName: string; partnerId?: string } | null {
	try {
		if (!token) return null;
		const [encodedPayload, signature] = token.split('.');
		if (!encodedPayload || !signature) return null;

		const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
		const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

		if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			const [calendarId, calendarName, , partnerId] = payload.split(':');
			if (expectedCalendarName && calendarName !== expectedCalendarName.toLowerCase()) {
				return null;
			}
			return { calendarId, calendarName, partnerId: partnerId || undefined };
		}
	} catch (e) {
		return null;
	}
	return null;
}
