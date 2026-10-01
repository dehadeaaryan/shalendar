# Shalendar

Shalendar is a shared calendar for multiple members and timezones. It provides day, week, month, agenda, and free time views, optional privacy-capable calendars, and event sync from Apple Calendar through iOS Shortcuts or Google Calendar through Google Apps Script.

## Development

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run dev
```

## Checks and build

```sh
bun run check
bun run build
```

The app uses SvelteKit with the Node adapter. Configure `DATABASE_URL` and a stable, high-entropy `SESSION_SECRET` in `.env` before using calendar features. Keep the session secret unchanged between deployments so existing sign-ins remain valid.
