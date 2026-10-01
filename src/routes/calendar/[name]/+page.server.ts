import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { getCalendarByName, verifySessionToken } from '$lib/server/auth';
import { eq, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const calendarName = params.name.toLowerCase();
	const calendar = await getCalendarByName(calendarName);

	if (!calendar) {
		throw error(404, 'Calendar not found');
	}

	const token = cookies.get(`session_${calendarName}`);
	const session = verifySessionToken(token || '', calendarName);
	const isAuthenticated = !!session && (!calendar.privacyEnabled || !!session.partnerId);

	let partners: any[] = [];
	let events: any[] = [];

	if (isAuthenticated) {
		partners = await db
			.select()
			.from(schema.partners)
			.where(eq(schema.partners.calendarId, calendar.id));

		const partnerIds = partners.map((p) => p.id);
		if (partnerIds.length > 0) {
				const calendarEvents = await db
					.select()
					.from(schema.events)
					.where(inArray(schema.events.partnerId, partnerIds));
				events = calendar.privacyEnabled
					? calendarEvents.map((event) =>
							event.partnerId === session?.partnerId ? event : { ...event, title: 'Busy' }
						)
					: calendarEvents;
		}
	}

	return {
		calendarName: calendar.name,
		privacyEnabled: calendar.privacyEnabled,
		viewerPartnerId: isAuthenticated ? session?.partnerId || null : null,
		viewerIsOwner: !calendar.privacyEnabled || session?.partnerId === calendar.ownerPartnerId,
		isAuthenticated,
		partners: partners.map(({ accessPasswordHash: _passwordHash, ...partner }) => partner),
		events
	};
};
