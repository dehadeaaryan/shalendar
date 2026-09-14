<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import {
		Calendar as CalendarIcon,
		ChevronLeft,
		ChevronRight,
		ChevronDown,
		ChevronUp,
		Plus,
		Settings,
		Lock,
		Trash2,
		X,
		Copy,
		Check,
		Smartphone,
		List,
		Grid,
		Clock,
		Eye,
		EyeOff,
		Columns,
		Sun,
		Globe,
		Maximize2,
		Minimize2,
		UserPlus,
		AlertTriangle,
		UserX,
	} from "lucide-svelte";

	const COMMON_TIMEZONES = [
		"UTC",
		"America/New_York",
		"America/Chicago",
		"America/Denver",
		"America/Los_Angeles",
		"Europe/London",
		"Europe/Paris",
		"Asia/Tokyo",
		"Asia/Dubai",
		"Australia/Sydney",
	];

	const START_HOUR = 0;
	const END_HOUR = 24;
	const TOTAL_HOURS = END_HOUR - START_HOUR;
	const HOUR_HEIGHT = 56;

	let { data } = $props();

	// Auth Lock State
	let passwordInput = $state("");
	let showLockPassword = $state(false);
	let authError = $state("");
	let authLoading = $state(false);

	// Calendar Navigation
	let currentDate = $state(new Date());
	let viewMode = $state<"month" | "week" | "today" | "agenda">("week");

	// Timezone Perspective State
	let selectedTimezonePerspective = $state<string>("LOCAL");

	// Collapsible Days State
	let collapsedDays = $state<Record<string, boolean>>({});

	// Modals
	let showAddModal = $state(false);
	let showSettingsModal = $state(false);
	let selectedEvent = $state<any>(null);

	// Add Event Form State
	let newEventTitle = $state("");
	let newEventPartnerId = $state("");
	let newEventStart = $state(formatDateTimeInput(new Date()));
	let newEventEnd = $state(
		formatDateTimeInput(new Date(Date.now() + 3600000)),
	);
	let addError = $state("");
	let addLoading = $state(false);

	// Settings State
	let activeSettingsTab = $state<"members" | "sync" | "danger">("members");
	let memberSettings = $state<any[]>([]);
	let settingsMessage = $state("");
	let settingsLoading = $state(false);
	let newMemberName = $state("");

	// Copy State
	let copiedEndpoint = $state(false);

	$effect(() => {
		if (data.partners.length > 0) {
			memberSettings = data.partners.map((p: any) => ({
				id: p.id,
				name: p.name,
				displayColor: p.displayColor,
				timezone: p.timezone || "UTC",
			}));
			if (!newEventPartnerId) newEventPartnerId = data.partners[0].id;
		} else {
			memberSettings = [];
			newEventPartnerId = "";
		}
	});

	function formatDateTimeInput(date: Date): string {
		const pad = (n: number) => n.toString().padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function getActiveTimezoneString(): string {
		if (selectedTimezonePerspective === "UTC") return "UTC";
		if (selectedTimezonePerspective === "LOCAL") {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		}
		const member = data.partners.find(
			(p: any) => p.id === selectedTimezonePerspective,
		);
		return member ? member.timezone || "UTC" : "UTC";
	}

	let activeTimezone = $derived(getActiveTimezoneString());

	async function handleUnlock() {
		authError = "";
		if (!passwordInput) return;
		authLoading = true;
		try {
			const res = await fetch("/api/calendar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "login",
					name: data.calendarName,
					password: passwordInput,
				}),
			});
			const resData = await res.json();
			if (!res.ok) authError = resData.error || "Incorrect password";
			else {
				passwordInput = "";
				await invalidateAll();
			}
		} catch (err: any) {
			authError = err.message || "Error authenticating";
		} finally {
			authLoading = false;
		}
	}

	async function handleLockCalendar() {
		try {
			await fetch("/api/calendar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "logout",
					calendarName: data.calendarName,
				}),
			});
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleAddEvent() {
		addError = "";
		if (
			!newEventTitle ||
			!newEventPartnerId ||
			!newEventStart ||
			!newEventEnd
		) {
			addError = "Please fill out all event fields";
			return;
		}
		addLoading = true;
		try {
			const res = await fetch("/api/calendar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "create_event",
					calendarName: data.calendarName,
					partnerId: newEventPartnerId,
					title: newEventTitle,
					startTime: newEventStart,
					endTime: newEventEnd,
				}),
			});
			if (!res.ok)
				addError = (await res.json()).error || "Failed to add event";
			else {
				showAddModal = false;
				newEventTitle = "";
				await invalidateAll();
			}
		} catch (err: any) {
			addError = err.message || "Error adding event";
		} finally {
			addLoading = false;
		}
	}

	async function handleDeleteEvent(eventId: string) {
		if (!confirm("Are you sure you want to delete this event?")) return;
		try {
			await fetch("/api/calendar", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "delete_event",
					calendarName: data.calendarName,
					eventId,
				}),
			});
			selectedEvent = null;
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleSaveSettings() {
		settingsMessage = "";
		settingsLoading = true;
		try {
			for (const m of memberSettings) {
				await fetch("/api/calendar", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						calendarName: data.calendarName,
						partnerId: m.id,
						name: m.name,
						displayColor: m.displayColor,
						timezone: m.timezone,
					}),
				});
			}
			settingsMessage = "Member settings saved successfully!";
			await invalidateAll();
		} catch (e: any) {
			settingsMessage = "Failed to save settings";
		} finally {
			settingsLoading = false;
		}
	}

	async function handleAddMember() {
		if (!newMemberName) return;
		try {
			await fetch("/api/calendar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "create_member",
					calendarName: data.calendarName,
					name: newMemberName,
					displayColor: "#3b82f6",
					timezone: "UTC",
				}),
			});
			newMemberName = "";
			settingsMessage = "Member added successfully!";
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleDeleteMember(partnerId: string, name: string) {
		if (
			!confirm(
				`Are you sure you want to remove ${name} and ALL of their events? This cannot be undone.`,
			)
		)
			return;
		try {
			await fetch("/api/calendar", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "delete_member",
					calendarName: data.calendarName,
					partnerId,
				}),
			});
			settingsMessage = `${name} removed successfully.`;
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleDeleteAllEvents() {
		if (
			!confirm(
				"DANGER: Are you sure you want to delete ALL events from this calendar? This action is permanent.",
			)
		)
			return;
		try {
			await fetch("/api/calendar", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "delete_all_events",
					calendarName: data.calendarName,
				}),
			});
			showSettingsModal = false;
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	// Grid Helpers
	function getDayKey(date: Date): string {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
	}

	function isDayCollapsed(dayDate: Date, eventCount: number): boolean {
		const key = getDayKey(dayDate);
		if (collapsedDays[key] !== undefined) return collapsedDays[key];
		return eventCount === 0;
	}

	function toggleDayCollapse(dayDate: Date, eventCount: number) {
		collapsedDays[getDayKey(dayDate)] = !isDayCollapsed(
			dayDate,
			eventCount,
		);
	}

	function expandAllDaysInWeek(days: Date[]) {
		for (const d of days) collapsedDays[getDayKey(d)] = false;
	}

	function collapseAllDaysInWeek(days: Date[]) {
		for (const d of days) collapsedDays[getDayKey(d)] = true;
	}

	function formatInTimezone(isoString: string, targetTz: string): string {
		try {
			return new Date(isoString).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				timeZone: targetTz,
			});
		} catch (e) {
			return new Date(isoString).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		}
	}

	function getDecimalHourInTimezone(
		isoString: string,
		targetTz: string,
	): number {
		try {
			const parts = new Intl.DateTimeFormat("en-US", {
				hour: "numeric",
				minute: "numeric",
				hour12: false,
				timeZone: targetTz,
			}).formatToParts(new Date(isoString));
			let hour = 0,
				minute = 0;
			for (const p of parts) {
				if (p.type === "hour") hour = parseInt(p.value, 10);
				if (p.type === "minute") minute = parseInt(p.value, 10);
			}
			if (hour === 24) hour = 0;
			return hour + minute / 60;
		} catch (e) {
			const d = new Date(isoString);
			return d.getHours() + d.getMinutes() / 60;
		}
	}

	function getEventTopPx(startTimeISO: string, targetTz: string): number {
		return (
			(getDecimalHourInTimezone(startTimeISO, targetTz) - START_HOUR) *
			HOUR_HEIGHT
		);
	}

	function getEventHeightPx(
		startTimeISO: string,
		endTimeISO: string,
	): number {
		const start = new Date(startTimeISO).getTime();
		const end = new Date(endTimeISO).getTime();
		return Math.max(
			32,
			Math.max(0.5, (end - start) / 3600000) * HOUR_HEIGHT,
		);
	}

	function isSameDay(d1: Date, d2: Date) {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	function getMemberColor(partnerId: string): string {
		return (
			data.partners.find((pt: any) => pt.id === partnerId)
				?.displayColor || "#f97316"
		);
	}

	function getMemberName(partnerId: string): string {
		return (
			data.partners.find((pt: any) => pt.id === partnerId)?.name ||
			"Person"
		);
	}

	function getMemberTimezone(partnerId: string): string {
		return (
			data.partners.find((pt: any) => pt.id === partnerId)?.timezone ||
			"UTC"
		);
	}

	function shortTzLabel(tz: string, isoString: string): string {
		try {
			const parts = new Intl.DateTimeFormat("en-US", {
				timeZoneName: "short",
				timeZone: tz,
			}).formatToParts(new Date(isoString));
			return (
				parts.find((p) => p.type === "timeZoneName")?.value ||
				tz.split("/")[1] ||
				tz
			);
		} catch {
			return tz.split("/")[1] || tz;
		}
	}

	function getDaysInMonthGrid(year: number, month: number) {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days = [];
		const prevMonthLastDay = new Date(year, month, 0).getDate();

		for (let i = firstDay.getDay() - 1; i >= 0; i--)
			days.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false,
			});
		for (let day = 1; day <= lastDay.getDate(); day++)
			days.push({
				date: new Date(year, month, day),
				isCurrentMonth: true,
			});
		for (let i = 1; i <= 42 - days.length; i++)
			days.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
			});
		return days;
	}

	function getDaysInWeek(date: Date) {
		const sunday = new Date(date);
		sunday.setDate(date.getDate() - date.getDay());
		return Array.from(
			{ length: 7 },
			(_, i) =>
				new Date(
					sunday.getFullYear(),
					sunday.getMonth(),
					sunday.getDate() + i,
				),
		);
	}

	let monthDays = $derived(
		getDaysInMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
	);
	let weekDays = $derived(getDaysInWeek(currentDate));

	function getEventsForDayAndMember(dayDate: Date, memberId: string) {
		return data.events.filter(
			(evt: any) =>
				evt.partnerId === memberId &&
				isSameDay(new Date(evt.startTime), dayDate),
		);
	}

	function getEventsForDay(dayDate: Date) {
		return data.events.filter((evt: any) =>
			isSameDay(new Date(evt.startTime), dayDate),
		);
	}

	function computeEventColumns(
		events: any[],
	): { evt: any; col: number; totalCols: number }[] {
		if (events.length === 0) return [];
		const sorted = [...events].sort(
			(a, b) =>
				new Date(a.startTime).getTime() -
				new Date(b.startTime).getTime(),
		);
		const colEnds: number[] = [];
		const evtCol = new Map<any, number>();

		for (const evt of sorted) {
			const start = new Date(evt.startTime).getTime();
			let placed = false;
			for (let c = 0; c < colEnds.length; c++) {
				if (colEnds[c] <= start) {
					colEnds[c] = new Date(evt.endTime).getTime();
					evtCol.set(evt, c);
					placed = true;
					break;
				}
			}
			if (!placed) {
				evtCol.set(evt, colEnds.length);
				colEnds.push(new Date(evt.endTime).getTime());
			}
		}

		return sorted.map((evt) => {
			const col = evtCol.get(evt)!;
			const evtStart = new Date(evt.startTime).getTime();
			const evtEnd = new Date(evt.endTime).getTime();
			let maxCol = col;
			for (const other of sorted) {
				if (other === evt) continue;
				if (
					new Date(other.startTime).getTime() < evtEnd &&
					new Date(other.endTime).getTime() > evtStart
				) {
					maxCol = Math.max(maxCol, evtCol.get(other)!);
				}
			}
			return { evt, col, totalCols: maxCol + 1 };
		});
	}

	function prevPeriod() {
		currentDate =
			viewMode === "month"
				? new Date(
						currentDate.getFullYear(),
						currentDate.getMonth() - 1,
						1,
					)
				: viewMode === "week"
					? new Date(currentDate.getTime() - 7 * 86400000)
					: new Date(currentDate.getTime() - 86400000);
	}

	function nextPeriod() {
		currentDate =
			viewMode === "month"
				? new Date(
						currentDate.getFullYear(),
						currentDate.getMonth() + 1,
						1,
					)
				: viewMode === "week"
					? new Date(currentDate.getTime() + 7 * 86400000)
					: new Date(currentDate.getTime() + 86400000);
	}

	function goToday() {
		currentDate = new Date();
	}

	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	const hoursList = Array.from(
		{ length: TOTAL_HOURS + 1 },
		(_, i) => START_HOUR + i,
	);

	function autoScrollGrid(node: HTMLElement) {
		node.scrollTop = Math.max(0, (new Date().getHours() - 1) * HOUR_HEIGHT);
	}
</script>

<div class="min-h-screen flex flex-col bg-[#090d16]">
	<header
		class="border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-40"
	>
		<div
			class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
		>
			<div class="flex items-center justify-between w-full sm:w-auto">
				<div class="flex items-center space-x-2.5">
					<a href="/" class="flex items-center space-x-2 group">
						<div
							class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition"
						>
							<CalendarIcon
								class="w-4 h-4 sm:w-5 sm:h-5 text-white"
							/>
						</div>
					</a>
					<div class="flex items-center space-x-2">
						<h1
							class="text-base sm:text-lg font-bold text-white tracking-tight capitalize truncate max-w-[140px] sm:max-w-none"
						>
							{data.calendarName}
						</h1>
						<span
							class="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium"
							>Shared</span
						>
					</div>
				</div>
			</div>

			{#if data.isAuthenticated}
				<div
					class="flex items-center justify-between sm:justify-end space-x-1.5 sm:space-x-3 text-xs w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/60"
				>
					<div
						class="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1.5 sm:px-3 rounded-xl border border-slate-800 flex-1 sm:flex-none max-w-[55%] sm:max-w-none"
					>
						<Globe class="w-3.5 h-3.5 text-orange-400 shrink-0" />
						<span
							class="hidden md:inline text-slate-400 font-medium shrink-0"
							>View in:</span
						>
						<select
							bind:value={selectedTimezonePerspective}
							class="bg-transparent text-white font-semibold focus:outline-none cursor-pointer w-full truncate text-[11px] sm:text-xs"
						>
							<option
								value="LOCAL"
								class="bg-slate-900 text-white"
								>Local ({activeTimezone.split("/")[1] ||
									activeTimezone})</option
							>
							{#each data.partners as member}
								<option
									value={member.id}
									class="bg-slate-900 text-white"
									>{member.name} ({member.timezone.split(
										"/",
									)[1] || member.timezone})</option
								>
							{/each}
							<option value="UTC" class="bg-slate-900 text-white"
								>UTC</option
							>
						</select>
					</div>

					<div class="flex items-center space-x-1.5 shrink-0">
						<button
							type="button"
							onclick={() => (showAddModal = true)}
							class="flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md shadow-orange-500/20 transition"
						>
							<Plus class="w-4 h-4 shrink-0" />
							<span class="hidden sm:inline">Add Event</span>
						</button>
						<button
							type="button"
							onclick={() => (showSettingsModal = true)}
							class="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
							title="Settings"
						>
							<Settings class="w-4 h-4 shrink-0" />
						</button>
						<button
							type="button"
							onclick={handleLockCalendar}
							class="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center space-x-1"
						>
							<Lock class="w-4 h-4 shrink-0" />
							<span class="hidden md:inline text-xs font-semibold"
								>Lock</span
							>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</header>

	<main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{#if !data.isAuthenticated}
			<div
				class="max-w-md mx-auto my-16 glass-panel rounded-2xl p-8 border border-slate-800 text-center shadow-2xl"
			>
				<div
					class="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4 text-orange-400"
				>
					<Lock class="w-7 h-7" />
				</div>
				<h2 class="text-xl font-bold text-white mb-2">
					Protected Calendar
				</h2>
				<p class="text-slate-400 text-sm mb-6">
					Enter password to unlock <span
						class="text-white font-medium capitalize"
						>{data.calendarName}</span
					>.
				</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleUnlock();
					}}
					class="space-y-4"
				>
					{#if authError}
						<div
							class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
						>
							{authError}
						</div>
					{/if}
					<div class="relative">
						<input
							type={showLockPassword ? "text" : "password"}
							bind:value={passwordInput}
							placeholder="Enter calendar password"
							required
							class="w-full px-4 py-3 rounded-xl glass-input text-sm text-center pr-10"
						/>
						<button
							type="button"
							onclick={() =>
								(showLockPassword = !showLockPassword)}
							class="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
						>
							{#if showLockPassword}<EyeOff
									class="w-4 h-4"
								/>{:else}<Eye class="w-4 h-4" />{/if}
						</button>
					</div>
					<button
						type="submit"
						disabled={authLoading}
						class="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
					>
						{authLoading ? "Verifying..." : "Unlock Calendar"}
					</button>
				</form>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Navigation Bar -->
				<div
					class="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
				>
					<div
						class="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3 w-full sm:w-auto"
					>
						<h2
							class="text-base sm:text-xl font-bold text-white tracking-tight truncate"
						>
							{#if viewMode === "today"}
								{isSameDay(currentDate, new Date())
									? `Today, ${currentDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
									: currentDate.toLocaleDateString([], {
											weekday: "short",
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
							{:else if viewMode === "week"}
								{weekDays[0].toLocaleDateString([], {
									month: "short",
									day: "numeric",
								})} – {weekDays[6].toLocaleDateString([], {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							{:else}
								{monthNames[currentDate.getMonth()]}
								{currentDate.getFullYear()}
							{/if}
						</h2>
						<div
							class="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0"
						>
							<button
								type="button"
								onclick={prevPeriod}
								class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
								><ChevronLeft class="w-4 h-4" /></button
							>
							<button
								type="button"
								onclick={goToday}
								class={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isSameDay(currentDate, new Date()) ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "hover:bg-slate-800 text-slate-300"}`}
								>Today</button
							>
							<button
								type="button"
								onclick={nextPeriod}
								class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
								><ChevronRight class="w-4 h-4" /></button
							>
						</div>
					</div>

					<div
						class="grid grid-cols-4 sm:flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs w-full sm:w-auto"
					>
						<button
							type="button"
							onclick={() => (viewMode = "today")}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium flex items-center justify-center space-x-1.5 ${viewMode === "today" ? "bg-orange-500/20 text-orange-400 font-bold" : "text-slate-400"}`}
							><Sun class="w-3.5 h-3.5 shrink-0" /><span
								>Today</span
							></button
						>
						<button
							type="button"
							onclick={() => (viewMode = "week")}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium flex items-center justify-center space-x-1.5 ${viewMode === "week" ? "bg-orange-500/20 text-orange-400 font-bold" : "text-slate-400"}`}
							><Columns class="w-3.5 h-3.5 shrink-0" /><span
								>Week</span
							></button
						>
						<button
							type="button"
							onclick={() => (viewMode = "month")}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium flex items-center justify-center space-x-1.5 ${viewMode === "month" ? "bg-orange-500/20 text-orange-400 font-bold" : "text-slate-400"}`}
							><Grid class="w-3.5 h-3.5 shrink-0" /><span
								>Month</span
							></button
						>
						<button
							type="button"
							onclick={() => (viewMode = "agenda")}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium flex items-center justify-center space-x-1.5 ${viewMode === "agenda" ? "bg-orange-500/20 text-orange-400 font-bold" : "text-slate-400"}`}
							><List class="w-3.5 h-3.5 shrink-0" /><span
								>Agenda</span
							></button
						>
					</div>
				</div>

				<!-- VIEW 1: TODAY HOURLY TIME-GRID -->
				{#if viewMode === "today"}
					<div
						class="glass-panel rounded-2xl border border-slate-800 p-3.5 sm:p-4 space-y-4"
					>
						<div
							class="flex items-center justify-between border-b border-slate-800 pb-3"
						>
							<div class="flex items-center space-x-3">
								<div
									class="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0"
								>
									<Sun class="w-4 h-4" />
								</div>
								<div>
									<h3 class="text-base font-bold text-white">
										Daily Schedule Grid
									</h3>
								</div>
							</div>
						</div>

						<div
							class="max-h-[650px] overflow-y-auto overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60"
							use:autoScrollGrid
						>
							<div
								class="min-w-[320px] sm:min-w-[700px] grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] relative"
							>
								<div
									class="border-r border-slate-800 bg-slate-900/60 divide-y divide-slate-800/60"
								>
									<div
										class="h-10 bg-slate-900 border-b border-slate-800 sticky top-0 z-20"
									></div>
									{#each hoursList.slice(0, TOTAL_HOURS) as hr}
										<div
											class="h-[56px] px-1 sm:px-2 text-[10px] font-mono text-slate-500 flex items-start pt-1 justify-end"
										>
											{hr === 0
												? "12 AM"
												: hr === 12
													? "12 PM"
													: hr > 12
														? `${hr - 12} PM`
														: `${hr} AM`}
										</div>
									{/each}
								</div>
								<div
									class="grid divide-x divide-slate-800/80 w-full"
									style="grid-template-columns: repeat({Math.max(
										1,
										data.partners.length,
									)}, minmax(0, 1fr))"
								>
									{#if data.partners.length === 0}
										<div
											class="flex items-center justify-center h-full text-slate-500 text-sm py-12"
										>
											No members added yet.
										</div>
									{/if}
									{#each data.partners as member}
										<div class="flex flex-col">
											<div
												class="h-10 px-2 sm:px-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-20"
											>
												<div
													class="flex items-center space-x-1.5 truncate"
												>
													<span
														class="w-2.5 h-2.5 rounded-full shrink-0"
														style="background-color: {member.displayColor}"
													></span>
													<span
														class="text-xs font-bold text-white truncate"
														>{member.name}</span
													>
												</div>
											</div>
											<div
												class="relative"
												style="height: {TOTAL_HOURS *
													HOUR_HEIGHT}px"
											>
												{#each hoursList.slice(0, TOTAL_HOURS) as _, idx}
													<div
														class="absolute w-full border-b border-slate-800/40"
														style="top: {idx *
															HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"
													></div>
												{/each}
												{#each computeEventColumns(getEventsForDayAndMember(currentDate, member.id)) as { evt, col, totalCols }}
													<button
														type="button"
														onclick={() =>
															(selectedEvent =
																evt)}
														class="absolute p-1.5 rounded-lg text-xs font-medium overflow-hidden shadow-md flex flex-col justify-between text-left cursor-pointer z-10"
														style="top: {getEventTopPx(
															evt.startTime,
															activeTimezone,
														)}px; height: {getEventHeightPx(
															evt.startTime,
															evt.endTime,
														)}px; left: calc({(col /
															totalCols) *
															100}% + 2px); width: calc({(1 /
															totalCols) *
															100}% - 4px); background-color: {member.displayColor}28; border-left: 3px solid {member.displayColor}; border-top: 1px solid {member.displayColor}44"
													>
														<span
															class="font-bold text-white truncate text-[11px] leading-tight"
															>{evt.title}</span
														>
														<span
															class="text-[9px] text-slate-300 font-mono truncate"
															>{formatInTimezone(
																evt.startTime,
																activeTimezone,
															)}–{formatInTimezone(
																evt.endTime,
																activeTimezone,
															)}</span
														>
													</button>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- VIEW 2: THIS WEEK -->
				{:else if viewMode === "week"}
					<div
						class="glass-panel rounded-2xl border border-slate-800 p-4 space-y-6"
					>
						<div
							class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2.5"
						>
							<h3 class="text-base font-bold text-white">
								This Week's Daily Grids
							</h3>
							<div class="flex items-center space-x-2">
								<button
									type="button"
									onclick={() =>
										expandAllDaysInWeek(weekDays)}
									class="px-2.5 py-1 rounded-lg bg-slate-900 text-[11px] font-semibold text-slate-300 border border-slate-800 flex items-center space-x-1"
									><Maximize2
										class="w-3 h-3 text-orange-400"
									/><span>Expand All</span></button
								>
								<button
									type="button"
									onclick={() =>
										collapseAllDaysInWeek(weekDays)}
									class="px-2.5 py-1 rounded-lg bg-slate-900 text-[11px] font-semibold text-slate-300 border border-slate-800 flex items-center space-x-1"
									><Minimize2
										class="w-3 h-3 text-slate-400"
									/><span>Collapse All</span></button
								>
							</div>
						</div>
						<div class="space-y-4">
							{#each weekDays as day}
								{@const dayEvents = getEventsForDay(day)}
								{@const isCollapsed = isDayCollapsed(
									day,
									dayEvents.length,
								)}
								<div
									class={`rounded-xl border transition ${isSameDay(day, new Date()) ? "border-orange-500/50 bg-slate-900/40" : "border-slate-800 bg-slate-950/40"}`}
								>
									<button
										type="button"
										onclick={() =>
											toggleDayCollapse(
												day,
												dayEvents.length,
											)}
										class="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-900/60 rounded-xl transition"
									>
										<div
											class="flex items-center space-x-3"
										>
											<span
												class={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isSameDay(day, new Date()) ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"}`}
												>{day.getDate()}</span
											>
											<span
												class="text-sm font-bold text-white"
												>{day.toLocaleDateString([], {
													weekday: "long",
													month: "short",
												})}</span
											>
										</div>
										<div
											class="flex items-center space-x-3"
										>
											<span
												class="text-[11px] text-slate-400 font-mono"
												>{dayEvents.length} event(s)</span
											>
											{#if isCollapsed}<ChevronDown
													class="w-4 h-4 text-slate-400"
												/>{:else}<ChevronUp
													class="w-4 h-4 text-orange-400"
												/>{/if}
										</div>
									</button>
									{#if !isCollapsed}
										<div
											class="p-2 sm:p-4 pt-0 border-t border-slate-800/80"
										>
											<div
												class="max-h-[480px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 mt-3"
												use:autoScrollGrid
											>
												<div
													class="min-w-[320px] sm:min-w-[650px] grid grid-cols-[40px_1fr] sm:grid-cols-[50px_1fr] relative"
												>
													<div
														class="border-r border-slate-800/80 bg-slate-900/60 divide-y divide-slate-800/60"
													>
														<div
															class="h-8 bg-slate-900 border-b border-slate-800 sticky top-0 z-20"
														></div>
														{#each hoursList.slice(0, TOTAL_HOURS) as hr}
															<div
																class="h-[56px] px-1 text-[9px] font-mono text-slate-500 flex items-start pt-1 justify-end"
															>
																{hr === 0
																	? "12A"
																	: hr > 12
																		? `${hr - 12}P`
																		: `${hr}A`}
															</div>
														{/each}
													</div>
													<div
														class="grid divide-x divide-slate-800/80 w-full"
														style="grid-template-columns: repeat({Math.max(
															1,
															data.partners
																.length,
														)}, minmax(0, 1fr))"
													>
														{#each data.partners as member}
															<div
																class="flex flex-col"
															>
																<div
																	class="h-8 px-2 border-b border-slate-800/80 bg-slate-900/90 flex items-center sticky top-0 z-20"
																>
																	<span
																		class="w-2 h-2 rounded-full shrink-0 mr-1.5"
																		style="background-color: {member.displayColor}"
																	></span>
																	<span
																		class="text-[11px] font-bold text-slate-200 truncate"
																		>{member.name}</span
																	>
																</div>
																<div
																	class="relative"
																	style="height: {TOTAL_HOURS *
																		HOUR_HEIGHT}px"
																>
																	{#each hoursList.slice(0, TOTAL_HOURS) as _, idx}
																		<div
																			class="absolute w-full border-b border-slate-800/40"
																			style="top: {idx *
																				HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"
																		></div>
																	{/each}
																	{#each computeEventColumns(getEventsForDayAndMember(day, member.id)) as { evt, col, totalCols }}
																		<button
																			type="button"
																			onclick={() =>
																				(selectedEvent =
																					evt)}
																			class="absolute p-1 rounded text-[11px] font-medium flex flex-col justify-between text-left z-10"
																			style="top: {getEventTopPx(
																				evt.startTime,
																				activeTimezone,
																			)}px; height: {getEventHeightPx(
																				evt.startTime,
																				evt.endTime,
																			)}px; left: calc({(col /
																				totalCols) *
																				100}% + 2px); width: calc({(1 /
																				totalCols) *
																				100}% - 4px); background-color: {member.displayColor}28; border-left: 3px solid {member.displayColor}; border-top: 1px solid {member.displayColor}44"
																		>
																			<span
																				class="font-bold text-white truncate text-[10px]"
																				>{evt.title}</span
																			>
																		</button>
																	{/each}
																</div>
															</div>
														{/each}
													</div>
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<!-- VIEW 3: MONTH -->
				{:else if viewMode === "month"}
					<div
						class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl"
					>
						<div
							class="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60 text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400"
						>
							<div>Sun</div>
							<div>Mon</div>
							<div>Tue</div>
							<div>Wed</div>
							<div>Thu</div>
							<div>Fri</div>
							<div>Sat</div>
						</div>
						<div
							class="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/40"
						>
							{#each monthDays as day}
								<div
									class={`min-h-[110px] p-2 flex flex-col transition ${day.isCurrentMonth ? "bg-slate-900/20" : "bg-slate-950/80 text-slate-600"}`}
								>
									<div
										class="mb-1.5 text-xs font-bold flex justify-center items-center w-6 h-6 rounded-full {isSameDay(
											day.date,
											new Date(),
										)
											? 'bg-orange-500 text-white shadow-md'
											: day.isCurrentMonth
												? 'text-slate-300'
												: 'text-slate-600'}"
									>
										{day.date.getDate()}
									</div>
									<div
										class="space-y-1 overflow-y-auto max-h-[85px]"
									>
										{#each getEventsForDay(day.date) as evt}
											<button
												type="button"
												onclick={() =>
													(selectedEvent = evt)}
												class="w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate flex items-center space-x-1.5"
												style="background-color: {getMemberColor(
													evt.partnerId,
												)}22; border-left: 3px solid {getMemberColor(
													evt.partnerId,
												)}"
											>
												<span
													class="truncate text-slate-200"
													>{evt.title}</span
												>
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- VIEW 4: AGENDA -->
				{:else}
					<div
						class="glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4"
					>
						<h3
							class="text-base sm:text-lg font-bold text-white flex items-center space-x-2"
						>
							<List class="w-5 h-5 text-orange-400" /><span
								>Upcoming Agenda</span
							>
						</h3>
						{#if data.events.length === 0}
							<div
								class="text-center py-12 text-slate-500 text-sm"
							>
								No events found. Click "Add Event" or sync via
								iOS Shortcuts!
							</div>
						{:else}
							<div class="space-y-2.5">
								{#each data.events
									.slice()
									.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) as evt}
									<div
										class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition gap-2.5"
									>
										<button
											type="button"
											onclick={() =>
												(selectedEvent = evt)}
											class="flex-1 text-left flex items-start sm:items-center space-x-3 cursor-pointer min-w-0"
										>
											<div
												class="w-2.5 h-9 rounded-full shrink-0"
												style="background-color: {getMemberColor(
													evt.partnerId,
												)}"
											></div>
											<div class="min-w-0 flex-1">
												<h4
													class="text-xs sm:text-sm font-bold text-white truncate"
												>
													{evt.title}
												</h4>
												<div
													class="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1"
												>
													<span
														class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
														style="background-color: {getMemberColor(
															evt.partnerId,
														)}33; color: {getMemberColor(
															evt.partnerId,
														)}"
														>{getMemberName(
															evt.partnerId,
														)}</span
													>
													<span
														class="flex items-center gap-1 font-mono text-slate-300 text-[11px]"
														><Clock
															class="w-3 h-3 text-slate-400"
														/>{formatInTimezone(
															evt.startTime,
															activeTimezone,
														)} – {formatInTimezone(
															evt.endTime,
															activeTimezone,
														)}</span
													>
												</div>
											</div>
										</button>
										<button
											type="button"
											onclick={() =>
												handleDeleteEvent(evt.id)}
											class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
											><Trash2 class="w-4 h-4" /></button
										>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<!-- Modal: Add Event -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
	>
		<div
			class="glass-panel w-full max-w-md rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4"
		>
			<div
				class="flex items-center justify-between border-b border-slate-800 pb-3"
			>
				<h3 class="text-base font-bold text-white">Add New Event</h3>
				<button
					type="button"
					onclick={() => (showAddModal = false)}
					class="text-slate-400 hover:text-white"
					><X class="w-5 h-5" /></button
				>
			</div>
			{#if addError}<div
					class="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs border border-red-500/30"
				>
					{addError}
				</div>{/if}
			<div class="space-y-3">
				<div>
					<label
						for="event-title-input"
						class="block text-xs font-semibold text-slate-400 mb-1"
						>Event Title</label
					>
					<input
						id="event-title-input"
						type="text"
						bind:value={newEventTitle}
						placeholder="e.g. Dinner Date"
						class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
					/>
				</div>
				<div>
					<label
						for="event-partner-select"
						class="block text-xs font-semibold text-slate-400 mb-1"
						>Person</label
					>
					<select
						id="event-partner-select"
						bind:value={newEventPartnerId}
						class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-slate-900"
					>
						{#each data.partners as partner}
							<option value={partner.id}>{partner.name}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label
							for="event-start-input"
							class="block text-xs font-semibold text-slate-400 mb-1"
							>Start Time</label
						>
						<input
							id="event-start-input"
							type="datetime-local"
							bind:value={newEventStart}
							class="w-full px-3 py-2 rounded-xl glass-input text-xs"
						/>
					</div>
					<div>
						<label
							for="event-end-input"
							class="block text-xs font-semibold text-slate-400 mb-1"
							>End Time</label
						>
						<input
							id="event-end-input"
							type="datetime-local"
							bind:value={newEventEnd}
							class="w-full px-3 py-2 rounded-xl glass-input text-xs"
						/>
					</div>
				</div>
			</div>
			<div class="pt-2 flex justify-end space-x-2">
				<button
					type="button"
					onclick={() => (showAddModal = false)}
					class="px-4 py-2 rounded-xl text-xs text-slate-400"
					>Cancel</button
				>
				<button
					type="button"
					onclick={handleAddEvent}
					disabled={addLoading}
					class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold text-xs disabled:opacity-50"
					>Save Event</button
				>
			</div>
		</div>
	</div>
{/if}

<!-- Modal: Event Detail -->
{#if selectedEvent}
	<div
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
	>
		<div
			class="glass-panel w-full max-w-sm rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-center space-x-2">
					<span
						class="w-3 h-3 rounded-full"
						style="background-color: {getMemberColor(
							selectedEvent.partnerId,
						)}"
					></span>
					<span class="text-xs font-semibold text-slate-400"
						>{getMemberName(selectedEvent.partnerId)}</span
					>
				</div>
				<button
					type="button"
					onclick={() => (selectedEvent = null)}
					class="text-slate-400"><X class="w-5 h-5" /></button
				>
			</div>
			<h3 class="text-lg font-bold text-white leading-snug">
				{selectedEvent.title}
			</h3>
			<div
				class="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800"
			>
				<div class="flex gap-2">
					<span class="text-slate-500">Local:</span>
					<span class="font-bold text-white"
						>{formatInTimezone(
							selectedEvent.startTime,
							activeTimezone,
						)} – {formatInTimezone(
							selectedEvent.endTime,
							activeTimezone,
						)}</span
					>
				</div>
			</div>
			<div class="flex items-center justify-between pt-2">
				<button
					type="button"
					onclick={() => handleDeleteEvent(selectedEvent.id)}
					class="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition"
					><Trash2 class="w-3.5 h-3.5" /><span>Delete</span></button
				>
				<button
					type="button"
					onclick={() => (selectedEvent = null)}
					class="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs"
					>Close</button
				>
			</div>
		</div>
	</div>
{/if}

<!-- Modal: Settings & iOS Sync Assistant -->
{#if showSettingsModal}
	<div
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
	>
		<div
			class="glass-panel w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-slate-800 shadow-2xl"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80"
			>
				<div class="flex items-center space-x-3">
					<Settings class="w-5 h-5 text-orange-400" />
					<h3 class="text-lg font-bold text-white">
						Calendar Settings
					</h3>
				</div>
				<button
					type="button"
					onclick={() => (showSettingsModal = false)}
					class="text-slate-400 hover:text-white"
					><X class="w-5 h-5" /></button
				>
			</div>

			<!-- Tabs -->
			<div
				class="flex border-b border-slate-800 px-5 bg-slate-900/50 space-x-6 text-sm"
			>
				<button
					onclick={() => (activeSettingsTab = "members")}
					class={`py-3 border-b-2 transition ${activeSettingsTab === "members" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
					>Members</button
				>
				<button
					onclick={() => (activeSettingsTab = "sync")}
					class={`py-3 border-b-2 transition ${activeSettingsTab === "sync" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
					>API & Sync</button
				>
				<button
					onclick={() => (activeSettingsTab = "danger")}
					class={`py-3 border-b-2 transition ${activeSettingsTab === "danger" ? "border-red-500 text-red-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
					>Danger Zone</button
				>
			</div>

			<!-- Content Area -->
			<div class="p-5 overflow-y-auto max-h-[60vh] space-y-6">
				{#if settingsMessage}
					<div
						class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"
					>
						{settingsMessage}
					</div>
				{/if}

				{#if activeSettingsTab === "members"}
					<div class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{#each memberSettings as member}
								<div
									class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 relative group"
								>
									<button
										type="button"
										onclick={() =>
											handleDeleteMember(
												member.id,
												member.name,
											)}
										class="absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1 bg-slate-950 rounded-md border border-slate-800 transition"
										title="Remove Member"
									>
										<UserX class="w-3.5 h-3.5" />
									</button>
									<div class="space-y-3">
										<input
											type="text"
											bind:value={member.name}
											placeholder="Name"
											class="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
										/>
										<div>
											<label
												class="block text-[11px] text-slate-400 mb-1"
												>Timezone</label
											>
											<select
												bind:value={member.timezone}
												class="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs bg-slate-900"
											>
												{#each COMMON_TIMEZONES as tz}<option
														value={tz}>{tz}</option
													>{/each}
											</select>
										</div>
										<div
											class="flex items-center space-x-3 pt-1"
										>
											<input
												type="color"
												bind:value={member.displayColor}
												class="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
											/>
											<span
												class="text-xs font-mono text-slate-400"
												>Color</span
											>
										</div>
									</div>
								</div>
							{/each}
						</div>

						{#if memberSettings.length > 0}
							<button
								type="button"
								onclick={handleSaveSettings}
								disabled={settingsLoading}
								class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold text-xs disabled:opacity-50"
							>
								{settingsLoading
									? "Saving..."
									: "Save Member Settings"}
							</button>
						{/if}

						<div class="mt-6 pt-6 border-t border-slate-800">
							<h4
								class="text-sm font-bold text-white flex items-center space-x-2 mb-3"
							>
								<UserPlus
									class="w-4 h-4 text-orange-400"
								/><span>Add New Member</span>
							</h4>
							<div class="flex items-center space-x-3">
								<input
									type="text"
									bind:value={newMemberName}
									placeholder="Member's Name"
									class="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
								/>
								<button
									type="button"
									onclick={handleAddMember}
									disabled={!newMemberName}
									class="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 hover:bg-slate-700"
									>Add</button
								>
							</div>
						</div>
					</div>
				{:else if activeSettingsTab === "sync"}
					<div class="space-y-4">
						<div
							class="flex items-center space-x-2 text-orange-400"
						>
							<Smartphone class="w-5 h-5" />
							<h4 class="text-sm font-bold text-white">
								iOS Shortcuts REST Sync Guide
							</h4>
						</div>
						<p class="text-xs text-slate-400">
							Sync your Apple Calendar events automatically via a
							single POST request right from your iPhone!
						</p>

						<div class="space-y-1.5">
							<span class="text-xs font-semibold text-slate-300"
								>POST Endpoint URL</span
							>
							<div
								class="flex items-center justify-between p-3 rounded-xl bg-slate-950 font-mono text-xs text-orange-400 border border-slate-800"
							>
								<span
									>https://shalendar.aaryandehade.com/api/sync</span
								>
								<button
									type="button"
									onclick={() => {
										navigator.clipboard.writeText(
											"https://shalendar.aaryandehade.com/api/sync",
										);
										copiedEndpoint = true;
										setTimeout(
											() => (copiedEndpoint = false),
											2000,
										);
									}}
									class="text-slate-400 hover:text-white p-1"
								>
									{#if copiedEndpoint}<Check
											class="w-4 h-4 text-emerald-400"
										/>{:else}<Copy class="w-4 h-4" />{/if}
								</button>
							</div>
						</div>

						<div class="space-y-1.5">
							<span class="text-xs font-semibold text-slate-300"
								>Sample iOS Shortcut JSON Body</span
							>
							<pre
								class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto">
{JSON.stringify(
									{
										calendar_name: data.calendarName,
										password: "YOUR_PASSWORD",
										partner_name:
											memberSettings[0]?.name ||
											"Person 1",
										events: [
											{
												title: "Team Sync / Meeting",
												start_time:
													"2026-09-13T10:00:00-04:00",
												end_time:
													"2026-09-13T11:00:00-04:00",
												external_shortcut_id:
													"apple-evt-1001",
											},
										],
									},
									null,
									2,
								)}
                            </pre>
						</div>
					</div>
				{:else if activeSettingsTab === "danger"}
					<div class="space-y-4">
						<div
							class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-4"
						>
							<AlertTriangle
								class="w-6 h-6 text-red-400 shrink-0 mt-0.5"
							/>
							<div class="flex-1 space-y-1">
								<h4 class="text-sm font-bold text-red-400">
									Purge Calendar Data
								</h4>
								<p
									class="text-xs text-slate-400 leading-relaxed"
								>
									This will permanently delete all events for
									all members on this calendar. Members will
									remain, but the calendar will be wiped
									clean. This cannot be undone.
								</p>
								<div class="pt-3">
									<button
										type="button"
										onclick={handleDeleteAllEvents}
										class="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition"
									>
										Delete All Events Permanently
									</button>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
