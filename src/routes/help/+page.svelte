<script lang="ts">
	import { page } from "$app/stores";
	import { onMount } from "svelte";
	import {
		Smartphone,
		Zap,
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
		RefreshCw,
		Shield,
		CheckCircle2,
		Info,
	} from "lucide-svelte";

	let copiedKey = $state<string | null>(null);
	let returnUrl = $state<string>("/");
	let returnLabel = $state<string>("Back to App");

	onMount(() => {
		// Detect origin or query param to dynamically set return link
		const fromParam = $page.url.searchParams.get("from");
		const calParam = $page.url.searchParams.get("calendar");

		if (calParam) {
			returnUrl = `/calendar/${calParam}`;
			returnLabel = `Back to ${calParam}`;
		} else if (fromParam) {
			returnUrl = fromParam;
			returnLabel = "Back to Calendar";
		} else if (
			document.referrer &&
			document.referrer.includes("/calendar/")
		) {
			const url = new URL(document.referrer);
			returnUrl = url.pathname;
			const parts = url.pathname.split("/");
			const calName = parts[parts.length - 1];
			returnLabel = calName ? `Back to ${calName}` : "Back to Calendar";
		}
	});

	function copyToClipboard(text: string, key: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedKey = key;
			setTimeout(() => {
				copiedKey = null;
			}, 2000);
		});
	}

	const syncPayloadExample = `{
  "calendar_name": "shalendar-demo",
  "password": "your-shared-password",
  "partner_name": "demo-name", // Use exact member name OR "BOTH" for joint events
  "timezone": "America/Los_Angeles",
  "sync_start": "2026-09-14T00:00:00-07:00",
  "sync_end": "2026-09-21T23:59:59-07:00",
  "events": [
    {
      "title": "Morning Run 🏃",
      "start_time": "2026-09-14T08:00:00-07:00",
      "end_time": "2026-09-14T09:00:00-07:00",
      "external_shortcut_id": "apple-cal-uuid-abc123"
    },
    {
      "title": "Dinner Date 🍷",
      "start_time": "2026-09-14T19:00:00-07:00",
      "end_time": "2026-09-14T21:00:00-07:00",
      "external_shortcut_id": "apple-cal-uuid-def456"
    }
  ]
}`;

	const responseExample = `{
  "success": true,
  "partners": [
    {
      "id": "partner-uuid-1",
      "name": "Aaru",
      "displayColor": "#3b82f6",
      "timezone": "America/Los_Angeles"
    }
  ],
  "range": {
    "start": "2026-09-14T07:00:00.000Z",
    "end": "2026-09-22T06:59:59.000Z"
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
    "calendar_name": "shalendar-demo",
    "password": "your-shared-password",
    "partner_name": "BOTH",
    "timezone": "America/Los_Angeles",
    "events": [
      {
        "title": "Weekend Trip 🚗",
        "start_time": "2026-09-19T09:00:00-07:00",
        "end_time": "2026-09-20T18:00:00-07:00",
        "external_shortcut_id": "trip-event-1001"
      }
    ]
  }'`;

	type FieldRow = {
		field: string;
		type: string;
		required: boolean;
		description: string;
	};

	const bodyFields: FieldRow[] = [
		{
			field: "calendar_name",
			type: "string",
			required: true,
			description:
				"The unique slug name of your Shalendar calendar (e.g. shalendar-demo).",
		},
		{
			field: "password",
			type: "string",
			required: true,
			description: "The password set when creating the calendar.",
		},
		{
			field: "partner_name",
			type: "string",
			required: true,
			description:
				'Member display name (e.g. "Aaru"). Pass "BOTH" to sync events to all members at once.',
		},
		{
			field: "timezone",
			type: "string",
			required: true,
			description:
				"IANA timezone string (e.g. America/Los_Angeles, Europe/London).",
		},
		{
			field: "events",
			type: "array",
			required: true,
			description: "Array of event objects to sync.",
		},
		{
			field: "sync_start",
			type: "ISO 8601",
			required: false,
			description:
				"Start of sync window. Unlisted events inside window are removed. Defaults to min start time.",
		},
		{
			field: "sync_end",
			type: "ISO 8601",
			required: false,
			description: "End of sync window. Defaults to max end time.",
		},
	];

	const eventFields: FieldRow[] = [
		{
			field: "title",
			type: "string",
			required: true,
			description: "Event title (supports text and emojis).",
		},
		{
			field: "start_time",
			type: "ISO 8601",
			required: true,
			description:
				"Start time with local timezone offset (e.g. 2026-09-14T08:00:00-07:00).",
		},
		{
			field: "end_time",
			type: "ISO 8601",
			required: true,
			description: "End time with local timezone offset.",
		},
		{
			field: "external_shortcut_id",
			type: "string",
			required: true,
			description:
				"Unique Apple Calendar Item Identifier (used for idempotent upsert and delete operations).",
		},
	];

	const steps = [
		{
			num: 1,
			title: "Create Your Shortcut",
			icon: Smartphone,
			color: "orange",
			content: `Open the <strong>Shortcuts</strong> app on your iPhone. Tap the <strong>+</strong> button in the top right to create a new shortcut. Name it <strong>"Sync Shalendar"</strong>.`,
		},
		{
			num: 2,
			title: "Find Calendar Events",
			icon: CalendarIcon,
			color: "amber",
			content: `Add the <strong>"Find Calendar Events"</strong> action. Configure filters:
            <br><br>• <strong>Calendar:</strong> Select your primary Apple Calendar
            <br>• <strong>Start Date:</strong> Set to <em>"is in the next 7 days"</em> (or preferred range)`,
		},
		{
			num: 3,
			title: "Loop Events & Extract Details",
			icon: RefreshCw,
			color: "blue",
			content: `Add a <strong>"Repeat with Each"</strong> action. Inside the loop, add a <strong>"Get Details of Calendar Events"</strong> action to extract:
            <br><br>• <strong>Title</strong>
            <br>• <strong>Start Date</strong>
            <br>• <strong>End Date</strong>
            <br>• <strong>Calendar Item Identifier</strong> (Required for deduplication)`,
		},
		{
			num: 4,
			title: "Format Items into JSON Dictionaries",
			icon: Code2,
			color: "violet",
			content: `Inside the loop, add a <strong>"Dictionary"</strong> action with these keys:
            <br><br>• <code>title</code> → Title
            <br>• <code>start_time</code> → Start Date (Formatted as ISO 8601)
            <br>• <code>end_time</code> → End Date (Formatted as ISO 8601)
            <br>• <code>external_shortcut_id</code> → Calendar Item Identifier
            <br><br>Pass each dictionary into an <strong>"Add to Variable"</strong> action named <code>eventsList</code>.`,
		},
		{
			num: 5,
			title: "Send POST Request to /api/sync",
			icon: Globe,
			color: "emerald",
			content: `Outside the loop, add <strong>"Get Contents of URL"</strong>:
            <br><br>• <strong>URL:</strong> <code>https://shalendar.aaryandehade.com/api/sync</code>
            <br>• <strong>Method:</strong> POST
            <br>• <strong>Header:</strong> <code>Content-Type: application/json</code>
            <br>• <strong>Request Body:</strong> JSON containing <code>calendar_name</code>, <code>password</code>, <code>partner_name</code>, <code>timezone</code>, and <code>events</code> (set to variable <code>eventsList</code>)`,
		},
		{
			num: 6,
			title: "Automate Background Sync",
			icon: Zap,
			color: "yellow",
			content: `Go to the <strong>Automation</strong> tab in Shortcuts:
            <br><br>• Select <strong>"Time of Day"</strong> (e.g. 7:00 AM daily)
            <br>• Set Action: Run <strong>"Sync Shalendar"</strong>
            <br>• Select <strong>"Run Immediately"</strong> so it syncs seamlessly in the background without prompting!`,
		},
	];

	const colorMap: Record<string, string> = {
		orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
		amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
		blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
		violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
		emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
		yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
	};
</script>

<svelte:head>
	<title>iOS Shortcut Setup Guide — Shalendar</title>
	<meta
		name="description"
		content="Step-by-step guide to setting up iOS Shortcuts to automatically sync Apple Calendar events to Shalendar."
	/>
</svelte:head>

<!-- Top Navbar -->
<header
	class="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50"
>
	<div
		class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
	>
		<div class="flex items-center space-x-3">
			<a href="/" class="flex items-center space-x-3">
				<div
					class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20"
				>
					<CalendarIcon class="w-5 h-5 text-white" />
				</div>
				<span class="text-xl font-bold tracking-tight text-white"
					>Shalendar</span
				>
			</a>
			<ChevronRight class="w-4 h-4 text-slate-600" />
			<span class="text-sm font-medium text-slate-400">Setup Guide</span>
		</div>
		<a
			href={returnUrl}
			class="flex text-sm font-semibold text-orange-400 hover:text-orange-300 px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 transition items-center space-x-2 active:scale-95"
		>
			<ArrowRight class="w-4 h-4 rotate-180" />
			<span>{returnLabel}</span>
		</a>
	</div>
</header>

<main class="min-h-screen bg-[#080c14] text-slate-100">
	<!-- Hero -->
	<section
		class="relative pt-14 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto overflow-hidden"
	>
		<div
			class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"
		></div>

		<div class="relative text-center">
			<div
				class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-orange-400 mb-6"
			>
				<BookOpen class="w-3.5 h-3.5" />
				<span>iOS Shortcuts + REST API Guide</span>
			</div>
			<h1
				class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight"
			>
				Shortcuts Setup &amp; <span
					class="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent"
					>API Reference</span
				>
			</h1>
			<p
				class="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
			>
				Connect your Apple Calendar to Shalendar via iOS Shortcuts to
				keep shared schedules updated automatically in the background.
			</p>
		</div>

		<!-- Quick Nav -->
		<div class="mt-8 flex flex-wrap justify-center gap-2.5">
			{#each [{ href: "#ios-setup", label: "📱 iOS Shortcut Setup", color: "from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300" }, { href: "#api-reference", label: "🔌 API Reference", color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300" }, { href: "#payload-schema", label: "📋 Payload Schema", color: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300" }, { href: "#test-curl", label: "💻 cURL Test", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300" }] as item}
				<a
					href={item.href}
					class={`px-3.5 py-1.5 rounded-full bg-gradient-to-r ${item.color} border text-xs font-semibold transition hover:opacity-80`}
					>{item.label}</a
				>
			{/each}
		</div>
	</section>

	<!-- iOS Setup Steps -->
	<section
		id="ios-setup"
		class="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
	>
		<div class="flex items-center space-x-3 mb-6">
			<div
				class="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center"
			>
				<Smartphone class="w-5 h-5 text-orange-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">
					iOS Shortcut Setup
				</h2>
				<p class="text-xs sm:text-sm text-slate-400">
					Step-by-step Apple Calendar sync workflow
				</p>
			</div>
		</div>

		<!-- Tips banner -->
		<div
			class="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3"
		>
			<Info class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
			<div class="text-xs sm:text-sm text-slate-300 space-y-1">
				<p class="font-semibold text-amber-300">Important Sync Notes</p>
				<ul class="space-y-1 text-slate-400 list-disc list-inside">
					<li>
						Each member runs their own Shortcut on their respective
						iPhone.
					</li>
					<li>
						Set <code>partner_name</code> to your exact member name,
						or set it to <code>"BOTH"</code> to sync joint events to
						all members.
					</li>
					<li>
						Format dates using ISO 8601 with local timezone offsets
						(e.g. <code>-07:00</code>) for accurate timezone
						conversions across members.
					</li>
				</ul>
			</div>
		</div>

		<div class="space-y-4">
			{#each steps as step}
				<div
					class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl"
				>
					<div class="flex gap-4">
						<div class="flex-shrink-0">
							<div
								class={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[step.color]}`}
							>
								<step.icon class="w-5 h-5" />
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<span
								class="text-[11px] font-bold text-slate-500 uppercase tracking-widest"
								>Step {step.num}</span
							>
							<h3 class="text-base font-bold text-white mb-1.5">
								{step.title}
							</h3>
							<p
								class="text-xs sm:text-sm text-slate-400 leading-relaxed"
							>
								{@html step.content}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Shortcut Action Detail -->
		<div
			class="mt-8 p-5 rounded-2xl bg-slate-900/80 border border-slate-800"
		>
			<div class="flex items-center gap-2 mb-4">
				<Terminal class="w-5 h-5 text-orange-400" />
				<h3 class="font-bold text-white text-sm">
					"Get Contents of URL" Configuration
				</h3>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each [{ key: "URL", value: "https://shalendar.aaryandehade.com/api/sync" }, { key: "Method", value: "POST" }, { key: "Header: Content-Type", value: "application/json" }, { key: "Body Type", value: "JSON" }] as row}
					<div
						class="p-3 rounded-xl bg-slate-950 border border-slate-800/80"
					>
						<p
							class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5"
						>
							{row.key}
						</p>
						<p class="text-xs font-mono text-orange-300 break-all">
							{row.value}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- API Reference -->
	<section
		id="api-reference"
		class="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60"
	>
		<div class="flex items-center space-x-3 mb-6">
			<div
				class="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center"
			>
				<Globe class="w-5 h-5 text-blue-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">API Reference</h2>
				<p class="text-xs sm:text-sm text-slate-400">
					REST endpoint documentation for <code>/api/sync</code>
				</p>
			</div>
		</div>

		<!-- Endpoint Card -->
		<div
			class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6"
		>
			<div class="flex items-center gap-3 mb-3">
				<span
					class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider"
					>POST</span
				>
				<code class="text-sm font-mono text-white">/api/sync</code>
			</div>
			<p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
				Upserts events using <code>external_shortcut_id</code>. Events
				inside the window that are missing from the payload are safely
				pruned.
			</p>

			<div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each [{ label: "Auth", value: "calendar_name + password in JSON body", icon: Shield }, { label: "Content-Type", value: "application/json", icon: Code2 }, { label: "Rate Limit", value: "None (Self-hosted)", icon: Zap }] as meta}
					<div
						class="p-3 rounded-xl bg-slate-950 border border-slate-800/80"
					>
						<div class="flex items-center gap-2 mb-1">
							<meta.icon class="w-3.5 h-3.5 text-slate-400" />
							<span
								class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
								>{meta.label}</span
							>
						</div>
						<p class="text-xs text-slate-300">{meta.value}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Request Body Schema -->
		<div id="payload-schema" class="mb-6">
			<h3 class="text-base font-bold text-white mb-3">
				Request Body Fields
			</h3>
			<div
				class="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr
								class="border-b border-slate-800 bg-slate-900/80 text-slate-400"
							>
								<th class="px-4 py-3 font-semibold uppercase"
									>Field</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Type</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Required</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Description</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/60">
							{#each bodyFields as field}
								<tr class="hover:bg-slate-900/40 transition">
									<td
										class="px-4 py-3 font-mono text-orange-300 whitespace-nowrap"
										>{field.field}</td
									>
									<td
										class="px-4 py-3 text-slate-400 whitespace-nowrap"
										>{field.type}</td
									>
									<td class="px-4 py-3">
										{#if field.required}
											<span
												class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-semibold"
												>required</span
											>
										{:else}
											<span
												class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold"
												>optional</span
											>
										{/if}
									</td>
									<td
										class="px-4 py-3 text-slate-400 leading-relaxed"
										>{field.description}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Event Object Schema -->
		<div class="mb-6">
			<h3 class="text-base font-bold text-white mb-3">
				Event Object Fields (inside <code class="text-orange-300"
					>events[]</code
				>)
			</h3>
			<div
				class="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr
								class="border-b border-slate-800 bg-slate-900/80 text-slate-400"
							>
								<th class="px-4 py-3 font-semibold uppercase"
									>Field</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Type</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Required</th
								>
								<th class="px-4 py-3 font-semibold uppercase"
									>Description</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/60">
							{#each eventFields as field}
								<tr class="hover:bg-slate-900/40 transition">
									<td
										class="px-4 py-3 font-mono text-orange-300 whitespace-nowrap"
										>{field.field}</td
									>
									<td
										class="px-4 py-3 text-slate-400 whitespace-nowrap"
										>{field.type}</td
									>
									<td class="px-4 py-3">
										{#if field.required}
											<span
												class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-semibold"
												>required</span
											>
										{:else}
											<span
												class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold"
												>optional</span
											>
										{/if}
									</td>
									<td
										class="px-4 py-3 text-slate-400 leading-relaxed"
										>{field.description}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>

	<!-- Code Examples -->
	<section
		id="test-curl"
		class="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60"
	>
		<div class="flex items-center space-x-3 mb-6">
			<div
				class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
			>
				<Code2 class="w-5 h-5 text-emerald-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">Code Examples</h2>
				<p class="text-xs sm:text-sm text-slate-400">
					Copy-paste ready payload samples and cURL commands
				</p>
			</div>
		</div>

		<!-- Full payload example -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-bold text-white">
					Full Request Payload
				</h3>
				<button
					type="button"
					onclick={() =>
						copyToClipboard(syncPayloadExample, "payload")}
					class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
				>
					{#if copiedKey === "payload"}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
						<span class="text-emerald-400">Copied!</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
			<div
				class="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950"
			>
				<pre
					class="p-4 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto"><code
						>{syncPayloadExample}</code
					></pre>
			</div>
		</div>

		<!-- cURL example -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-bold text-white">cURL Test Command</h3>
				<button
					type="button"
					onclick={() => copyToClipboard(curlExample, "curl")}
					class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
				>
					{#if copiedKey === "curl"}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
						<span class="text-emerald-400">Copied!</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
			<div
				class="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950"
			>
				<pre
					class="p-4 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto"><code
						>{curlExample}</code
					></pre>
			</div>
		</div>
	</section>

	<!-- FAQ -->
	<section
		class="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60"
	>
		<div class="flex items-center space-x-3 mb-6">
			<div
				class="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center"
			>
				<CheckCircle2 class="w-5 h-5 text-violet-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">Common Questions</h2>
				<p class="text-xs sm:text-sm text-slate-400">
					Frequently asked questions
				</p>
			</div>
		</div>

		<div class="space-y-3">
			{#each [{ q: "Can both members use the same Shortcut setup?", a: 'Yes! Each person runs the Shortcut on their own iPhone. Set <code>partner_name</code> to your respective member name, or set it to <code>"BOTH"</code> for joint calendar events.' }, { q: "Why are my event times shifted?", a: "Ensure your dates are formatted as <strong>ISO 8601 with local timezone offsets</strong> (e.g. <code>2026-09-14T08:00:00-07:00</code>) rather than UTC." }, { q: "What is external_shortcut_id used for?", a: "It is the unique Apple Calendar item identifier. Shalendar uses it for idempotent updates and clean deletion of removed events." }] as faq, i}
				<div
					class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
				>
					<h3
						class="text-xs sm:text-sm font-bold text-white mb-1 flex items-start gap-2"
					>
						<span class="text-orange-400 font-mono text-xs"
							>Q{i + 1}.</span
						>
						{faq.q}
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed pl-5">
						{@html faq.a}
					</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
		<div
			class="rounded-3xl p-8 text-center border border-slate-800 bg-slate-900/80 relative overflow-hidden shadow-2xl"
		>
			<div class="relative">
				<div
					class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20"
				>
					<Zap class="w-6 h-6 text-white" />
				</div>
				<h2 class="text-xl sm:text-2xl font-bold text-white mb-2">
					Ready to sync your schedule?
				</h2>
				<p
					class="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto"
				>
					Return to your calendar and complete your setup.
				</p>
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<a
						href={returnUrl}
						class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition cursor-pointer"
					>
						<CalendarIcon class="w-4 h-4" />
						<span>{returnLabel}</span>
					</a>
				</div>
			</div>
		</div>
	</section>
</main>

<footer
	class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 bg-[#080c14]"
>
	<div
		class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3"
	>
		<div class="flex items-center space-x-2">
			<span class="font-semibold text-slate-400">Shalendar</span>
			<span>— Shared Calendar Web App</span>
		</div>
		<div>
			Hosted at <span class="font-mono text-orange-400"
				>shalendar.aaryandehade.com</span
			>
		</div>
	</div>
</footer>
