<script lang="ts">
 import Brand from "$lib/components/Brand.svelte";
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
	type GuideTab = "ios" | "google" | "privacy" | "api" | "schema" | "curl";
	let activeTab = $state<GuideTab>("ios");
	const guideTabs: { id: GuideTab; label: string; icon: typeof Smartphone }[] = [
		{ id: "ios", label: "iOS Shortcut Setup", icon: Smartphone },
		{ id: "google", label: "Google Calendar", icon: CalendarIcon },
		{ id: "privacy", label: "Privacy & Display", icon: Shield },
		{ id: "api", label: "API Reference", icon: Globe },
		{ id: "schema", label: "Payload Schema", icon: BookOpen },
		{ id: "curl", label: "cURL Test", icon: Terminal },
	];

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
  "partner_name": "demo-name",
  "source": "apple",
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

	const curlExample = `curl -X POST https://shalendar.aaryandehade.com/api/sync \\
  -H "Content-Type: application/json" \\
  -d '{
    "calendar_name": "shalendar-demo",
    "password": "your-shared-password",
    "partner_name": "BOTH",
    "source": "apple",
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
			description: "The calendar password for standard calendars; the selected member’s access password for privacy-capable calendars.",
		},
		{
			field: "partner_name",
			type: "string",
			required: false,
				description:
				'Member display name (e.g. "Aaru"). Standard calendars can use "BOTH"; privacy-capable calendars require one existing member name.',
		},
		{
			field: "timezone",
			type: "string",
			required: false,
			description:
				"Timezone for a newly created member (e.g. America/Los_Angeles). Defaults to UTC; event timestamps still need an offset or Z.",
		},
		{
			field: "source",
			type: "string",
			required: false,
			description: '"apple" or "google". Defaults to "apple". Sync cleanup only removes missing events from the same source.',
		},
		{
			field: "events",
			type: "array",
			required: false,
			description: "Array of event objects. Defaults to an empty array; an empty array changes nothing unless a sync window is supplied.",
		},
		{
			field: "sync_start",
			type: "ISO 8601",
			required: false,
			description:
				"Start of sync window. With sync_end, missing events fully inside the window are removed. Defaults to the earliest supplied event start when events are present.",
		},
		{
			field: "sync_end",
			type: "ISO 8601",
			required: false,
			description: "End of sync window. Defaults to the latest supplied event end when events are present.",
		},
	];

	const eventFields: FieldRow[] = [
		{
			field: "title",
			type: "string",
			required: false,
			description: "Event title (supports text and emojis). Defaults to Untitled Event.",
		},
		{
			field: "start_time",
			type: "ISO 8601",
			required: true,
			description:
				"ISO 8601 start time with an offset or Z (e.g. 2026-09-14T08:00:00-07:00).",
		},
		{
			field: "end_time",
			type: "ISO 8601",
			required: true,
			description: "ISO 8601 end time with an offset or Z.",
		},
		{
			field: "external_shortcut_id",
			type: "string",
			required: false,
				description:
				"Stable unique ID for this event within its source. Strongly recommended: without one, repeated syncs can create duplicates.",
		},
	];

	const steps = [
		{
			num: 1,
			title: "Set up your calendar and Shortcut",
			icon: Smartphone,
			color: "orange",
			content: `Create a calendar in Shalendar first. On your iPhone, create a Shortcut named <strong>Sync Shalendar</strong>. Add three <strong>Text</strong> actions for the calendar name, shared password, and your exact member name; save each with <strong>Set Variable</strong>. If editing a shared Shortcut, replace any example credentials in both Text actions and request body fields. Keep the password private when sharing or exporting a Shortcut.`,
		},
		{
			num: 2,
			title: "Find Calendar Events",
			icon: CalendarIcon,
			color: "amber",
			content: `Add <strong>Find Calendar Events</strong> and filter <strong>Start Date</strong> to the next 7 days. Add a Calendar filter if you only want to sync one Apple Calendar.`,
		},
		{
			num: 3,
			title: "Loop Events & Extract Details",
			icon: RefreshCw,
			color: "blue",
			content: `Add <strong>Repeat with Each</strong> for the found events. Inside the loop, get each event's <strong>Title</strong>, <strong>Start Date</strong>, and <strong>End Date</strong>. Format both dates as <strong>ISO 8601</strong> with time. Also get a stable unique event identifier for <code>external_shortcut_id</code>. Using the event's <strong>Name</strong> or title as the ID can merge distinct events with the same name.`,
		},
		{
			num: 4,
			title: "Format Items into JSON Dictionaries",
			icon: Code2,
			color: "violet",
			content: `Inside the loop, add a <strong>Dictionary</strong> with these keys:
            <br><br>• <code>title</code> → Title
            <br>• <code>start_time</code> → Start Date (Formatted as ISO 8601)
            <br>• <code>end_time</code> → End Date (Formatted as ISO 8601)
            <br>• <code>external_shortcut_id</code> → stable unique event ID
            <br><br>Add each dictionary to an <strong>EventList</strong> variable. Pass that list as the <code>events</code> array, including when it contains just one event.`,
		},
		{
			num: 5,
			title: "Send POST Request to /api/sync",
			icon: Globe,
			color: "emerald",
			content: `After the loop, add <strong>Get Contents of URL</strong>:
            <br><br>• <strong>URL:</strong> <code>https://shalendar.aaryandehade.com/api/sync</code>
            <br>• <strong>Method:</strong> POST
            <br>• <strong>Header:</strong> <code>Content-Type: application/json</code>
            <br>• <strong>Request Body:</strong> JSON containing <code>calendar_name</code>, <code>password</code>, <code>partner_name</code>, <code>timezone</code>, and <code>events</code> (the EventList variable). You can use the JSON body editor, or send a Text action containing valid JSON as a File body with the same header. Run it once and check for <code>success: true</code> before adding automation.`,
		},
		{
			num: 6,
			title: "Automate Background Sync",
			icon: Zap,
			color: "yellow",
			content: `In the <strong>Automation</strong> tab, add a <strong>Time of Day</strong> personal automation, set it to run daily, and select <strong>Sync Shalendar</strong>. Choose <strong>Run Immediately</strong> if available on your iOS version, or turn off <strong>Ask Before Running</strong>.`,
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
	<title>Calendar Sync Setup Guide — Shalendar</title>
	<meta
		name="description"
		content="Set up Apple Calendar or Google Calendar sync with Shalendar, including privacy-capable calendars."
	/>
</svelte:head>

<header class="site-header"><div class="site-header-inner"><Brand /><nav aria-label="Guide navigation"><a class="button-secondary" href={returnUrl}><ArrowRight size={15} class="rotate-180" />{returnLabel}</a></nav></div></header>
<main class="help-page min-h-screen text-slate-100">
	<!-- Hero -->
	<section
		class="relative pt-14 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto overflow-hidden"
	>


		<div class="relative text-center">
			<div
				class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-orange-400 mb-6"
			>
				<BookOpen class="w-3.5 h-3.5" />
				<span>Apple + Google Calendar Sync Guide</span>
			</div>
			<h1
				class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight"
			>
				Calendar Sync &amp; <span
					class="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent"
					>API Reference</span
				>
			</h1>
			<p
				class="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
			>
				Connect Apple Calendar with iOS Shortcuts or Google Calendar with Apps Script. Each member can sync their own events into the same Shalendar calendar.
			</p>
		</div>

		<div class="guide-tabs mt-8" role="group" aria-label="Guide sections">
			{#each guideTabs as tab}
				<button type="button" aria-pressed={activeTab === tab.id} onclick={() => activeTab = tab.id}>
					<tab.icon size={16} /><span>{tab.label}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- iOS Setup Steps -->
	<section
		id="ios-setup"
		hidden={activeTab !== "ios"}
		class="guide-panel py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
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

		<details class="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
			<summary class="flex items-center gap-3 text-sm font-bold text-amber-300"><Info size={18} />Before you sync</summary>
			<div class="pt-3 pl-7 text-xs sm:text-sm text-slate-300">
				<ul class="space-y-2 text-slate-400 list-disc pl-4">
					<li>
						Each member can run a copy of the Shortcut on their own iPhone.
					</li>
					<li>
						Set <code>partner_name</code> to your exact member name,
						or set it to <code>"BOTH"</code> to sync joint events to
						all members on standard calendars. Privacy-capable calendars sync one member at a time.
					</li>
					<li>Set <code>source</code> to <code>"apple"</code> or <code>"google"</code>. Each source has its own sync window and won’t remove the other source’s events.</li>
					<li>For privacy-capable calendars, use your own member name and access password. Other members only receive Busy for your event titles.</li>
					<li>
						Format dates as ISO 8601 with a timezone offset or <code>Z</code>.
					</li>
					<li>
						A stable unique event ID is needed to update the same event on later runs. A title or Name value may repeat.
					</li>
					<li>
						Without <code>sync_start</code> and <code>sync_end</code>, a run with no events will not remove previously synced events.
					</li>
					<li>
						With a sync window, missing events from the selected source are removed inside that window. Manually created events and events from the other provider are kept.
					</li>
				</ul>
			</div>
		</details>

		<div class="space-y-3">
			{#each steps as step}
				<details name="setup-step" open={step.num === 1} class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl">
					<summary class="flex items-center gap-3">
						<span class={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${colorMap[step.color]}`}><step.icon size={18} /></span>
						<span class="min-w-0"><span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Step {step.num}</span><strong class="block text-sm sm:text-base text-white">{step.title}</strong></span>
					</summary>
					<p class="pt-4 pl-13 text-xs sm:text-sm text-slate-400 leading-relaxed">{@html step.content}</p>
				</details>
			{/each}
		</div>

		<!-- Shortcut Action Detail -->
		<div
			class="mt-8 p-5 rounded-2xl bg-slate-900/80 border border-slate-800"
		>
			<div class="flex items-center gap-2 mb-4">
				<Terminal class="w-5 h-5 text-orange-400" />
				<h3 class="font-bold text-white text-sm">
					Get Contents of URL configuration
				</h3>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each [{ key: "URL", value: "https://shalendar.aaryandehade.com/api/sync" }, { key: "Method", value: "POST" }, { key: "Header: Content-Type", value: "application/json" }, { key: "Body Type", value: "JSON, or File with JSON Text" }] as row}
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

	<!-- Google Calendar Setup -->
	<section id="google-setup" hidden={activeTab !== "google"} class="guide-panel py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
		<div class="flex items-center space-x-3 mb-6">
			<div class="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center"><CalendarIcon class="w-5 h-5 text-blue-400" /></div>
			<div><h2 class="text-2xl font-bold text-white">Google Calendar Sync</h2><p class="text-xs sm:text-sm text-slate-400">Import one member’s Google Calendar events into Shalendar.</p></div>
		</div>
		<div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 mb-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
			Google sync runs in your Google account through Apps Script. The script reads a rolling window of 30 days in the past through 180 days ahead, then refreshes every 6 hours. Each Shalendar member should set up a separate script using their own member name and password for privacy-capable calendars.
		</div>
		<ol class="space-y-4 text-sm text-slate-300 list-decimal pl-6">
			<li>Open <a class="text-orange-300 underline" href="https://script.google.com/" target="_blank" rel="noreferrer">Google Apps Script</a> and create a standalone project.</li>
			<li>Download <a class="text-orange-300 underline" href="/shalendar-google-sync.gs" download>shalendar-google-sync.gs</a>, then paste its contents into the script editor and save.</li>
			<li>Under <strong>Project Settings → Script properties</strong>, add <code>SHALENDAR_NAME</code>, <code>SHALENDAR_PASSWORD</code>, and <code>SHALENDAR_MEMBER</code>. The password is your member access password on privacy-capable calendars, or the shared password on standard calendars.</li>
			<li>Optionally add <code>GOOGLE_CALENDAR_ID</code> to sync a specific calendar. Leave it unset to use your default Google Calendar.</li>
			<li>Run <code>syncGoogleCalendarToShalendar</code> once and approve Google Calendar and external request access.</li>
			<li>Run <code>installShalendarGoogleSyncTrigger</code> once to install the 6-hour refresh. Shalendar tracks Google and Apple events separately, even when the same member uses both.</li>
		</ol>
		<div class="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
			The sync window replaces only missing <code>google</code> events within its date range. Events outside that window and all Apple-synced events remain unchanged. Review the selected calendar and member properties before enabling the trigger.
		</div>
	</section>

	<!-- Privacy and display behavior -->
	<section id="privacy-display" hidden={activeTab !== "privacy"} class="guide-panel py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
		<div class="flex items-center space-x-3 mb-6">
			<div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"><Shield class="w-5 h-5 text-emerald-400" /></div>
			<div><h2 class="text-2xl font-bold text-white">Privacy & Display</h2><p class="text-xs sm:text-sm text-slate-400">Choose title privacy when you create a calendar.</p></div>
		</div>
		<div class="space-y-4 text-sm leading-relaxed text-slate-300">
			<div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
				<h3 class="font-bold text-white mb-2">Privacy-capable calendars</h3>
				<p>Turn on <strong>Privacy capable</strong> in the create-calendar form. This choice is saved with the calendar and cannot be changed later. Each member signs in with their own name and access password. Give each person only their password; event titles are replaced with <code>Busy</code> for other members. The signed-in member can add, edit, and delete only their own events. Calendar owners can manage member settings.</p>
				<p class="mt-3">The first member uses the password entered for Person 1. Enter a different password for every additional member, then share it directly with that person. Privacy calendars sync one member at a time using that member’s password.</p>
			</div>
			<div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
				<h3 class="font-bold text-white mb-2">Long events</h3>
				<p>Events lasting 23 hours or more are hidden from Day, Week, Month, and Agenda by default. Use <strong>Show 23+ hr</strong> in the calendar toolbar to display them. Hidden events still count as busy when Shalendar finds mutual free time.</p>
			</div>
		</div>
	</section>

	<!-- API Reference -->
	<section
		id="api-reference"
		hidden={activeTab !== "api" && activeTab !== "schema"}
		class="guide-panel py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
	>
		<div hidden={activeTab !== "api"} class="guide-panel">
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
				Within each member and source sync window, matches events by <code>external_shortcut_id</code> and removes stored events absent from that source’s payload. Set <code>source</code> to <code>apple</code> or <code>google</code>. Supply both <code>sync_start</code> and <code>sync_end</code> to cover a full window, including a run with zero events.
			</p>

			<div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each [{ label: "Auth", value: "calendar_name + password in JSON body", icon: Shield }, { label: "Content-Type", value: "application/json", icon: Code2 }, { label: "Response", value: "success and sync stats", icon: Zap }] as meta}
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
		</div>

		<!-- Request Body Schema -->
		<div id="payload-schema" hidden={activeTab !== "schema"} class="guide-panel">
			<h2 class="text-2xl font-bold text-white mb-1">Payload Schema</h2>
			<p class="text-sm text-slate-400 mb-7">Fields accepted by <code>/api/sync</code>.</p>
			<div class="mb-6">
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
		</div>
	</section>

	<!-- Code Examples -->
	<section
		id="test-curl"
		hidden={activeTab !== "curl"}
		class="guide-panel py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
	>
		<div class="flex items-center space-x-3 mb-6">
			<div
				class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
			>
				<Code2 class="w-5 h-5 text-emerald-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">cURL Test</h2>
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
		hidden={activeTab !== "ios"}
		class="guide-panel py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
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
				{#each [{ q: "Can one Shalendar member sync Apple and Google calendars?", a: 'Yes. Run separate Apple Shortcuts and Google Apps Script syncs with the same <code>partner_name</code>, using <code>source</code> set to <code>"apple"</code> or <code>"google"</code>. Each source cleans up only its own events.' }, { q: "How does a privacy-capable calendar work?", a: 'Privacy is chosen when the calendar is created and cannot be changed later. Each member signs in with their own name and password. Other members receive only <code>Busy</code> in place of event titles.' }, { q: "Can privacy calendars sync events for BOTH members?", a: 'No. A privacy calendar sync must authenticate one member at a time so event titles stay private.' }, { q: "Why are my event times shifted?", a: "Use ISO 8601 timestamps with an explicit offset, such as <code>2026-09-14T08:00:00-07:00</code>, or UTC with <code>Z</code>. Check the selected calendar timezone view as well." }, { q: "What is external_shortcut_id used for?", a: "It identifies the same event across runs. Use a stable unique value; an event title or Name alone may collide with another event." }, { q: "Why did an empty sync leave old events?", a: "With no events, the API needs both <code>sync_start</code> and <code>sync_end</code> to know which stored events to remove." }] as faq, i}
				<details class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<summary class="text-xs sm:text-sm font-bold text-white flex items-start gap-2">
						<span class="text-orange-400 font-mono text-xs">Q{i + 1}.</span>{faq.q}
					</summary>
					<p class="text-xs text-slate-400 leading-relaxed pt-3 pl-5">
						{@html faq.a}
					</p>
				</details>
			{/each}
		</div>
	</section>
</main>

<footer
	class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 bg-[var(--canvas)]"
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
