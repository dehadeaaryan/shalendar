import { json, type RequestHandler } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { hashPassword, authenticateCalendar, generateSessionToken, getCalendarByName, verifySessionToken } from '$lib/server/auth';
import { eq, and, inArray } from 'drizzle-orm';

const DEFAULT_COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

// POST: Create Calendar OR Login OR Create Event OR Logout OR Create Member
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

	if (action === 'create_member') {
		const { calendarName, name, displayColor, timezone } = body;
		const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
		const session = verifySessionToken(token || '', calendarName);

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const [newMember] = await db
			.insert(schema.partners)
			.values({
				calendarId: session.calendarId,
				name: name.trim(),
				displayColor: displayColor || '#3b82f6',
				timezone: timezone || 'UTC'
			})
			.returning();

		return json({ success: true, member: newMember });
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

// DELETE: Delete event, delete member, or delete all events
export const DELETE: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const { action, calendarName, eventId, partnerId } = body;

	const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
	const session = verifySessionToken(token || '', calendarName);

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (action === 'delete_all_events') {
		// Fetch all partners belonging to this calendar
		const partners = await db
			.select({ id: schema.partners.id })
			.from(schema.partners)
			.where(eq(schema.partners.calendarId, session.calendarId));

		const partnerIds = partners.map(p => p.id);

		if (partnerIds.length > 0) {
			// Delete all events mapped to any of these partners
			await db
				.delete(schema.events)
				.where(inArray(schema.events.partnerId, partnerIds));
		}

		return json({ success: true, message: 'All events deleted successfully' });
	}

	if (action === 'delete_member') {
		if (!partnerId) {
			return json({ error: 'Partner ID is required' }, { status: 400 });
		}

		// Security check: Ensure the partner actually belongs to the authenticated calendar
		const partner = await db
			.select()
			.from(schema.partners)
			.where(and(eq(schema.partners.id, partnerId), eq(schema.partners.calendarId, session.calendarId)));

		if (partner.length === 0) {
			return json({ error: 'Member not found on this calendar' }, { status: 404 });
		}

		// Delete their events first, then delete the member
		await db.delete(schema.events).where(eq(schema.events.partnerId, partnerId));
		await db.delete(schema.partners).where(eq(schema.partners.id, partnerId));

		return json({ success: true, message: 'Member and events deleted successfully' });
	}

	if (action === 'delete_event' || !action) {
		if (!eventId) {
			return json({ error: 'Event ID is required' }, { status: 400 });
		}
		await db.delete(schema.events).where(eq(schema.events.id, eventId));
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};