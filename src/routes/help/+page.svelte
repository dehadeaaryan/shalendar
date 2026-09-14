<script lang="ts">
	import {
		Smartphone,
		Zap,
		Lock,
		Code2,
		ChevronRight,
		Copy,
		Check,
		Terminal,
		Globe,
		BookOpen,
		ArrowRight,
		AlertCircle,
		Calendar as CalendarIcon,
		User,
		Clock,
		RefreshCw,
		Shield,
		CheckCircle2,
		Info,
		ExternalLink
	} from 'lucide-svelte';

	let copiedKey = $state<string | null>(null);

	function copyToClipboard(text: string, key: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedKey = key;
			setTimeout(() => {
				copiedKey = null;
			}, 2000);
		});
	}

	const syncPayloadExample = `{
  "calendar_name": "lemon-and-pineapple",
  "password": "your-shared-password",
  "partner_name": "Aaru",
  "timezone": "America/Los_Angeles",
  "sync_start": "2024-09-14T00:00:00-07:00",
  "sync_end": "2024-09-21T23:59:59-07:00",
  "events": [
    {
      "title": "Morning Run 🏃",
      "start_time": "2024-09-14T08:00:00-07:00",
      "end_time": "2024-09-14T09:00:00-07:00",
      "external_shortcut_id": "apple-cal-uuid-abc123"
    },
    {
      "title": "Team Meeting 💼",
      "start_time": "2024-09-14T10:30:00-07:00",
      "end_time": "2024-09-14T11:30:00-07:00",
      "external_shortcut_id": "apple-cal-uuid-def456"
    }
  ]
}`;

	const responseExample = `{
  "success": true,
  "partner": {
    "id": 2,
    "name": "Aaru",
    "displayColor": "#3b82f6",
    "timezone": "America/Los_Angeles"
  },
  "range": {
    "start": "2024-09-14T07:00:00.000Z",
    "end": "2024-09-21T06:59:59.000Z"
  },
  "stats": {
    "created": 2,
    "updated": 0,
    "deleted": 0,
    "totalInPayload": 2
  }
}`;

	const curlExample = `curl -X POST https://shalendar.aaryandehade.com/api/sync \\
  -H "Content-Type: application/json" \\
  -d '{
    "calendar_name": "lemon-and-pineapple",
    "password": "your-shared-password",
    "partner_name": "Aaru",
    "timezone": "America/Los_Angeles",
    "sync_start": "2024-09-14T00:00:00-07:00",
    "sync_end": "2024-09-21T23:59:59-07:00",
    "events": [
      {
        "title": "Morning Run",
        "start_time": "2024-09-14T08:00:00-07:00",
        "end_time": "2024-09-14T09:00:00-07:00",
        "external_shortcut_id": "my-event-id-1"
      }
    ]
  }'`;

	type FieldRow = { field: string; type: string; required: boolean; description: string };

	const bodyFields: FieldRow[] = [
		{ field: 'calendar_name', type: 'string', required: true, description: 'The unique slug name of your Shalendar calendar (e.g. lemon-and-pineapple).' },
		{ field: 'password', type: 'string', required: true, description: 'The shared password set when the calendar was created.' },
		{ field: 'partner_name', type: 'string', required: true, description: 'Your display name in the calendar (e.g. "Aaru" or "Vishy"). Must match a member on the calendar.' },
		{ field: 'timezone', type: 'string', required: true, description: 'Your IANA timezone string (e.g. America/Los_Angeles, America/New_York). Used to associate your events.' },
		{ field: 'events', type: 'array', required: true, description: 'Array of event objects to sync. See Event Object table below.' },
		{ field: 'sync_start', type: 'ISO 8601', required: false, description: 'Start of the sync window. Events outside this range won\'t be deleted. Defaults to earliest event start.' },
		{ field: 'sync_end', type: 'ISO 8601', required: false, description: 'End of the sync window. Defaults to latest event end.' }
	];

	const eventFields: FieldRow[] = [
		{ field: 'title', type: 'string', required: true, description: 'Event title (e.g. "Morning Run 🏃"). Supports emoji.' },
		{ field: 'start_time', type: 'ISO 8601', required: true, description: 'Start datetime with timezone offset (e.g. 2024-09-14T08:00:00-07:00).' },
		{ field: 'end_time', type: 'ISO 8601', required: true, description: 'End datetime with timezone offset.' },
		{ field: 'external_shortcut_id', type: 'string', required: true, description: 'A stable unique ID for this event (use Apple Calendar event UID or any stable unique string). Used for upsert/delete logic.' }
	];

	const altFields: { label: string; fields: string }[] = [
		{ label: 'calendar_name', fields: 'calendar_name · calendarName · x-calendar-name header' },
		{ label: 'password', fields: 'password · calendar_password · calendarPassword · x-calendar-password header · HTTP Basic Auth' },
		{ label: 'partner_name', fields: 'partner_name · partnerName · partner' },
		{ label: 'start_time', fields: 'start_time · startTime · start' },
		{ label: 'end_time', fields: 'end_time · endTime · end' },
		{ label: 'external_shortcut_id', fields: 'external_shortcut_id · externalShortcutId · id' }
	];

	const steps = [
		{
			num: 1,
			title: 'Create Your Shortcut',
			icon: Smartphone,
			color: 'orange',
			content: `Open the Shortcuts app on your iPhone. Tap the <strong>+</strong> button to create a new shortcut. Name it something like <strong>"Sync Shalendar"</strong>.`
		},
		{
			num: 2,
			title: 'Add "Find Calendar Events" Action',
			icon: CalendarIcon,
			color: 'amber',
			content: `Search for and add the <strong>"Find Calendar Events"</strong> action. Configure it to find events:
			<br><br>• <strong>Calendar:</strong> Select your main Apple Calendar (or "All Calendars")
			<br>• <strong>Date Range:</strong> Set to "in the next 7 days" (or your preferred range)
			<br>• <strong>Limit:</strong> 100 events (or remove limit)`
		},
		{
			num: 3,
			title: 'Add "Repeat with Each" Action',
			icon: RefreshCw,
			color: 'blue',
			content: `Add a <strong>"Repeat with Each"</strong> action. Set the input to the calendar events from step 2. Inside the repeat block, add a <strong>"Get Details of Calendar Events"</strong> action to extract: Title, Start Date, End Date, and Calendar Item Identifier (this is the unique ID).`
		},
		{
			num: 4,
			title: 'Build the Events Array',
			icon: Code2,
			color: 'violet',
			content: `Add a <strong>"Dictionary"</strong> action inside the repeat block with these keys:
			<br><br>• <code>title</code> → Event Title (variable)
			<br>• <code>start_time</code> → Start Date formatted as <code>ISO 8601</code>
			<br>• <code>end_time</code> → End Date formatted as <code>ISO 8601</code>
			<br>• <code>external_shortcut_id</code> → Calendar Item Identifier (variable)
			<br><br>Add an <strong>"Add to Variable"</strong> action named <code>eventsList</code> to accumulate each event dictionary.`
		},
		{
			num: 5,
			title: 'Send POST Request to /api/sync',
			icon: Globe,
			color: 'emerald',
			content: `Add a <strong>"Get Contents of URL"</strong> action:
			<br><br>• <strong>URL:</strong> <code>https://shalendar.aaryandehade.com/api/sync</code>
			<br>• <strong>Method:</strong> POST
			<br>• <strong>Headers:</strong> <code>Content-Type: application/json</code>
			<br>• <strong>Request Body:</strong> JSON with keys: <code>calendar_name</code>, <code>password</code>, <code>partner_name</code>, <code>timezone</code>, <code>sync_start</code>, <code>sync_end</code>, <code>events</code> (set to <code>eventsList</code> variable)`
		},
		{
			num: 6,
			title: 'Automate It (Optional)',
			icon: Zap,
			color: 'yellow',
			content: `Go to the <strong>Automation</strong> tab in the Shortcuts app. Create a new automation:
			<br><br>• <strong>Trigger:</strong> "Time of Day" (e.g. every morning at 7 AM)
			<br>• <strong>Action:</strong> Run your "Sync Shalendar" shortcut
			<br><br>This way your calendar syncs automatically every morning without any manual action!`
		}
	];

	const colorMap: Record<string, string> = {
		orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
		amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
		blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
		violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
		emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
		yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
	};
</script>

<svelte:head>
	<title>iOS Shortcut Setup Guide — Shalendar</title>
	<meta name="description" content="Step-by-step guide to setting up iOS Shortcuts to automatically sync your Apple Calendar events to Shalendar. Includes full API reference." />
</svelte:head>

<!-- Top Navbar -->
<header class="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<a href="/" class="flex items-center space-x-3">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
					<CalendarIcon class="w-5 h-5 text-white" />
				</div>
				<span class="text-xl font-bold tracking-tight text-white">Shalendar</span>
			</a>
			<ChevronRight class="w-4 h-4 text-slate-600" />
			<span class="text-sm font-medium text-slate-400">Setup Guide</span>
		</div>
		<a
			href="/"
			class="hidden sm:flex text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition items-center space-x-1.5"
		>
			<ArrowRight class="w-4 h-4 rotate-180" />
			<span>Back to App</span>
		</a>
	</div>
</header>

<main class="min-h-screen">
	<!-- Hero -->
	<section class="relative pt-14 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto overflow-hidden">
		<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/8 blur-[100px] rounded-full pointer-events-none"></div>

		<div class="relative text-center">
			<div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-orange-400 mb-6">
				<BookOpen class="w-3.5 h-3.5" />
				<span>iOS Shortcuts + API Reference</span>
			</div>
			<h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
				Setup Guide &amp; <span class="text-gradient">API Reference</span>
			</h1>
			<p class="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
				Connect your iPhone's Apple Calendar to Shalendar using iOS Shortcuts so your schedule syncs automatically — no app needed.
			</p>
		</div>

		<!-- Quick Nav -->
		<div class="mt-10 flex flex-wrap justify-center gap-3">
			{#each [
				{ href: '#ios-setup', label: '📱 iOS Shortcut Setup', color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300' },
				{ href: '#api-reference', label: '🔌 API Reference', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300' },
				{ href: '#payload-schema', label: '📋 Payload Schema', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300' },
				{ href: '#test-curl', label: '💻 cURL Test', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300' },
			] as item}
				<a
					href={item.href}
					class={`px-4 py-2 rounded-full bg-gradient-to-r ${item.color} border text-xs font-semibold transition hover:opacity-80`}
				>{item.label}</a>
			{/each}
		</div>
	</section>

	<!-- iOS Setup Steps -->
	<section id="ios-setup" class="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
		<div class="flex items-center space-x-3 mb-8">
			<div class="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
				<Smartphone class="w-5 h-5 text-orange-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">iOS Shortcut Setup</h2>
				<p class="text-sm text-slate-400">6 steps to auto-sync from Apple Calendar</p>
			</div>
		</div>

		<!-- Tips banner -->
		<div class="mb-8 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex gap-3">
			<Info class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
			<div class="text-sm text-slate-300 space-y-1">
				<p class="font-semibold text-amber-300">Before you start</p>
				<ul class="space-y-1 text-slate-400 list-disc list-inside">
					<li>You need a Shalendar calendar already created with your partner(s)</li>
					<li>Each person sets up <strong>their own</strong> Shortcut on their own iPhone — your events sync separately under your name</li>
					<li>Events are synced with timezone awareness; <strong>always use ISO 8601 with offset</strong> (not UTC Z-suffix) so times display correctly in every member's timezone</li>
				</ul>
			</div>
		</div>

		<div class="space-y-5">
			{#each steps as step, i}
				<div class="glass-card rounded-2xl border border-slate-800 overflow-hidden">
					<div class="flex gap-4 p-5">
						<!-- Step number badge -->
						<div class="flex-shrink-0">
							<div class={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[step.color]}`}>
								<step.icon class="w-5 h-5" />
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2.5 mb-2">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-widest">Step {step.num}</span>
							</div>
							<h3 class="text-base font-bold text-white mb-2">{step.title}</h3>
							<p class="text-sm text-slate-400 leading-relaxed">
								{@html step.content}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Shortcut Action Detail -->
		<div class="mt-8 p-5 rounded-2xl glass-panel border border-slate-700">
			<div class="flex items-center gap-2 mb-4">
				<Terminal class="w-5 h-5 text-orange-400" />
				<h3 class="font-bold text-white">Shortcut "Get Contents of URL" Configuration</h3>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{#each [
					{ key: 'URL', value: 'https://shalendar.aaryandehade.com/api/sync' },
					{ key: 'Method', value: 'POST' },
					{ key: 'Header: Content-Type', value: 'application/json' },
					{ key: 'Body Type', value: 'JSON' },
				] as row}
					<div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
						<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{row.key}</p>
						<p class="text-sm font-mono text-orange-300 break-all">{row.value}</p>
					</div>
				{/each}
			</div>
			<div class="mt-4 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
				<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">JSON Body Keys</p>
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{#each ['calendar_name', 'password', 'partner_name', 'timezone', 'sync_start', 'sync_end', 'events'] as key}
						<span class="px-2 py-1 rounded-lg bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700">{key}</span>
					{/each}
				</div>
			</div>
		</div>

		<!-- Tip: Date formatting -->
		<div class="mt-5 p-4 rounded-2xl bg-blue-500/8 border border-blue-500/20 flex gap-3">
			<AlertCircle class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
			<div class="text-sm">
				<p class="font-semibold text-blue-300 mb-1">Date Formatting in Shortcuts</p>
				<p class="text-slate-400">When adding a <strong>"Format Date"</strong> action on the event's Start/End Date, choose <strong>ISO 8601</strong> format. This preserves your local timezone offset (e.g. <code class="text-blue-300">-07:00</code>) so Shalendar can correctly display times in every member's timezone.</p>
			</div>
		</div>
	</section>

	<!-- API Reference -->
	<section id="api-reference" class="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60">
		<div class="flex items-center space-x-3 mb-8">
			<div class="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
				<Globe class="w-5 h-5 text-blue-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">API Reference</h2>
				<p class="text-sm text-slate-400">REST endpoint for syncing calendar events</p>
			</div>
		</div>

		<!-- Endpoint Card -->
		<div class="p-5 rounded-2xl glass-panel border border-slate-700 mb-6">
			<div class="flex items-center gap-3 mb-4">
				<span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider">POST</span>
				<code class="text-sm font-mono text-white">/api/sync</code>
			</div>
			<p class="text-sm text-slate-400 leading-relaxed">
				Syncs a partner's calendar events within a given date range. Events are <strong>upserted</strong> (created or updated) by <code>external_shortcut_id</code>. Events in the sync window that are not present in the payload are <strong>deleted</strong> (soft-replaced with the new payload).
			</p>

			<div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each [
					{ label: 'Auth', value: 'calendar_name + password in JSON body', icon: Shield },
					{ label: 'Content-Type', value: 'application/json', icon: Code2 },
					{ label: 'Rate Limit', value: 'None (self-hosted)', icon: Zap }
				] as meta}
					<div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
						<div class="flex items-center gap-2 mb-1">
							<meta.icon class="w-3.5 h-3.5 text-slate-400" />
							<span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{meta.label}</span>
						</div>
						<p class="text-xs text-slate-300">{meta.value}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Request Body Schema -->
		<div id="payload-schema" class="mb-6">
			<h3 class="text-lg font-bold text-white mb-4">Request Body Fields</h3>
			<div class="rounded-2xl border border-slate-800 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-slate-800 bg-slate-900/80">
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Field</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Type</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Required</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
							</tr>
						</thead>
						<tbody>
							{#each bodyFields as field, i}
								<tr class={`border-b border-slate-800/60 ${i % 2 === 0 ? 'bg-slate-900/30' : ''} hover:bg-slate-800/30 transition`}>
									<td class="px-4 py-3 font-mono text-orange-300 text-xs whitespace-nowrap">{field.field}</td>
									<td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{field.type}</td>
									<td class="px-4 py-3">
										{#if field.required}
											<span class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-semibold">required</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 text-[11px] font-semibold">optional</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-slate-400 text-xs leading-relaxed">{field.description}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Event Object Schema -->
		<div class="mb-6">
			<h3 class="text-lg font-bold text-white mb-4">Event Object Fields (inside <code class="text-orange-300">events[]</code>)</h3>
			<div class="rounded-2xl border border-slate-800 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-slate-800 bg-slate-900/80">
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Field</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Type</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Required</th>
								<th class="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
							</tr>
						</thead>
						<tbody>
							{#each eventFields as field, i}
								<tr class={`border-b border-slate-800/60 ${i % 2 === 0 ? 'bg-slate-900/30' : ''} hover:bg-slate-800/30 transition`}>
									<td class="px-4 py-3 font-mono text-orange-300 text-xs whitespace-nowrap">{field.field}</td>
									<td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{field.type}</td>
									<td class="px-4 py-3">
										{#if field.required}
											<span class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-semibold">required</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 text-[11px] font-semibold">optional</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-slate-400 text-xs leading-relaxed">{field.description}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Alternative field names -->
		<div class="p-4 rounded-2xl bg-violet-500/8 border border-violet-500/20 mb-8">
			<div class="flex items-center gap-2 mb-3">
				<Info class="w-4 h-4 text-violet-400" />
				<p class="text-sm font-semibold text-violet-300">Flexible Field Names</p>
			</div>
			<p class="text-xs text-slate-400 mb-3">The API accepts multiple aliases for each field (camelCase, snake_case, headers). All of the following are equivalent:</p>
			<div class="space-y-2">
				{#each altFields as row}
					<div class="flex items-start gap-2">
						<span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pt-0.5 w-28 flex-shrink-0">{row.label}</span>
						<div class="flex flex-wrap gap-1.5">
							{#each row.fields.split(' · ') as alias}
								<code class="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] text-violet-300 border border-slate-700">{alias}</code>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Response Format -->
		<div class="mb-8">
			<h3 class="text-lg font-bold text-white mb-4">Response Format</h3>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
				{#each [
					{ status: '200 OK', desc: 'Sync succeeded. Returns stats about created/updated/deleted events.', color: 'emerald' },
					{ status: '400 Bad Request', desc: 'Missing or invalid fields (e.g. missing calendar_name, bad date format).', color: 'amber' },
					{ status: '401 Unauthorized', desc: 'Missing or incorrect calendar password.', color: 'red' }
				] as resp}
					<div class={`p-3.5 rounded-xl border bg-${resp.color}-500/8 border-${resp.color}-500/25`}>
						<p class={`text-xs font-bold text-${resp.color}-400 mb-1`}>{resp.status}</p>
						<p class="text-xs text-slate-400">{resp.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Code Examples -->
	<section id="test-curl" class="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60">
		<div class="flex items-center space-x-3 mb-8">
			<div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
				<Code2 class="w-5 h-5 text-emerald-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">Code Examples</h2>
				<p class="text-sm text-slate-400">Copy-paste ready payloads and test commands</p>
			</div>
		</div>

		<!-- Full payload example -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-base font-bold text-white">Full Request Payload</h3>
				<button
					type="button"
					onclick={() => copyToClipboard(syncPayloadExample, 'payload')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition border border-slate-700"
				>
					{#if copiedKey === 'payload'}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
						<span class="text-emerald-400">Copied!</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
			<div class="relative rounded-2xl overflow-hidden border border-slate-800">
				<div class="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-red-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-yellow-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-green-500/60"></span>
					<span class="ml-2 text-xs text-slate-500 font-mono">POST /api/sync — request body</span>
				</div>
				<pre class="p-5 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto bg-slate-950/50"><code>{syncPayloadExample}</code></pre>
			</div>
		</div>

		<!-- Response example -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-base font-bold text-white">200 Success Response</h3>
				<button
					type="button"
					onclick={() => copyToClipboard(responseExample, 'response')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition border border-slate-700"
				>
					{#if copiedKey === 'response'}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
						<span class="text-emerald-400">Copied!</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
			<div class="relative rounded-2xl overflow-hidden border border-slate-800">
				<div class="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-red-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-yellow-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-green-500/60"></span>
					<span class="ml-2 text-xs text-slate-500 font-mono">Response — 200 OK</span>
				</div>
				<pre class="p-5 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto bg-slate-950/50"><code>{responseExample}</code></pre>
			</div>
		</div>

		<!-- cURL example -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-base font-bold text-white">cURL Test Command</h3>
				<button
					type="button"
					onclick={() => copyToClipboard(curlExample, 'curl')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition border border-slate-700"
				>
					{#if copiedKey === 'curl'}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
						<span class="text-emerald-400">Copied!</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
			<div class="relative rounded-2xl overflow-hidden border border-slate-800">
				<div class="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-red-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-yellow-500/60"></span>
					<span class="w-3 h-3 rounded-full bg-green-500/60"></span>
					<span class="ml-2 text-xs text-slate-500 font-mono">Terminal</span>
				</div>
				<pre class="p-5 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto bg-slate-950/50"><code>{curlExample}</code></pre>
			</div>
		</div>
	</section>

	<!-- FAQ -->
	<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60">
		<div class="flex items-center space-x-3 mb-8">
			<div class="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
				<CheckCircle2 class="w-5 h-5 text-violet-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">Common Questions</h2>
				<p class="text-sm text-slate-400">Troubleshooting and tips</p>
			</div>
		</div>

		<div class="space-y-4">
			{#each [
				{
					q: 'Can both people use the same Shortcut?',
					a: 'Yes! Each person creates the same Shortcut on their own iPhone. The key difference is the <code>partner_name</code> field — each person puts their own name so events are stored separately and color-coded correctly.'
				},
				{
					q: 'My events show wrong times. What\'s wrong?',
					a: 'Make sure you are formatting dates as <strong>ISO 8601 with a timezone offset</strong> (e.g. <code>2024-09-14T08:00:00-07:00</code>), NOT as UTC with a Z suffix. The UTC offset tells Shalendar your exact local time so it can convert correctly for all members.'
				},
				{
					q: 'What does external_shortcut_id do?',
					a: 'It\'s a stable unique ID for each event. Shalendar uses it to decide whether to <strong>create</strong> a new event, <strong>update</strong> an existing one, or <strong>delete</strong> events that are no longer in your calendar. Use the Apple Calendar Item Identifier — it stays the same even if you rename the event.'
				},
				{
					q: 'What is the sync window (sync_start / sync_end)?',
					a: 'The sync window defines which dates Shalendar will "manage". Events inside the window not present in your payload get deleted (they were removed from Apple Calendar). Events outside the window are left untouched. Typically set this to 1 day before today to 7 days ahead.'
				},
				{
					q: 'Do I need a server or hosting to run this?',
					a: 'The app is designed to be self-hosted (e.g. on Coolify). The public instance is at <code>shalendar.aaryandehade.com</code>. If you\'re running your own instance, replace the URL in the Shortcut with your own domain.'
				},
				{
					q: 'Can I send events for multiple people in one request?',
					a: 'No. Each request syncs events for exactly <strong>one partner</strong>. Each person runs their own Shortcut independently, which is by design — it keeps each person\'s schedule private.'
				}
			] as faq, i}
				<div class="glass-card rounded-2xl border border-slate-800 p-5">
					<h3 class="text-sm font-bold text-white mb-2 flex items-start gap-2">
						<span class="text-orange-400 font-mono text-xs mt-0.5">Q{i + 1}</span>
						{faq.q}
					</h3>
					<p class="text-sm text-slate-400 leading-relaxed pl-6">{@html faq.a}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA -->
	<section class="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
		<div class="glass-panel rounded-3xl p-8 sm:p-10 text-center border border-slate-700 relative overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
			<div class="relative">
				<div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/25">
					<Zap class="w-7 h-7 text-white" />
				</div>
				<h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to sync?</h2>
				<p class="text-slate-400 mb-7 max-w-lg mx-auto">Create your shared calendar and get both people set up with a Shortcut. Your schedules will sync automatically.</p>
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<a
						href="/"
						class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold transition shadow-lg shadow-orange-500/20"
					>
						<CalendarIcon class="w-4 h-4" />
						Create a Calendar
					</a>
					<a
						href="#ios-setup"
						class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-semibold transition"
					>
						<Smartphone class="w-4 h-4" />
						Back to Setup Guide
					</a>
				</div>
			</div>
		</div>
	</section>
</main>

<!-- Footer -->
<footer class="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
	<div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="flex items-center space-x-2">
			<span class="font-semibold text-slate-400">Shalendar</span>
			<span>— Shared Calendar Web App</span>
		</div>
		<div>
			Hosted at <span class="font-mono text-orange-400">shalendar.aaryandehade.com</span>
		</div>
	</div>
</footer>
