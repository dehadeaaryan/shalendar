import { json, type RequestHandler } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { authenticateCalendar } from '$lib/server/auth';
import { eq, and, gte, lte } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	let body: any = {};
	try {
		body = await request.json();
	} catch (e) {
		body = {};
	}

	// 1. Extract & Validate Credentials
	let name = request.headers.get('x-calendar-name') || body.calendar_name || body.name || body.calendarName;
	let password = request.headers.get('x-calendar-password') || body.password || body.calendar_password || body.calendarPassword;

	// Check Basic Auth header if headers missing
	const authHeader = request.headers.get('authorization');
	if ((!name || !password) && authHeader && authHeader.startsWith('Basic ')) {
		try {
			const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8').split(':');
			name = name || credentials[0];
			password = password || credentials[1];
		} catch (e) {
			return json({ error: 'Invalid Authorization header format' }, { status: 400 });
		}
	}

	if (!name || typeof name !== 'string' || !name.trim()) {
		return json(
			{ error: 'Calendar name is required. Provide in headers (x-calendar-name) or JSON body (calendar_name).' },
			{ status: 400 }
		);
	}

	if (!password || typeof password !== 'string') {
		return json(
			{ error: 'Calendar password is required for REST API access. Provide in headers (x-calendar-password) or JSON body (password).' },
			{ status: 401 }
		);
	}

	const calendar = await authenticateCalendar(name.trim(), password);
	if (!calendar) {
		return json({ error: 'Authentication failed: Invalid calendar name or password' }, { status: 401 });
	}

	// 2. Extract & Validate Members (Supports Single Partner or BOTH)
	const partnerName = body.partner_name || body.partnerName || body.partner || 'Person 1';
	const partnerId = body.partner_id || body.partnerId;
	const partnerColor = body.display_color || body.displayColor || body.color || '#f97316';
	const partnerTz = body.timezone || 'UTC';

	const existingPartners = await db
		.select()
		.from(schema.partners)
		.where(eq(schema.partners.calendarId, calendar.id));

	const isBoth = String(partnerName).trim().toUpperCase() === 'BOTH';

	let targetPartners: typeof existingPartners = [];

	if (isBoth) {
		if (existingPartners.length === 0) {
			return json({ error: 'No members exist for this calendar' }, { status: 400 });
		}
		targetPartners = existingPartners;
	} else {
		let partner = existingPartners.find(
			(p) => (partnerId && p.id === partnerId) || p.name.toLowerCase() === String(partnerName).toLowerCase()
		);

		if (!partner) {
			const [newPartner] = await db
				.insert(schema.partners)
				.values({
					calendarId: calendar.id,
					name: String(partnerName).trim(),
					displayColor: existingPartners.length === 1 ? '#3b82f6' : partnerColor,
					timezone: partnerTz
				})
				.returning();
			partner = newPartner;
		}
		targetPartners = [partner];
	}

	// 3. Extract & Strict Type Check Events Array
	const rawEvents = Array.isArray(body) ? body : Array.isArray(body.events) ? body.events : [];
	const incomingEvents: { title: string; startTime: string; endTime: string; externalShortcutId: string }[] = [];

	for (let i = 0; i < rawEvents.length; i++) {
		const evt = rawEvents[i];
		if (!evt || typeof evt !== 'object') continue;

		const rawStart = evt.start_time || evt.startTime || evt.start;
		const rawEnd = evt.end_time || evt.endTime || evt.end;

		if (!rawStart || !rawEnd) {
			return json({ error: `Event at index ${i} is missing start_time or end_time` }, { status: 400 });
		}

		const startDate = new Date(rawStart);
		const endDate = new Date(rawEnd);

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return json({ error: `Event at index ${i} has invalid ISO date format` }, { status: 400 });
		}

		const titleStr = String(evt.title || evt.name || 'Untitled Event').trim();
		const shortcutId = String(evt.external_shortcut_id || evt.externalShortcutId || evt.id || `shortcut-${i}-${Date.now()}`);

		incomingEvents.push({
			title: titleStr,
			startTime: startDate.toISOString(),
			endTime: endDate.toISOString(),
			externalShortcutId: shortcutId
		});
	}

	// 4. Calculate Sync Date Range
	let rangeStart: string | null = body.sync_start || body.syncStart || body.range_start || null;
	let rangeEnd: string | null = body.sync_end || body.syncEnd || body.range_end || null;

	if ((!rangeStart || !rangeEnd) && incomingEvents.length > 0) {
		let minStart = incomingEvents[0].startTime;
		let maxEnd = incomingEvents[0].endTime;

		for (const evt of incomingEvents) {
			if (evt.startTime < minStart) minStart = evt.startTime;
			if (evt.endTime > maxEnd) maxEnd = evt.endTime;
		}
		rangeStart = rangeStart || minStart;
		rangeEnd = rangeEnd || maxEnd;
	}

	let createdCount = 0;
	let updatedCount = 0;
	let deletedCount = 0;
	const nowIso = new Date().toISOString();

	// 5. Sync Events for Each Target Partner
	for (const targetPartner of targetPartners) {
		if (rangeStart && rangeEnd) {
			const existingEvents = await db
				.select()
				.from(schema.events)
				.where(
					and(
						eq(schema.events.calendarId, calendar.id),
						eq(schema.events.partnerId, targetPartner.id),
						gte(schema.events.startTime, rangeStart),
						lte(schema.events.endTime, rangeEnd)
					)
				);

			const existingMap = new Map(existingEvents.map((e: any) => [e.externalShortcutId, e]));
			const incomingIds = new Set(incomingEvents.map((e: any) => e.externalShortcutId));

			for (const evt of incomingEvents) {
				const existing = existingMap.get(evt.externalShortcutId);
				if (existing) {
					await db
						.update(schema.events)
						.set({
							title: evt.title,
							startTime: evt.startTime,
							endTime: evt.endTime
						})
						.where(eq(schema.events.id, existing.id));
					updatedCount++;
				} else {
					await db.insert(schema.events).values({
						calendarId: calendar.id,
						partnerId: targetPartner.id,
						title: evt.title,
						startTime: evt.startTime,
						endTime: evt.endTime,
						externalShortcutId: evt.externalShortcutId,
						createdAt: nowIso
					});
					createdCount++;
				}
			}

			for (const existing of existingEvents) {
				if (existing.externalShortcutId && !incomingIds.has(existing.externalShortcutId)) {
					await db.delete(schema.events).where(eq(schema.events.id, existing.id));
					deletedCount++;
				}
			}
		} else if (incomingEvents.length > 0) {
			for (const evt of incomingEvents) {
				await db.insert(schema.events).values({
					calendarId: calendar.id,
					partnerId: targetPartner.id,
					title: evt.title,
					startTime: evt.startTime,
					endTime: evt.endTime,
					externalShortcutId: evt.externalShortcutId,
					createdAt: nowIso
				});
				createdCount++;
			}
		}
	}

	return json({
		success: true,
		partners: targetPartners.map((p) => ({
			id: p.id,
			name: p.name,
			displayColor: p.displayColor,
			timezone: p.timezone
		})),
		range: {
			start: rangeStart,
			end: rangeEnd
		},
		stats: {
			created: createdCount,
			updated: updatedCount,
			deleted: deletedCount,
			totalInPayload: incomingEvents.length
		}
	});
};