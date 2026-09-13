import { json, type RequestHandler } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { hashPassword, authenticateCalendar, generateSessionToken, getCalendarByName, verifySessionToken } from '$lib/server/auth';
import { eq, and } from 'drizzle-orm';

const DEFAULT_COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

// POST: Create Calendar OR Login OR Create Event OR Logout
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const action = body.action;

	if (action === 'create_calendar') {
		const { name, password, members } = body;

		if (!name || !password) {
			return json({ error: 'Calendar name and password are required' }, { status: 400 });
		}

		const existing = await getCalendarByName(name);
		if (existing) {
			return json({ error: 'A calendar with this name already exists' }, { status: 400 });
		}

		const passwordHash = await hashPassword(password);

		const [calendar] = await db
			.insert(schema.calendars)
			.values({
				name: name.trim().toLowerCase(),
				passwordHash
			})
			.returning();

		let memberList = Array.isArray(members) && members.length > 0 ? members : [
			{ name: 'Person 1', displayColor: '#f97316', timezone: 'UTC' },
			{ name: 'Person 2', displayColor: '#3b82f6', timezone: 'UTC' }
		];

		const insertMembers = memberList.map((m: any, idx: number) => ({
			calendarId: calendar.id,
			name: m.name?.trim() || `Person ${idx + 1}`,
			displayColor: m.displayColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
			timezone: m.timezone || 'UTC'
		}));

		await db.insert(schema.partners).values(insertMembers);

		const token = generateSessionToken(calendar.id, calendar.name);
		cookies.set(`session_${calendar.name.toLowerCase()}`, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		return json({ success: true, calendarName: calendar.name });
	}

	if (action === 'login') {
		const { name, password } = body;
		if (!name || !password) {
			return json({ error: 'Name and password required' }, { status: 400 });
		}

		const calendar = await authenticateCalendar(name, password);
		if (!calendar) {
			return json({ error: 'Incorrect calendar name or password' }, { status: 401 });
		}

		const token = generateSessionToken(calendar.id, calendar.name);
		cookies.set(`session_${calendar.name.toLowerCase()}`, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		return json({ success: true, calendarName: calendar.name });
	}

	if (action === 'logout') {
		const { calendarName } = body;
		if (calendarName) {
			cookies.delete(`session_${calendarName.toLowerCase()}`, { path: '/' });
		}
		return json({ success: true });
	}

	if (action === 'create_event') {
		const { calendarName, partnerId, title, startTime, endTime } = body;
		const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
		const session = verifySessionToken(token || '', calendarName);

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!partnerId || !title || !startTime || !endTime) {
			return json({ error: 'All event fields are required' }, { status: 400 });
		}

		const [newEvent] = await db
			.insert(schema.events)
			.values({
				partnerId,
				title: title.trim(),
				startTime: new Date(startTime).toISOString(),
				endTime: new Date(endTime).toISOString(),
				externalShortcutId: `web-${Date.now()}`
			})
			.returning();

		return json({ success: true, event: newEvent });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

// PATCH: Update member details
export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const { calendarName, partnerId, name, displayColor, timezone } = body;

	const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
	const session = verifySessionToken(token || '', calendarName);

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!partnerId) {
		return json({ error: 'Member ID is required' }, { status: 400 });
	}

	const updates: any = {};
	if (name) updates.name = name.trim();
	if (displayColor) updates.displayColor = displayColor;
	if (timezone) updates.timezone = timezone;

	await db
		.update(schema.partners)
		.set(updates)
		.where(and(eq(schema.partners.id, partnerId), eq(schema.partners.calendarId, session.calendarId)));

	return json({ success: true });
};

// DELETE: Delete event
export const DELETE: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const { calendarName, eventId } = body;

	const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
	const session = verifySessionToken(token || '', calendarName);

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await db.delete(schema.events).where(eq(schema.events.id, eventId));

	return json({ success: true });
};
