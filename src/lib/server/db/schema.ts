import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const calendars = sqliteTable('calendars', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => [
	index('calendar_name_idx').on(table.name)
]);

export const partners = sqliteTable('partners', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	calendarId: text('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	displayColor: text('display_color').notNull(),
	timezone: text('timezone').notNull().default('UTC')
}, (table) => [
	index('partner_calendar_idx').on(table.calendarId)
]);

export const events = sqliteTable('events', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	calendarId: text('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
	partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
	externalShortcutId: text('external_shortcut_id'),
	createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
}, (table) => [
	index('event_calendar_idx').on(table.calendarId),
	index('event_partner_idx').on(table.partnerId),
	index('event_shortcut_idx').on(table.externalShortcutId),
	index('event_time_idx').on(table.startTime, table.endTime)
]);

export const calendarsRelations = relations(calendars, ({ many }) => ({
	partners: many(partners)
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
	calendar: one(calendars, {
		fields: [partners.calendarId],
		references: [calendars.id]
	}),
	events: many(events)
}));

export const eventsRelations = relations(events, ({ one }) => ({
	partner: one(partners, {
		fields: [events.partnerId],
		references: [partners.id]
	})
}));
