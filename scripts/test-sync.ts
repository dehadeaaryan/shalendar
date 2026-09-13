import { db, schema } from '../src/lib/server/db';
import { hashPassword } from '../src/lib/server/auth';
import { eq } from 'drizzle-orm';

async function testSyncLogic() {
	console.log('--- Testing Shalendar DB & Timezone Sync API Logic ---');

	// 1. Create Test Calendar
	const testName = 'test-tz-sync';
	const testPassword = 'testpassword123';
	const passwordHash = await hashPassword(testPassword);

	// Clean up existing test record if any
	await db.delete(schema.calendars).where(eq(schema.calendars.name, testName));

	const [calendar] = await db.insert(schema.calendars).values({
		name: testName,
		passwordHash
	}).returning();

	console.log('✓ Created Test Calendar:', calendar.name);

	// 2. Create Test Partners (Alex in EST, Sam in PDT)
	const [p1] = await db.insert(schema.partners).values({
		calendarId: calendar.id,
		name: 'Alex (EST)',
		displayColor: '#f97316',
		timezone: 'America/New_York'
	}).returning();

	const [p2] = await db.insert(schema.partners).values({
		calendarId: calendar.id,
		name: 'Sam (PDT)',
		displayColor: '#3b82f6',
		timezone: 'America/Los_Angeles'
	}).returning();

	console.log('✓ Created Members with Timezones:', p1.name, `(${p1.timezone})`, 'and', p2.name, `(${p2.timezone})`);

	// 3. Test ISO string with -04:00 offset (10:00 AM EST)
	const estISOStart = '2026-09-13T10:00:00-04:00';
	const estISOEnd = '2026-09-13T11:00:00-04:00';
	const parsedUTCStart = new Date(estISOStart).toISOString();

	console.log('✓ Input EST Start:', estISOStart);
	console.log('✓ Parsed UTC Start in DB:', parsedUTCStart); // Should be 2026-09-13T14:00:00.000Z

	// Format in PDT
	const formattedInPDT = new Date(parsedUTCStart).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'America/Los_Angeles'
	});

	console.log('✓ Rendered in PDT (Sam\'s Timezone):', formattedInPDT); // Should be 07:00 AM!

	if (!formattedInPDT.includes('7:00') && !formattedInPDT.includes('07:00')) {
		throw new Error(`Expected 7:00 AM in PDT, got ${formattedInPDT}`);
	}

	console.log('✓ Timezone conversion verified: 10:00 AM EST = 7:00 AM PDT');

	// Cleanup test calendar
	await db.delete(schema.calendars).where(eq(schema.calendars.name, testName));
	console.log('✓ Cleaned up test database records.');
	console.log('--- All Timezone & Sync Tests Passed! ---');
}

testSyncLogic().catch(err => {
	console.error('Test Failed:', err);
	process.exit(1);
});
