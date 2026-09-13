import { db, schema } from '../src/lib/server/db';
import { hashPassword } from '../src/lib/server/auth';
import { eq } from 'drizzle-orm';

const API_URL = 'http://localhost:5177/api/sync';
const CALENDAR_NAME = 'lemon-and-pineapple';
const CALENDAR_PASSWORD = 'pineapple';

async function sendDemoShortcutEvents() {
	console.log(`\n==================================================`);
	console.log(`🚀 DEMO SHORTCUT API SYNC FOR CALENDAR: ${CALENDAR_NAME}`);
	console.log(`==================================================\n`);

	// 1. Ensure Calendar and Members exist in DB
	let calendar = await db.query.calendars.findFirst({
		where: eq(schema.calendars.name, CALENDAR_NAME)
	});

	const passwordHash = await hashPassword(CALENDAR_PASSWORD);

	if (!calendar) {
		console.log(`Creating calendar "${CALENDAR_NAME}" in database...`);
		const [newCal] = await db.insert(schema.calendars).values({
			name: CALENDAR_NAME,
			passwordHash
		}).returning();
		calendar = newCal;

		await db.insert(schema.partners).values([
			{ calendarId: calendar.id, name: 'Vishy', displayColor: '#f97316', timezone: 'America/New_York' },
			{ calendarId: calendar.id, name: 'Aaru', displayColor: '#3b82f6', timezone: 'America/Los_Angeles' }
		]);
		console.log(`✓ Created calendar and members: Vishy (EDT/New York) & Aaru (PDT/Los Angeles)`);
	} else {
		// Update password hash to ensure test password matches
		await db.update(schema.calendars).set({ passwordHash }).where(eq(schema.calendars.id, calendar.id));

		// Ensure Vishy and Aaru exist as members
		const existingPartners = await db.select().from(schema.partners).where(eq(schema.partners.calendarId, calendar.id));
		
		// Reset partners to ensure correct timezone setup
		await db.delete(schema.partners).where(eq(schema.partners.calendarId, calendar.id));
		await db.insert(schema.partners).values([
			{ calendarId: calendar.id, name: 'Vishy', displayColor: '#f97316', timezone: 'America/New_York' },
			{ calendarId: calendar.id, name: 'Aaru', displayColor: '#3b82f6', timezone: 'America/Los_Angeles' }
		]);
		
		console.log(`✓ Calendar "${CALENDAR_NAME}" reset: Vishy (America/New_York, EDT) & Aaru (America/Los_Angeles, PDT).`);
		console.log(`✓ Password set to "${CALENDAR_PASSWORD}".`);
	}

	// 2. TEST 1: Request WITHOUT Password (Should Fail 401)
	console.log(`\n--- Test 1: Sending request WITHOUT password ---`);
	try {
		const res1 = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				calendar_name: CALENDAR_NAME,
				events: []
			})
		});
		const data1 = await res1.json();
		console.log(`Response Status: ${res1.status}`, data1);
		if (res1.status === 401) {
			console.log(`✓ Auth check passed! Request rejected with 401 Unauthorized.`);
		} else {
			console.error(`❌ Security failure! Expected 401 status.`);
		}
	} catch (e: any) {
		console.error(`Fetch error in Test 1:`, e.message);
	}

	// 3. TEST 2: Request WITH WRONG Password (Should Fail 401)
	console.log(`\n--- Test 2: Sending request WITH WRONG password ---`);
	try {
		const res2 = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				calendar_name: CALENDAR_NAME,
				password: 'wrongpassword',
				events: []
			})
		});
		const data2 = await res2.json();
		console.log(`Response Status: ${res2.status}`, data2);
		if (res2.status === 401) {
			console.log(`✓ Auth check passed! Wrong password rejected with 401.`);
		} else {
			console.error(`❌ Security failure! Expected 401 status.`);
		}
	} catch (e: any) {
		console.error(`Fetch error in Test 2:`, e.message);
	}

	// 4. Build today's date helpers
	// We are simulating Aaru (EST = America/New_York, UTC-4 in summer) sending events
	// The events are sent with -04:00 offset (EDT), and Vishy is in PDT (-07:00)
	// So 10:00 AM EDT = 7:00 AM PDT
	const todayUTC = new Date();
	
	// Helper: build ISO string for a given local day offset, hour:minute in a given UTC offset
	const makeISO = (dayOffset: number, hour: number, minute: number, utcOffsetStr: string) => {
		const d = new Date(todayUTC);
		d.setUTCDate(todayUTC.getUTCDate() + dayOffset);
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(hour)}:${pad(minute)}:00${utcOffsetStr}`;
	};

	// 5. TEST 3: Sending Valid Shortcut Payload for Aaru (LA time = PDT, -07:00)
	// Aaru's shortcut uploads at local PDT time with -07:00 offset
	// The title includes her local time so we can verify the display
	console.log(`\n--- Test 3: Syncing iOS Shortcut events for Aaru (PDT/Los Angeles, -07:00) ---`);
	const aaruEventsPayload = {
		calendar_name: CALENDAR_NAME,
		password: CALENDAR_PASSWORD,
		partner_name: 'Aaru',
		timezone: 'America/Los_Angeles',
		sync_start: makeISO(-1, 0, 0, '-07:00'),
		sync_end: makeISO(7, 23, 59, '-07:00'),
		events: [
			{
				// Aaru's local time: 8:00 AM PDT → Vishy sees: 11:00 AM EDT
				title: 'Morning Run 🏃‍♀️ [8am PDT]',
				start_time: makeISO(0, 8, 0, '-07:00'),
				end_time: makeISO(0, 9, 0, '-07:00'),
				external_shortcut_id: 'aaru-demo-1'
			},
			{
				// Overlapping block 1: Aaru's local time: 10:00 AM - 11:30 AM PDT
				title: 'Client Strategy Session 💼 [10am PDT]',
				start_time: makeISO(0, 10, 0, '-07:00'),
				end_time: makeISO(0, 11, 30, '-07:00'),
				external_shortcut_id: 'aaru-demo-2'
			},
			{
				// Overlapping block 2: Aaru's local time: 10:30 AM - 12:00 PM PDT (overlaps with Strategy Session & Design Review)
				title: 'Emergency Team Sync ⚡ [10:30am PDT]',
				start_time: makeISO(0, 10, 30, '-07:00'),
				end_time: makeISO(0, 12, 0, '-07:00'),
				external_shortcut_id: 'aaru-demo-overlap-1'
			},
			{
				// Overlapping block 3: Aaru's local time: 11:00 AM - 1:00 PM PDT (overlaps with Team Sync)
				title: 'Design Review 🎨 [11am PDT]',
				start_time: makeISO(0, 11, 0, '-07:00'),
				end_time: makeISO(0, 13, 0, '-07:00'),
				external_shortcut_id: 'aaru-demo-overlap-2'
			},
			{
				// Aaru's local time: 1:30 PM PDT
				title: 'Lunch Break & Call 📞 [1:30pm PDT]',
				start_time: makeISO(0, 13, 30, '-07:00'),
				end_time: makeISO(0, 14, 30, '-07:00'),
				external_shortcut_id: 'aaru-demo-3'
			},
			{
				// Aaru's local time: 4:00 PM PDT → Vishy sees: 7:00 PM EDT
				title: 'Late Afternoon Reading ☕ [4pm PDT]',
				start_time: makeISO(0, 16, 0, '-07:00'),
				end_time: makeISO(0, 17, 0, '-07:00'),
				external_shortcut_id: 'aaru-demo-4'
			},
			{
				// Tomorrow: Aaru's local time: 7:00 PM PDT → Vishy sees: 10:00 PM EDT
				title: 'Virtual Dinner Catch-up 🍕 [7pm PDT]',
				start_time: makeISO(1, 19, 0, '-07:00'),
				end_time: makeISO(1, 21, 0, '-07:00'),
				external_shortcut_id: 'aaru-demo-5'
			}
		]
	};

	try {
		const res3 = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(aaruEventsPayload)
		});
		const data3 = await res3.json();
		console.log(`Response Status: ${res3.status}`, JSON.stringify(data3, null, 2));
		if (res3.ok) {
			console.log(`✓ Aaru events synced successfully! Created: ${data3.stats?.created}, Updated: ${data3.stats?.updated}`);
		} else {
			console.error(`❌ Failed to sync Aaru events:`, data3);
		}
	} catch (e: any) {
		console.error(`Fetch error in Test 3:`, e.message);
	}

	// 6. TEST 4: Sending Valid Shortcut Payload for Vishy (NY time = EDT, -04:00)
	console.log(`\n--- Test 4: Syncing iOS Shortcut events for Vishy (EDT/New York, -04:00) ---`);
	const vishyEventsPayload = {
		calendar_name: CALENDAR_NAME,
		password: CALENDAR_PASSWORD,
		partner_name: 'Vishy',
		timezone: 'America/New_York',
		sync_start: makeISO(-1, 0, 0, '-04:00'),
		sync_end: makeISO(7, 23, 59, '-04:00'),
		events: [
			{
				// Vishy's local time: 7:00 AM EDT → Aaru sees: 4:00 AM PDT
				title: 'Morning Gym 🏋️ [7am EDT]',
				start_time: makeISO(0, 7, 0, '-04:00'),
				end_time: makeISO(0, 8, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-1'
			},
			{
				// Vishy's local time: 10:00 AM EDT → Aaru sees: 7:00 AM PDT
				title: 'Product Design Sync 💻 [10am EDT]',
				start_time: makeISO(0, 10, 0, '-04:00'),
				end_time: makeISO(0, 11, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-2'
			},
			{
				// Overlapping block 1: Vishy's local time: 3:00 PM - 4:30 PM EDT
				title: 'Team Code Review 🚀 [3pm EDT]',
				start_time: makeISO(0, 15, 0, '-04:00'),
				end_time: makeISO(0, 16, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-3'
			},
			{
				// Overlapping block 2: Vishy's local time: 3:30 PM - 5:00 PM EDT
				title: '1:1 Sync with Manager 💬 [3:30pm EDT]',
				start_time: makeISO(0, 15, 30, '-04:00'),
				end_time: makeISO(0, 17, 0, '-04:00'),
				external_shortcut_id: 'vishy-demo-overlap-1'
			},
			{
				// Overlapping block 3: Vishy's local time: 4:00 PM - 5:30 PM EDT
				title: 'Architecture Brainstorm 💡 [4pm EDT]',
				start_time: makeISO(0, 16, 0, '-04:00'),
				end_time: makeISO(0, 17, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-overlap-2'
			},
			{
				// Tomorrow: Vishy's local time: 9:30 AM EDT → Aaru sees: 6:30 AM PDT
				title: 'Standup Meeting ☀️ [9:30am EDT]',
				start_time: makeISO(1, 9, 30, '-04:00'),
				end_time: makeISO(1, 10, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-4'
			},
			{
				// +3 days: Vishy's local time: 2:00 PM EDT → Aaru sees: 11:00 AM PDT
				title: 'Flight to NYC ✈️ [2pm EDT]',
				start_time: makeISO(3, 14, 0, '-04:00'),
				end_time: makeISO(3, 17, 30, '-04:00'),
				external_shortcut_id: 'vishy-demo-5'
			}
		]
	};

	try {
		const res4 = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(vishyEventsPayload)
		});
		const data4 = await res4.json();
		console.log(`Response Status: ${res4.status}`, JSON.stringify(data4, null, 2));
		if (res4.ok) {
			console.log(`✓ Vishy events synced successfully! Created: ${data4.stats?.created}, Updated: ${data4.stats?.updated}`);
		} else {
			console.error(`❌ Failed to sync Vishy events:`, data4);
		}
	} catch (e: any) {
		console.error(`Fetch error in Test 4:`, e.message);
	}

	console.log(`\n==================================================`);
	console.log(`🎉 Demo Sync Completed! Open http://localhost:5177/calendar/${CALENDAR_NAME}`);
	console.log(`   (Calendar Password: "${CALENDAR_PASSWORD}")`);
	console.log(`\n📋 Timezone verification guide:`);
	console.log(`   • Aaru events uploaded in PDT/LA (-07:00)`);
	console.log(`   • Vishy events uploaded in EDT/NY (-04:00)`);
	console.log(`   • "10am PDT" Aaru event → should appear at 1:00 PM when viewing in EDT (Vishy's time)`);
	console.log(`   • "10am EDT" Vishy event → should appear at 7:00 AM when viewing in PDT (Aaru's time)`);
	console.log(`==================================================\n`);
}

sendDemoShortcutEvents().catch(err => {
	console.error('Demo Script Failed:', err);
	process.exit(1);
});
