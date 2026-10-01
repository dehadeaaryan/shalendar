import { json, type RequestHandler } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { hashPassword, verifyPassword, authenticateCalendar, generateSessionToken, getCalendarByName, verifySessionToken } from '$lib/server/auth';
import { eq, and, inArray } from 'drizzle-orm';

const DEFAULT_COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

// POST: Create Calendar OR Login OR Create Event OR Logout OR Create Member
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const action = body.action;

	if (action === 'create_calendar') {
		const { name, password, members, privacyEnabled } = body;

		if (!name || !password) {
			return json({ error: 'Calendar name and password are required' }, { status: 400 });
		}

		const existing = await getCalendarByName(name);
		if (existing) {
			return json({ error: 'A calendar with this name already exists' }, { status: 400 });
		}

		const passwordHash = await hashPassword(password);

		const privateCalendar = privacyEnabled === true;
		let memberList = Array.isArray(members) && members.length > 0 ? members : [
			{ name: 'Person 1', displayColor: '#f97316', timezone: 'UTC' },
			{ name: 'Person 2', displayColor: '#3b82f6', timezone: 'UTC' }
		];
		if (privateCalendar && memberList.some((member: any, idx: number) => {
			const memberPassword = idx === 0 ? password : member.accessPassword;
			return typeof memberPassword !== 'string' || memberPassword.length < 8;
		})) {
			return json({ error: 'Every privacy calendar member needs an access password of at least 8 characters.' }, { status: 400 });
		}
		if (privateCalendar) {
			const names = memberList.map((member: any) => String(member.name || '').trim().toLowerCase());
			if (new Set(names).size !== names.length) return json({ error: 'Privacy calendar member names must be unique.' }, { status: 400 });
			const passwords = memberList.map((member: any, idx: number) => idx === 0 ? password : member.accessPassword);
			if (new Set(passwords).size !== passwords.length) return json({ error: 'Each privacy calendar member must use a different access password.' }, { status: 400 });
		}

		const [calendar] = await db
			.insert(schema.calendars)
			.values({
				name: name.trim().toLowerCase(),
				passwordHash,
				privacyEnabled: privateCalendar
			})
			.returning();

		const insertMembers = await Promise.all(memberList.map(async (m: any, idx: number) => ({
			calendarId: calendar.id,
			name: m.name?.trim() || `Person ${idx + 1}`,
			displayColor: m.displayColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
			timezone: m.timezone || 'UTC',
			accessPasswordHash: privateCalendar
				? await hashPassword(idx === 0 ? password : m.accessPassword)
				: null
		})));

		const createdMembers = await db.insert(schema.partners).values(insertMembers).returning();
		if (privateCalendar && createdMembers[0]) {
			await db.update(schema.calendars)
				.set({ ownerPartnerId: createdMembers[0].id })
				.where(eq(schema.calendars.id, calendar.id));
		}

		const token = generateSessionToken(calendar.id, calendar.name, privateCalendar ? createdMembers[0]?.id : undefined);
		cookies.set(`session_${calendar.name.toLowerCase()}`, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		return json({ success: true, calendarName: calendar.name });
	}

	if (action === 'login') {
		const { name, password, partnerName } = body;
		if (!name || !password) {
			return json({ error: 'Name and password required' }, { status: 400 });
		}

		const foundCalendar = await getCalendarByName(name);
		if (!foundCalendar) return json({ error: 'Incorrect calendar name or password' }, { status: 401 });
		let calendar = foundCalendar;
		let partnerId: string | undefined;
		if (calendar.privacyEnabled) {
			if (!partnerName) return json({ error: 'Enter your member name for this privacy calendar.' }, { status: 400 });
			const members = await db.select().from(schema.partners).where(eq(schema.partners.calendarId, calendar.id));
			const member = members.find((item) => item.name.toLowerCase() === String(partnerName).trim().toLowerCase());
			if (!member?.accessPasswordHash || !(await verifyPassword(password, member.accessPasswordHash))) {
				return json({ error: 'Incorrect member name or access password' }, { status: 401 });
			}
			partnerId = member.id;
		} else {
			const authenticated = await authenticateCalendar(name, password);
			if (!authenticated) return json({ error: 'Incorrect calendar name or password' }, { status: 401 });
			calendar = authenticated;
		}

		const token = generateSessionToken(calendar.id, calendar.name, partnerId);
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
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && (!session.partnerId || partnerId !== session.partnerId || partnerId === 'BOTH')) {
			return json({ error: 'Privacy calendars only allow you to add events to your own member calendar.' }, { status: 403 });
		}

		const formattedStart = new Date(startTime).toISOString();
		const formattedEnd = new Date(endTime).toISOString();
		const nowIso = new Date().toISOString();

		if (partnerId === 'BOTH') {
			const partners = await db
				.select()
				.from(schema.partners)
				.where(eq(schema.partners.calendarId, session.calendarId));

			const eventsToInsert = partners.map((p, idx) => ({
				calendarId: session.calendarId,
				partnerId: p.id,
				title: title.trim(),
				startTime: formattedStart,
				endTime: formattedEnd,
				externalShortcutId: `web-${Date.now()}-${idx}`,
				createdAt: nowIso
			}));

			if (eventsToInsert.length > 0) {
				const newEvents = await db.insert(schema.events).values(eventsToInsert).returning();
				return json({ success: true, events: newEvents });
			}
			return json({ error: 'No members found on this calendar' }, { status: 400 });
		} else {
			const [newEvent] = await db
				.insert(schema.events)
				.values({
					calendarId: session.calendarId,
					partnerId,
					title: title.trim(),
					startTime: formattedStart,
					endTime: formattedEnd,
					externalShortcutId: `web-${Date.now()}`,
					createdAt: nowIso
				})
				.returning();

			return json({ success: true, event: newEvent });
		}
	}

	if (action === 'create_member') {
		const { calendarName, name, displayColor, timezone, accessPassword } = body;
		const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
		const session = verifySessionToken(token || '', calendarName);

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && session.partnerId !== calendar.ownerPartnerId) {
			return json({ error: 'Only the calendar owner can add members.' }, { status: 403 });
		}
		if (calendar?.privacyEnabled && (typeof accessPassword !== 'string' || accessPassword.length < 8)) {
			return json({ error: 'Member access password must be at least 8 characters.' }, { status: 400 });
		}
		if (calendar?.privacyEnabled) {
			const existingMembers = await db.select().from(schema.partners).where(eq(schema.partners.calendarId, session.calendarId));
			if (existingMembers.some((member) => member.name.toLowerCase() === String(name).trim().toLowerCase())) {
				return json({ error: 'A member with that name already exists.' }, { status: 400 });
			}
			for (const member of existingMembers) {
				if (member.accessPasswordHash && await verifyPassword(accessPassword, member.accessPasswordHash)) {
					return json({ error: 'Choose a different access password for each member.' }, { status: 400 });
				}
			}
		}

		const [newMember] = await db
			.insert(schema.partners)
			.values({
				calendarId: session.calendarId,
				name: name.trim(),
				displayColor: displayColor || '#3b82f6',
				timezone: timezone || 'UTC',
				accessPasswordHash: calendar?.privacyEnabled ? await hashPassword(accessPassword) : null
			})
			.returning();

		return json({ success: true, member: { id: newMember.id, name: newMember.name, displayColor: newMember.displayColor, timezone: newMember.timezone } });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

// PATCH: Update member details OR Update event details
export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const action = body.action;

	// --- Action: Update Event Details ---
	if (action === 'update_event') {
		const { calendarName, eventId, partnerId, title, startTime, endTime } = body;

		const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
		const session = verifySessionToken(token || '', calendarName);

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!eventId || !partnerId || !title || !startTime || !endTime) {
			return json({ error: 'All fields are required' }, { status: 400 });
		}
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		const [existingEvent] = await db.select().from(schema.events).where(and(eq(schema.events.id, eventId), eq(schema.events.calendarId, session.calendarId))).limit(1);
		if (!existingEvent) return json({ error: 'Event not found on this calendar' }, { status: 404 });
		if (calendar?.privacyEnabled && (!session.partnerId || existingEvent.partnerId !== session.partnerId || partnerId !== session.partnerId || partnerId === 'BOTH')) {
			return json({ error: 'Privacy calendars only allow you to edit your own events.' }, { status: 403 });
		}

		const formattedStart = new Date(startTime).toISOString();
		const formattedEnd = new Date(endTime).toISOString();
		const nowIso = new Date().toISOString();

		if (partnerId === 'BOTH') {
			const partners = await db
				.select()
				.from(schema.partners)
				.where(eq(schema.partners.calendarId, session.calendarId));

			if (partners.length > 0) {
				// Update the original event for the first partner
				await db
					.update(schema.events)
					.set({
						partnerId: partners[0].id,
						title: title.trim(),
						startTime: formattedStart,
						endTime: formattedEnd
					})
					.where(eq(schema.events.id, eventId));

				// Create matching events for the remaining partners
				const remainingPartners = partners.slice(1);
				const eventsToInsert = remainingPartners.map((p, idx) => ({
					calendarId: session.calendarId,
					partnerId: p.id,
					title: title.trim(),
					startTime: formattedStart,
					endTime: formattedEnd,
					externalShortcutId: `web-${Date.now()}-${idx}`,
					createdAt: nowIso
				}));

				if (eventsToInsert.length > 0) {
					await db.insert(schema.events).values(eventsToInsert);
				}
			}
		} else {
			await db
				.update(schema.events)
				.set({
					partnerId,
					title: title.trim(),
					startTime: formattedStart,
					endTime: formattedEnd
				})
				.where(eq(schema.events.id, eventId));
		}

		return json({ success: true });
	}

	// --- Action: Update Member Settings ---
	const { calendarName, partnerId, name, displayColor, timezone } = body;

	const token = cookies.get(`session_${calendarName?.toLowerCase()}`);
	const session = verifySessionToken(token || '', calendarName);

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!partnerId) {
		return json({ error: 'Member ID is required' }, { status: 400 });
	}
	const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
	if (calendar?.privacyEnabled && session.partnerId !== calendar.ownerPartnerId) {
		return json({ error: 'Only the calendar owner can change member settings.' }, { status: 403 });
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
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && session.partnerId !== calendar.ownerPartnerId) {
			return json({ error: 'Only the calendar owner can delete all events.' }, { status: 403 });
		}
		const partners = await db
			.select({ id: schema.partners.id })
			.from(schema.partners)
			.where(eq(schema.partners.calendarId, session.calendarId));

		const partnerIds = partners.map(p => p.id);

		if (partnerIds.length > 0) {
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
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && session.partnerId !== calendar.ownerPartnerId) {
			return json({ error: 'Only the calendar owner can remove members.' }, { status: 403 });
		}
		if (calendar?.privacyEnabled && partnerId === calendar.ownerPartnerId) {
			return json({ error: 'The calendar owner member cannot be removed.' }, { status: 400 });
		}

		const partner = await db
			.select()
			.from(schema.partners)
			.where(and(eq(schema.partners.id, partnerId), eq(schema.partners.calendarId, session.calendarId)));

		if (partner.length === 0) {
			return json({ error: 'Member not found on this calendar' }, { status: 404 });
		}

		await db.delete(schema.events).where(eq(schema.events.partnerId, partnerId));
		await db.delete(schema.partners).where(eq(schema.partners.id, partnerId));

		return json({ success: true, message: 'Member and events deleted successfully' });
	}

	if (action === 'delete_event' || !action) {
		if (!eventId) {
			return json({ error: 'Event ID is required' }, { status: 400 });
		}
		const [event] = await db.select().from(schema.events).where(and(eq(schema.events.id, eventId), eq(schema.events.calendarId, session.calendarId))).limit(1);
		if (!event) return json({ error: 'Event not found on this calendar' }, { status: 404 });
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && event.partnerId !== session.partnerId) {
			return json({ error: 'Privacy calendars only allow you to delete your own events.' }, { status: 403 });
		}
		await db.delete(schema.events).where(eq(schema.events.id, eventId));
		return json({ success: true });
	}

	if (action === 'delete_calendar') {
		const [calendar] = await db.select().from(schema.calendars).where(eq(schema.calendars.id, session.calendarId)).limit(1);
		if (calendar?.privacyEnabled && session.partnerId !== calendar.ownerPartnerId) {
			return json({ error: 'Only the calendar owner can delete this calendar.' }, { status: 403 });
		}
		await db
			.delete(schema.calendars)
			.where(eq(schema.calendars.id, session.calendarId));

		cookies.delete(`session_${calendarName.toLowerCase()}`, { path: '/' });

		return json({ success: true, message: 'Calendar deleted successfully' });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
