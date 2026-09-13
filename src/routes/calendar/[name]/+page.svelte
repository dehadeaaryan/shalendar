<script lang="ts">
	import { invalidateAll } from '$app/navigation';
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
		User,
		Eye,
		EyeOff,
		Columns,
		Sun,
		Globe,
		Users,
		LogOut,
		Maximize2,
		Minimize2
	} from 'lucide-svelte';

	const COMMON_TIMEZONES = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'Europe/London',
		'Europe/Paris',
		'Asia/Tokyo',
		'Asia/Dubai',
		'Australia/Sydney'
	];

	const START_HOUR = 0;  // 12:00 AM (Midnight)
	const END_HOUR = 24;   // 12:00 AM (Midnight next day)
	const TOTAL_HOURS = END_HOUR - START_HOUR; // 24 hours
	const HOUR_HEIGHT = 56; // 56px per hour block

	let { data } = $props();

	// Auth Lock State
	let passwordInput = $state('');
	let showLockPassword = $state(false);
	let authError = $state('');
	let authLoading = $state(false);

	// Calendar Navigation
	let currentDate = $state(new Date());
	let viewMode = $state<'month' | 'week' | 'today' | 'agenda'>('week');

	// Timezone Perspective State ('LOCAL', 'UTC', or member ID)
	let selectedTimezonePerspective = $state<string>('LOCAL');

	// Collapsible Days State for This Week View (key: YYYY-MM-DD -> boolean)
	let collapsedDays = $state<Record<string, boolean>>({});

	// Modals
	let showAddModal = $state(false);
	let showSettingsModal = $state(false);
	let selectedEvent = $state<any>(null);

	// Add Event Form State
	let newEventTitle = $state('');
	let newEventPartnerId = $state('');
	let newEventStart = $state(formatDateTimeInput(new Date()));
	let newEventEnd = $state(formatDateTimeInput(new Date(Date.now() + 3600000)));
	let addError = $state('');
	let addLoading = $state(false);

	// Settings State
	let memberSettings = $state<any[]>([]);
	let settingsMessage = $state('');
	let settingsLoading = $state(false);

	// Copy State
	let copiedEndpoint = $state(false);

	$effect(() => {
		if (data.partners.length > 0) {
			memberSettings = data.partners.map((p: any) => ({
				id: p.id,
				name: p.name,
				displayColor: p.displayColor,
				timezone: p.timezone || 'UTC'
			}));
			if (!newEventPartnerId) newEventPartnerId = data.partners[0].id;
		}
	});

	function formatDateTimeInput(date: Date): string {
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function getActiveTimezoneString(): string {
		if (selectedTimezonePerspective === 'UTC') return 'UTC';
		if (selectedTimezonePerspective === 'LOCAL') {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		}
		const member = data.partners.find((p: any) => p.id === selectedTimezonePerspective);
		return member ? member.timezone || 'UTC' : 'UTC';
	}

	let activeTimezone = $derived(getActiveTimezoneString());

	async function handleUnlock() {
		authError = '';
		if (!passwordInput) return;
		authLoading = true;
		try {
			const res = await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'login',
					name: data.calendarName,
					password: passwordInput
				})
			});
			const resData = await res.json();
			if (!res.ok) {
				authError = resData.error || 'Incorrect password';
			} else {
				passwordInput = '';
				await invalidateAll();
			}
		} catch (err: any) {
			authError = err.message || 'Error authenticating';
		} finally {
			authLoading = false;
		}
	}

	async function handleLockCalendar() {
		try {
			await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'logout',
					calendarName: data.calendarName
				})
			});
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleAddEvent() {
		addError = '';
		if (!newEventTitle || !newEventPartnerId || !newEventStart || !newEventEnd) {
			addError = 'Please fill out all event fields';
			return;
		}

		addLoading = true;
		try {
			const res = await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'create_event',
					calendarName: data.calendarName,
					partnerId: newEventPartnerId,
					title: newEventTitle,
					startTime: newEventStart,
					endTime: newEventEnd
				})
			});
			const resData = await res.json();
			if (!res.ok) {
				addError = resData.error || 'Failed to add event';
			} else {
				showAddModal = false;
				newEventTitle = '';
				await invalidateAll();
			}
		} catch (err: any) {
			addError = err.message || 'Error adding event';
		} finally {
			addLoading = false;
		}
	}

	async function handleDeleteEvent(eventId: string) {
		if (!confirm('Are you sure you want to delete this event?')) return;
		try {
			await fetch('/api/calendar', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					calendarName: data.calendarName,
					eventId
				})
			});
			selectedEvent = null;
			await invalidateAll();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleSaveSettings() {
		settingsMessage = '';
		settingsLoading = true;
		try {
			for (const m of memberSettings) {
				await fetch('/api/calendar', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						calendarName: data.calendarName,
						partnerId: m.id,
						name: m.name,
						displayColor: m.displayColor,
						timezone: m.timezone
					})
				});
			}
			settingsMessage = 'Member settings saved successfully!';
			await invalidateAll();
		} catch (e: any) {
			settingsMessage = 'Failed to save member settings';
		} finally {
			settingsLoading = false;
		}
	}

	// Collapsible Days Helper Functions
	function getDayKey(date: Date): string {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
	}

	function isDayCollapsed(dayDate: Date, eventCount: number): boolean {
		const key = getDayKey(dayDate);
		if (collapsedDays[key] !== undefined) {
			return collapsedDays[key];
		}
		// Default: Collapse if 0 events, expand if has events
		return eventCount === 0;
	}

	function toggleDayCollapse(dayDate: Date, eventCount: number) {
		const key = getDayKey(dayDate);
		const current = isDayCollapsed(dayDate, eventCount);
		collapsedDays[key] = !current;
	}

	function expandAllDaysInWeek(days: Date[]) {
		for (const d of days) {
			collapsedDays[getDayKey(d)] = false;
		}
	}

	function collapseAllDaysInWeek(days: Date[]) {
		for (const d of days) {
			collapsedDays[getDayKey(d)] = true;
		}
	}

	// Timezone Formatting Helpers
	function formatInTimezone(isoString: string, targetTz: string): string {
		try {
			return new Date(isoString).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: targetTz
			});
		} catch (e) {
			return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
	}

	function getDecimalHourInTimezone(isoString: string, targetTz: string): number {
		try {
			const d = new Date(isoString);
			const parts = new Intl.DateTimeFormat('en-US', {
				hour: 'numeric',
				minute: 'numeric',
				hour12: false,
				timeZone: targetTz
			}).formatToParts(d);

			let hour = 0;
			let minute = 0;
			for (const p of parts) {
				if (p.type === 'hour') hour = parseInt(p.value, 10);
				if (p.type === 'minute') minute = parseInt(p.value, 10);
			}
			if (hour === 24) hour = 0;
			return hour + minute / 60;
		} catch (e) {
			const d = new Date(isoString);
			return d.getHours() + d.getMinutes() / 60;
		}
	}

	function getEventTopPx(startTimeISO: string, targetTz: string): number {
		const hour = getDecimalHourInTimezone(startTimeISO, targetTz);
		return (hour - START_HOUR) * HOUR_HEIGHT;
	}

	function getEventHeightPx(startTimeISO: string, endTimeISO: string): number {
		const start = new Date(startTimeISO).getTime();
		const end = new Date(endTimeISO).getTime();
		const durationHours = Math.max(0.5, (end - start) / 3600000);
		return Math.max(32, durationHours * HOUR_HEIGHT);
	}

	function isSameDay(d1: Date, d2: Date) {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	function getMemberColor(partnerId: string): string {
		const m = data.partners.find((pt: any) => pt.id === partnerId);
		return m ? m.displayColor : '#f97316';
	}

	function getMemberName(partnerId: string): string {
		const m = data.partners.find((pt: any) => pt.id === partnerId);
		return m ? m.name : 'Person';
	}

	function getMemberTimezone(partnerId: string): string {
		const m = data.partners.find((pt: any) => pt.id === partnerId);
		return m ? (m.timezone || 'UTC') : 'UTC';
	}

	// Returns a short timezone label like "PDT", "EST", etc.
	function shortTzLabel(tz: string, isoString: string): string {
		try {
			const parts = new Intl.DateTimeFormat('en-US', {
				timeZoneName: 'short',
				timeZone: tz
			}).formatToParts(new Date(isoString));
			return parts.find(p => p.type === 'timeZoneName')?.value || tz.split('/')[1] || tz;
		} catch {
			return tz.split('/')[1] || tz;
		}
	}

	// Month Grid Calculation
	function getDaysInMonthGrid(year: number, month: number) {
		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);
		
		const startingDayOfWeek = firstDayOfMonth.getDay();
		const totalDays = lastDayOfMonth.getDate();

		const days: { date: Date; isCurrentMonth: boolean }[] = [];

		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = startingDayOfWeek - 1; i >= 0; i--) {
			days.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false
			});
		}

		for (let day = 1; day <= totalDays; day++) {
			days.push({
				date: new Date(year, month, day),
				isCurrentMonth: true
			});
		}

		const remainingCells = 42 - days.length;
		for (let i = 1; i <= remainingCells; i++) {
			days.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false
			});
		}

		return days;
	}

	// Week Days Calculation
	function getDaysInWeek(date: Date) {
		const dayOfWeek = date.getDay();
		const sunday = new Date(date);
		sunday.setDate(date.getDate() - dayOfWeek);

		const weekDays: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(sunday);
			d.setDate(sunday.getDate() + i);
			weekDays.push(d);
		}
		return weekDays;
	}

	let monthDays = $derived(getDaysInMonthGrid(currentDate.getFullYear(), currentDate.getMonth()));
	let weekDays = $derived(getDaysInWeek(currentDate));

	function getEventsForDayAndMember(dayDate: Date, memberId: string) {
		return data.events.filter((evt: any) => {
			return evt.partnerId === memberId && isSameDay(new Date(evt.startTime), dayDate);
		});
	}

	function getEventsForDay(dayDate: Date) {
		return data.events.filter((evt: any) => isSameDay(new Date(evt.startTime), dayDate));
	}

	// Computes column layout for overlapping events in a time-grid.
	// Returns an array with col index + totalCols for each event so they
	// can be placed side-by-side instead of stacked on top of each other.
	function computeEventColumns(events: any[]): { evt: any; col: number; totalCols: number }[] {
		if (events.length === 0) return [];

		// Sort by start time ascending
		const sorted = [...events].sort(
			(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		);

		// Greedily assign each event to the earliest available column
		const colEnds: number[] = []; // tracks the end-time (ms) of the last event in each column
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

		// For each event, find the maximum column index among all events it overlaps with
		// so we can compute the width fraction correctly
		const result: { evt: any; col: number; totalCols: number }[] = [];
		for (const evt of sorted) {
			const col = evtCol.get(evt)!;
			const evtStart = new Date(evt.startTime).getTime();
			const evtEnd = new Date(evt.endTime).getTime();
			let maxCol = col;
			for (const other of sorted) {
				if (other === evt) continue;
				const otherStart = new Date(other.startTime).getTime();
				const otherEnd = new Date(other.endTime).getTime();
				if (otherStart < evtEnd && otherEnd > evtStart) {
					maxCol = Math.max(maxCol, evtCol.get(other)!);
				}
			}
			result.push({ evt, col, totalCols: maxCol + 1 });
		}
		return result;
	}

	function prevPeriod() {
		if (viewMode === 'month') {
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
		} else if (viewMode === 'week') {
			currentDate = new Date(currentDate.getTime() - 7 * 86400000);
		} else {
			currentDate = new Date(currentDate.getTime() - 86400000);
		}
	}

	function nextPeriod() {
		if (viewMode === 'month') {
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
		} else if (viewMode === 'week') {
			currentDate = new Date(currentDate.getTime() + 7 * 86400000);
		} else {
			currentDate = new Date(currentDate.getTime() + 86400000);
		}
	}

	function goToday() {
		currentDate = new Date();
	}

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const hoursList = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

	function autoScrollGrid(node: HTMLElement) {
		const nowHour = new Date().getHours();
		const scrollTarget = Math.max(0, (nowHour - 1) * HOUR_HEIGHT);
		node.scrollTop = scrollTarget;
	}
</script>

<div class="min-h-screen flex flex-col bg-[#090d16]">
	<!-- Top Navigation Header -->
	<header class="border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<!-- Logo & Title -->
			<div class="flex items-center justify-between w-full sm:w-auto">
				<div class="flex items-center space-x-2.5">
					<a href="/" class="flex items-center space-x-2 group">
						<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
							<CalendarIcon class="w-4 h-4 sm:w-5 sm:h-5 text-white" />
						</div>
					</a>
					<div class="flex items-center space-x-2">
						<h1 class="text-base sm:text-lg font-bold text-white tracking-tight capitalize truncate max-w-[140px] sm:max-w-none">{data.calendarName}</h1>
						<span class="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">Shared</span>
					</div>
				</div>
			</div>

			{#if data.isAuthenticated}
				<!-- Header Controls: Timezone Perspective, Lock & Actions -->
				<div class="flex items-center justify-between sm:justify-end space-x-1.5 sm:space-x-3 text-xs w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
					<!-- Timezone Perspective Selector -->
					<div class="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1.5 sm:px-3 rounded-xl border border-slate-800 flex-1 sm:flex-none max-w-[55%] sm:max-w-none">
						<Globe class="w-3.5 h-3.5 text-orange-400 shrink-0" />
						<span class="hidden md:inline text-slate-400 font-medium shrink-0">View in:</span>
						<select
							bind:value={selectedTimezonePerspective}
							class="bg-transparent text-white font-semibold focus:outline-none cursor-pointer w-full truncate text-[11px] sm:text-xs"
						>
							<option value="LOCAL" class="bg-slate-900 text-white">Local ({activeTimezone.split('/')[1] || activeTimezone})</option>
							{#each data.partners as member}
								<option value={member.id} class="bg-slate-900 text-white">{member.name} ({member.timezone.split('/')[1] || member.timezone})</option>
							{/each}
							<option value="UTC" class="bg-slate-900 text-white">UTC</option>
						</select>
					</div>

					<!-- Action Buttons Group -->
					<div class="flex items-center space-x-1.5 shrink-0">
						<!-- Add Event Button -->
						<button
							type="button"
							onclick={() => showAddModal = true}
							class="flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md shadow-orange-500/20 transition"
							title="Add Event"
						>
							<Plus class="w-4 h-4 shrink-0" />
							<span class="hidden sm:inline">Add Event</span>
						</button>

						<!-- Settings Button -->
						<button
							type="button"
							onclick={() => showSettingsModal = true}
							class="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
							title="Calendar Settings & iOS Sync"
						>
							<Settings class="w-4 h-4 shrink-0" />
						</button>

						<!-- Lock Calendar Button -->
						<button
							type="button"
							onclick={handleLockCalendar}
							class="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center space-x-1"
							title="Lock Calendar"
						>
							<Lock class="w-4 h-4 shrink-0" />
							<span class="hidden md:inline text-xs font-semibold">Lock</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{#if !data.isAuthenticated}
			<!-- Password Lock Card -->
			<div class="max-w-md mx-auto my-16 glass-panel rounded-2xl p-8 border border-slate-800 text-center shadow-2xl">
				<div class="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4 text-orange-400">
					<Lock class="w-7 h-7" />
				</div>
				<h2 class="text-xl font-bold text-white mb-2">Protected Calendar</h2>
				<p class="text-slate-400 text-sm mb-6">Enter password to unlock <span class="text-white font-medium capitalize">{data.calendarName}</span>.</p>

				<form onsubmit={(e) => { e.preventDefault(); handleUnlock(); }} class="space-y-4">
					{#if authError}
						<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
							{authError}
						</div>
					{/if}

					<div class="relative">
						<input
							type={showLockPassword ? 'text' : 'password'}
							bind:value={passwordInput}
							placeholder="Enter calendar password"
							required
							class="w-full px-4 py-3 rounded-xl glass-input text-sm text-center pr-10"
						/>
						<button
							type="button"
							onclick={() => showLockPassword = !showLockPassword}
							class="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
							title={showLockPassword ? 'Hide password' : 'Show password'}
						>
							{#if showLockPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
						</button>
					</div>

					<button
						type="submit"
						disabled={authLoading}
						class="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
					>
						{authLoading ? 'Verifying...' : 'Unlock Calendar'}
					</button>
				</form>
			</div>
		{:else}
			<!-- Interactive Calendar View -->
			<div class="space-y-6">
				<!-- Calendar Controls Bar -->
				<div class="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
					<!-- Date Navigation -->
					<div class="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3 w-full sm:w-auto">
						<h2 class="text-base sm:text-xl font-bold text-white tracking-tight truncate">
							{#if viewMode === 'today'}
								{#if isSameDay(currentDate, new Date())}
									Today, {currentDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
								{:else}
									{currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
								{/if}
							{:else if viewMode === 'week'}
								{weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
							{:else}
								{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
							{/if}
						</h2>
						<div class="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
							<button type="button" onclick={prevPeriod} class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition" title="Previous period">
								<ChevronLeft class="w-4 h-4" />
							</button>
							<button
								type="button"
								onclick={goToday}
								class={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isSameDay(currentDate, new Date()) ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'hover:bg-slate-800 text-slate-300'}`}
								title="Jump to Today"
							>
								Today
							</button>
							<button type="button" onclick={nextPeriod} class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition" title="Next period">
								<ChevronRight class="w-4 h-4" />
							</button>
						</div>
					</div>

					<!-- View Mode Switcher -->
					<div class="grid grid-cols-4 sm:flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
						<button
							type="button"
							onclick={() => viewMode = 'today'}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${viewMode === 'today' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
						>
							<Sun class="w-3.5 h-3.5 shrink-0" />
							<span>Today</span>
						</button>
						<button
							type="button"
							onclick={() => viewMode = 'week'}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${viewMode === 'week' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
						>
							<Columns class="w-3.5 h-3.5 shrink-0" />
							<span>Week</span>
						</button>
						<button
							type="button"
							onclick={() => viewMode = 'month'}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${viewMode === 'month' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
						>
							<Grid class="w-3.5 h-3.5 shrink-0" />
							<span>Month</span>
						</button>
						<button
							type="button"
							onclick={() => viewMode = 'agenda'}
							class={`py-1.5 px-2 sm:px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${viewMode === 'agenda' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
						>
							<List class="w-3.5 h-3.5 shrink-0" />
							<span>Agenda</span>
						</button>
					</div>
				</div>

				<!-- VIEW 1: TODAY HOURLY TIME-GRID -->
				{#if viewMode === 'today'}
					{@const todayDate = currentDate}
					<div class="glass-panel rounded-2xl border border-slate-800 p-3.5 sm:p-4 space-y-4">
						<div class="flex items-center justify-between border-b border-slate-800 pb-3">
							<div class="flex items-center space-x-3">
								<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
									<Sun class="w-4 h-4 sm:w-5 sm:h-5" />
								</div>
								<div>
									<h3 class="text-base sm:text-lg font-bold text-white">Daily Schedule Grid</h3>
									<p class="text-xs text-slate-400">{todayDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
								</div>
							</div>
						</div>

						<div class="max-h-[650px] overflow-y-auto overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60" use:autoScrollGrid>
							<div class="min-w-[320px] sm:min-w-[700px] grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] relative">
								<!-- Time Axis -->
								<div class="border-r border-slate-800 bg-slate-900/60 divide-y divide-slate-800/60">
									<div class="h-10 bg-slate-900 border-b border-slate-800 sticky top-0 z-20"></div>
									{#each hoursList.slice(0, TOTAL_HOURS) as hr}
										<div class="h-[56px] px-1 sm:px-2 text-[9px] sm:text-[10px] font-mono text-slate-500 flex items-start pt-1 justify-end">
											{hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`}
										</div>
									{/each}
								</div>

								<!-- Member Columns Full Width -->
								<div class="grid divide-x divide-slate-800/80 w-full" style="grid-template-columns: repeat({data.partners.length}, minmax(0, 1fr))">
									{#each data.partners as member}
										{@const mEvents = getEventsForDayAndMember(todayDate, member.id)}
										{@const mColor = member.displayColor}
										<div class="flex flex-col">
											<div class="h-10 px-2 sm:px-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
												<div class="flex items-center space-x-1.5 sm:space-x-2 truncate">
													<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {mColor}"></span>
													<span class="text-xs font-bold text-white truncate">{member.name}</span>
												</div>
												<span class="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden sm:inline">{member.timezone.split('/')[1] || member.timezone}</span>
											</div>

											<div class="relative" style="height: {TOTAL_HOURS * HOUR_HEIGHT}px">
												{#each hoursList.slice(0, TOTAL_HOURS) as _, idx}
													<div class="absolute w-full border-b border-slate-800/40" style="top: {idx * HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"></div>
												{/each}

												{#each computeEventColumns(mEvents) as { evt, col, totalCols }}
													{@const topPx = getEventTopPx(evt.startTime, activeTimezone)}
													{@const heightPx = getEventHeightPx(evt.startTime, evt.endTime)}
													{@const leftPct = (col / totalCols) * 100}
													{@const widthPct = (1 / totalCols) * 100}
													<button
														type="button"
														onclick={() => selectedEvent = evt}
														class="absolute p-1.5 sm:p-2 rounded-lg text-xs font-medium overflow-hidden shadow-md transition hover:brightness-110 flex flex-col justify-between text-left cursor-pointer z-10"
														style="top: {topPx}px; height: {heightPx}px; left: calc({leftPct}% + 2px); width: calc({widthPct}% - 4px); background-color: {mColor}28; border-left: 3px sm:border-left-width:4px solid {mColor}; border-top: 1px solid {mColor}44"
													>
														<span class="font-bold text-white truncate text-[11px] sm:text-xs leading-tight">{evt.title}</span>
														<span class="text-[9px] sm:text-[10px] text-slate-300 font-mono truncate">
															{formatInTimezone(evt.startTime, activeTimezone)}–{formatInTimezone(evt.endTime, activeTimezone)} <span class="opacity-60">{shortTzLabel(activeTimezone, evt.startTime)}</span>
														</span>
													</button>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>

				<!-- VIEW 2: THIS WEEK HOURLY TIME-GRID (COLLAPSIBLE DAYS) -->
				{:else if viewMode === 'week'}
					<div class="glass-panel rounded-2xl border border-slate-800 p-4 space-y-6">
						<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2.5">
							<h3 class="text-base sm:text-lg font-bold text-white">This Week's Daily Hourly Grids</h3>

							<div class="flex items-center space-x-2">
								<button
									type="button"
									onclick={() => expandAllDaysInWeek(weekDays)}
									class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800 flex items-center space-x-1 transition"
								>
									<Maximize2 class="w-3 h-3 text-orange-400" />
									<span>Expand All</span>
								</button>
								<button
									type="button"
									onclick={() => collapseAllDaysInWeek(weekDays)}
									class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800 flex items-center space-x-1 transition"
								>
									<Minimize2 class="w-3 h-3 text-slate-400" />
									<span>Collapse All</span>
								</button>
							</div>
						</div>

						<div class="space-y-4">
							{#each weekDays as day}
								{@const dayEvents = getEventsForDay(day)}
								{@const isToday = isSameDay(day, new Date())}
								{@const isCollapsed = isDayCollapsed(day, dayEvents.length)}
								<div class={`rounded-xl border transition ${isToday ? 'border-orange-500/50 bg-slate-900/40' : 'border-slate-800 bg-slate-950/40'}`}>
									<!-- Interactive Day Collapsible Header Banner -->
									<button
										type="button"
										onclick={() => toggleDayCollapse(day, dayEvents.length)}
										class="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-900/60 rounded-xl transition"
									>
										<div class="flex items-center space-x-3">
											<span class={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
												{day.getDate()}
											</span>
											<span class="text-sm font-bold text-white">
												{day.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
											</span>
											{#if isCollapsed}
												<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">Collapsed</span>
											{/if}
										</div>

										<div class="flex items-center space-x-3">
											<span class="text-[11px] text-slate-400 font-mono">{dayEvents.length} event(s)</span>
											<div class="p-1 text-slate-400 hover:text-white">
												{#if isCollapsed}
													<ChevronDown class="w-4 h-4" />
												{:else}
													<ChevronUp class="w-4 h-4 text-orange-400" />
												{/if}
											</div>
										</div>
									</button>

									<!-- Hourly Grid Content (Shown only when expanded) -->
									{#if !isCollapsed}
										<div class="p-2 sm:p-4 pt-0 border-t border-slate-800/80">
											<div class="max-h-[480px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/80 mt-3" use:autoScrollGrid>
												<div class="min-w-[320px] sm:min-w-[650px] grid grid-cols-[40px_1fr] sm:grid-cols-[50px_1fr] relative">
													<div class="border-r border-slate-800/80 bg-slate-900/60 divide-y divide-slate-800/60">
														<div class="h-8 bg-slate-900 border-b border-slate-800 sticky top-0 z-20"></div>
														{#each hoursList.slice(0, TOTAL_HOURS) as hr}
															<div class="h-[56px] px-1 text-[9px] font-mono text-slate-500 flex items-start pt-1 justify-end">
																{hr === 0 ? '12A' : hr === 12 ? '12P' : hr > 12 ? `${hr - 12}P` : `${hr}A`}
															</div>
														{/each}
													</div>

													<div class="grid divide-x divide-slate-800/80 w-full" style="grid-template-columns: repeat({data.partners.length}, minmax(0, 1fr))">
														{#each data.partners as member}
															{@const mEvents = getEventsForDayAndMember(day, member.id)}
															{@const mColor = member.displayColor}
															<div class="flex flex-col">
																<div class="h-8 px-2 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
																	<div class="flex items-center space-x-1.5 truncate">
																		<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {mColor}"></span>
																		<span class="text-[11px] font-bold text-slate-200 truncate">{member.name}</span>
																	</div>
																</div>

																<div class="relative" style="height: {TOTAL_HOURS * HOUR_HEIGHT}px">
																	{#each hoursList.slice(0, TOTAL_HOURS) as _, idx}
																		<div class="absolute w-full border-b border-slate-800/40" style="top: {idx * HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"></div>
																	{/each}

																	{#each computeEventColumns(mEvents) as { evt, col, totalCols }}
																		{@const topPx = getEventTopPx(evt.startTime, activeTimezone)}
																		{@const heightPx = getEventHeightPx(evt.startTime, evt.endTime)}
																		{@const leftPct = (col / totalCols) * 100}
																		{@const widthPct = (1 / totalCols) * 100}
																		<button
																			type="button"
																			onclick={() => selectedEvent = evt}
																			class="absolute p-1 sm:p-1.5 rounded text-[11px] font-medium overflow-hidden shadow transition hover:brightness-110 flex flex-col justify-between text-left cursor-pointer z-10"
																			style="top: {topPx}px; height: {heightPx}px; left: calc({leftPct}% + 2px); width: calc({widthPct}% - 4px); background-color: {mColor}28; border-left: 3px solid {mColor}; border-top: 1px solid {mColor}44"
																		>
																			<span class="font-bold text-white truncate text-[10px] leading-tight">{evt.title}</span>
																			<span class="text-[9px] text-slate-300 font-mono truncate">
																				{formatInTimezone(evt.startTime, activeTimezone)}–{formatInTimezone(evt.endTime, activeTimezone)} <span class="opacity-60">{shortTzLabel(activeTimezone, evt.startTime)}</span>
																			</span>
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

				<!-- VIEW 3: MONTH GRID VIEW -->
				{:else if viewMode === 'month'}
					<div class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
						<div class="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60 text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
						</div>

						<div class="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/40">
							{#each monthDays as day}
								{@const dayEvents = getEventsForDay(day.date)}
								{@const isToday = isSameDay(day.date, new Date())}
								<div class={`min-h-[110px] p-2 flex flex-col transition ${day.isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/80 text-slate-600'}`}>
									<div class="flex items-center justify-between mb-1.5">
										<span class={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : day.isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
											{day.date.getDate()}
										</span>
									</div>

									<div class="space-y-1 overflow-y-auto max-h-[85px]">
										{#each dayEvents as evt}
											{@const pColor = getMemberColor(evt.partnerId)}
											<button
												type="button"
												onclick={() => selectedEvent = evt}
												class="w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate transition hover:brightness-110 flex items-center space-x-1.5"
												style="background-color: {pColor}22; border-left: 3px solid {pColor}"
											>
												<span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: {pColor}"></span>
												<span class="truncate text-slate-200">{evt.title}</span>
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>

				<!-- VIEW 4: AGENDA VIEW -->
				{:else}
					<div class="glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
						<h3 class="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
							<List class="w-5 h-5 text-orange-400" />
							<span>Upcoming Agenda</span>
						</h3>

						{#if data.events.length === 0}
							<div class="text-center py-12 text-slate-500 text-sm">
								No events found. Click "Add Event" or sync via iOS Shortcuts!
							</div>
						{:else}
							<div class="space-y-2.5 sm:space-y-3">
								{#each data.events.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) as evt}
									{@const pColor = getMemberColor(evt.partnerId)}
									{@const pName = getMemberName(evt.partnerId)}
									<div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition gap-2.5">
										<button
											type="button"
											onclick={() => selectedEvent = evt}
											class="flex-1 text-left flex items-start sm:items-center space-x-3 cursor-pointer min-w-0"
										>
											<div class="w-2.5 h-9 sm:h-10 rounded-full shrink-0 mt-0.5 sm:mt-0" style="background-color: {pColor}"></div>
											<div class="min-w-0 flex-1">
												<h4 class="text-xs sm:text-sm font-bold text-white truncate">{evt.title}</h4>
												<div class="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
													<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background-color: {pColor}33; color: {pColor}">
														{pName}
													</span>
													<span class="flex items-center gap-1 font-mono text-slate-300 text-[11px]">
														<Clock class="w-3 h-3 text-slate-400" />
														{formatInTimezone(evt.startTime, activeTimezone)} – {formatInTimezone(evt.endTime, activeTimezone)}
														<span class="opacity-60 text-[10px]">{shortTzLabel(activeTimezone, evt.startTime)}</span>
													</span>
												</div>
											</div>
										</button>
										<button
											type="button"
											onclick={() => handleDeleteEvent(evt.id)}
											class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer self-end sm:self-center"
											title="Delete event"
										>
											<Trash2 class="w-4 h-4" />
										</button>
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
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
		<div class="glass-panel w-full max-w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-800 pb-3">
				<h3 class="text-base sm:text-lg font-bold text-white">Add New Event</h3>
				<button type="button" onclick={() => showAddModal = false} class="text-slate-400 hover:text-white">
					<X class="w-5 h-5" />
				</button>
			</div>

			{#if addError}
				<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
					{addError}
				</div>
			{/if}

			<div class="space-y-3">
				<div>
					<label for="event-title-input" class="block text-xs font-semibold text-slate-400 mb-1">Event Title</label>
					<input id="event-title-input" type="text" bind:value={newEventTitle} placeholder="e.g. Dinner Date / Meeting" class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm" />
				</div>

				<div>
					<label for="event-partner-select" class="block text-xs font-semibold text-slate-400 mb-1">Person</label>
					<select id="event-partner-select" bind:value={newEventPartnerId} class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-slate-900">
						{#each data.partners as partner}
							<option value={partner.id}>{partner.name}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="event-start-input" class="block text-xs font-semibold text-slate-400 mb-1">Start Time</label>
						<input id="event-start-input" type="datetime-local" bind:value={newEventStart} class="w-full px-3 py-2 rounded-xl glass-input text-xs" />
					</div>
					<div>
						<label for="event-end-input" class="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
						<input id="event-end-input" type="datetime-local" bind:value={newEventEnd} class="w-full px-3 py-2 rounded-xl glass-input text-xs" />
					</div>
				</div>
			</div>

			<div class="pt-2 flex items-center justify-end space-x-2">
				<button type="button" onclick={() => showAddModal = false} class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
				<button
					type="button"
					onclick={handleAddEvent}
					disabled={addLoading}
					class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs transition disabled:opacity-50"
				>
					{addLoading ? 'Saving...' : 'Save Event'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal: Event Detail -->
{#if selectedEvent}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
		<div class="glass-panel w-full max-w-[92vw] sm:max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-4">
			<div class="flex items-start justify-between">
				<div class="flex items-center space-x-2">
					<span class="w-3 h-3 rounded-full" style="background-color: {getMemberColor(selectedEvent.partnerId)}"></span>
					<span class="text-xs font-semibold text-slate-400">{getMemberName(selectedEvent.partnerId)}</span>
				</div>
				<button type="button" onclick={() => selectedEvent = null} class="text-slate-400 hover:text-white">
					<X class="w-5 h-5" />
				</button>
			</div>

			<h3 class="text-lg sm:text-xl font-bold text-white leading-snug">{selectedEvent.title}</h3>

			<div class="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
				{#if getMemberTimezone(selectedEvent.partnerId) !== activeTimezone}
					<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
						<span class="text-slate-500 shrink-0">{getMemberName(selectedEvent.partnerId)}'s time ({shortTzLabel(getMemberTimezone(selectedEvent.partnerId), selectedEvent.startTime)}):</span>
						<span class="font-bold" style="color: {getMemberColor(selectedEvent.partnerId)}">{formatInTimezone(selectedEvent.startTime, getMemberTimezone(selectedEvent.partnerId))} – {formatInTimezone(selectedEvent.endTime, selectedEvent.partnerId ? getMemberTimezone(selectedEvent.partnerId) : activeTimezone)}</span>
					</div>
				{/if}
				<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
					<span class="text-slate-500 shrink-0">Selected view ({shortTzLabel(activeTimezone, selectedEvent.startTime)}):</span>
					<span class="font-bold text-white">{formatInTimezone(selectedEvent.startTime, activeTimezone)} – {formatInTimezone(selectedEvent.endTime, activeTimezone)}</span>
				</div>
				<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
					<span class="text-slate-500 shrink-0">UTC:</span>
					<span class="font-mono text-slate-400 text-[10px] truncate">{new Date(selectedEvent.startTime).toUTCString()}</span>
				</div>
			</div>

			<div class="flex items-center justify-between pt-2">
				<button
					type="button"
					onclick={() => handleDeleteEvent(selectedEvent.id)}
					class="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition"
				>
					<Trash2 class="w-3.5 h-3.5" />
					<span>Delete</span>
				</button>
				<button type="button" onclick={() => selectedEvent = null} class="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs">Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal: Settings & iOS Sync Assistant -->
{#if showSettingsModal}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
			<div class="flex items-center justify-between border-b border-slate-800 pb-3">
				<div class="flex items-center space-x-2">
					<Settings class="w-5 h-5 text-orange-400" />
					<h3 class="text-lg font-bold text-white">Calendar Settings & Member Timezones</h3>
				</div>
				<button type="button" onclick={() => showSettingsModal = false} class="text-slate-400 hover:text-white">
					<X class="w-5 h-5" />
				</button>
			</div>

			{#if settingsMessage}
				<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
					{settingsMessage}
				</div>
			{/if}

			<!-- Member Customization Section -->
			<div class="space-y-4">
				<h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Member Names, Colors & Timezones</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{#each memberSettings as member, idx}
						<div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
							<label for={`setting-name-${idx}`} class="block text-xs font-semibold text-slate-300">Member {idx + 1}</label>
							<input id={`setting-name-${idx}`} type="text" bind:value={member.name} placeholder="Name" class="w-full px-3 py-2 rounded-xl glass-input text-xs" />
							
							<div>
								<label for={`setting-tz-${idx}`} class="block text-[11px] text-slate-400 mb-1">Timezone</label>
								<select id={`setting-tz-${idx}`} bind:value={member.timezone} class="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs bg-slate-900">
									{#each COMMON_TIMEZONES as tz}
										<option value={tz}>{tz}</option>
									{/each}
								</select>
							</div>

							<div class="flex items-center space-x-3 pt-1">
								<input type="color" bind:value={member.displayColor} class="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
								<span class="text-xs font-mono text-slate-400">{member.displayColor}</span>
							</div>
						</div>
					{/each}
				</div>

				<button
					type="button"
					onclick={handleSaveSettings}
					disabled={settingsLoading}
					class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs transition disabled:opacity-50"
				>
					{settingsLoading ? 'Saving...' : 'Save Settings'}
				</button>
			</div>

			<!-- iOS Shortcut Assistant -->
			<div class="pt-4 border-t border-slate-800 space-y-4">
				<div class="flex items-center space-x-2 text-orange-400">
					<Smartphone class="w-5 h-5" />
					<h4 class="text-sm font-bold text-white">iOS Shortcuts REST Sync Guide</h4>
				</div>

				<p class="text-xs text-slate-400 leading-relaxed">
					Sync your Apple Calendar events automatically via a single POST request right from your iPhone!
				</p>

				<div class="space-y-1.5">
					<span class="text-xs font-semibold text-slate-300">POST Endpoint URL</span>
					<div class="flex items-center justify-between p-3 rounded-xl bg-slate-950 font-mono text-xs text-orange-400 border border-slate-800">
						<span>https://shalendar.aaryandehade.com/api/sync</span>
						<button
							type="button"
							onclick={() => { navigator.clipboard.writeText('https://shalendar.aaryandehade.com/api/sync'); copiedEndpoint = true; setTimeout(() => copiedEndpoint = false, 2000); }}
							class="text-slate-400 hover:text-white p-1"
						>
							{#if copiedEndpoint}<Check class="w-4 h-4 text-emerald-400" />{:else}<Copy class="w-4 h-4" />{/if}
						</button>
					</div>
				</div>

				<div class="space-y-1.5">
					<span class="text-xs font-semibold text-slate-300">Sample iOS Shortcut JSON Body (Supports Timezone ISO strings!)</span>
					<pre class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto">
{JSON.stringify(
	{
		calendar_name: data.calendarName,
		password: 'YOUR_PASSWORD',
		partner_name: memberSettings[0]?.name || 'Person 1',
		events: [
			{
				title: 'Team Sync / Meeting',
				start_time: '2026-09-13T10:00:00-04:00',
				end_time: '2026-09-13T11:00:00-04:00',
				external_shortcut_id: 'apple-evt-1001'
			}
		]
	},
	null,
	2
)}
					</pre>
				</div>
			</div>
		</div>
	</div>
{/if}
