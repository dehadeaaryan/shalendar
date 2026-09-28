# Shalendar

Shalendar is a shared calendar for multiple members and timezones. It provides day, week, month, agenda, and free time views, with optional Apple Calendar sync through iOS Shortcuts.

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

The app uses SvelteKit with the Node adapter. Configure the database and authentication settings in `.env` before using calendar features locally.
