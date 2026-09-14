<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Calendar as CalendarIcon,
		ShieldCheck,
		Zap,
		Sparkles,
		ArrowRight,
		Lock,
		PlusCircle,
		LogIn,
		Eye,
		EyeOff,
		Plus,
		Trash2,
		Users,
		Clock,
		ExternalLink,
		Smartphone
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

	const DEFAULT_COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

	let activeTab = $state<'create' | 'open'>('create');

	// Password Visibility
	let showCreatePassword = $state(false);
	let showOpenPassword = $state(false);

	// Saved Calendars from LocalStorage
	let savedCalendars = $state<string[]>([]);

	// Create Form state
	let createName = $state('');
	let createPassword = $state('');
	let members = $state([
		{ name: 'Person 1', displayColor: '#f97316', timezone: 'America/Los_Angeles' },
		{ name: 'Person 2', displayColor: '#3b82f6', timezone: 'America/New_York' }
	]);

	let createError = $state('');
	let createLoading = $state(false);

	// Open Form state
	let openName = $state('');
	let openPassword = $state('');
	let openError = $state('');
	let openLoading = $state(false);

	onMount(() => {
		try {
			const stored = localStorage.getItem('shalendar_saved_calendars');
			if (stored) {
				savedCalendars = JSON.parse(stored);
			}
		} catch (e) {
			console.error(e);
		}
	});

	function saveToLocalStorage(calendarName: string) {
		try {
			const lower = calendarName.toLowerCase();
			const list = savedCalendars.filter((c) => c !== lower);
			list.unshift(lower);
			savedCalendars = list;
			localStorage.setItem('shalendar_saved_calendars', JSON.stringify(list));
		} catch (e) {
			console.error(e);
		}
	}

	function addMember() {
		const idx = members.length;
		members = [
			...members,
			{
				name: `Person ${idx + 1}`,
				displayColor: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
			}
		];
	}

	function removeMember(idx: number) {
		if (members.length <= 1) return;
		members = members.filter((_, i) => i !== idx);
	}

	async function handleCreate() {
		createError = '';
		if (!createName || !createPassword) {
			createError = 'Please provide both calendar name and password';
			return;
		}

		createLoading = true;
		try {
			const res = await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'create_calendar',
					name: createName,
					password: createPassword,
					members
				})
			});
			const data = await res.json();
			if (!res.ok) {
				createError = data.error || 'Failed to create calendar';
			} else {
				saveToLocalStorage(createName);
				goto(`/calendar/${encodeURIComponent(createName.toLowerCase())}`);
			}
		} catch (err: any) {
			createError = err.message || 'An error occurred';
		} finally {
			createLoading = false;
		}
	}

	async function handleOpen() {
		openError = '';
		if (!openName || !openPassword) {
			openError = 'Please provide both calendar name and password';
			return;
		}

		openLoading = true;
		try {
			const res = await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'login',
					name: openName,
					password: openPassword
				})
			});
			const data = await res.json();
			if (!res.ok) {
				openError = data.error || 'Failed to open calendar';
			} else {
				saveToLocalStorage(openName);
				goto(`/calendar/${encodeURIComponent(openName.toLowerCase())}`);
			}
		} catch (err: any) {
			openError = err.message || 'An error occurred';
		} finally {
			openLoading = false;
		}
	}
</script>

<!-- Top Navbar -->
<header class="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
				<CalendarIcon class="w-5 h-5 text-white" />
			</div>
			<div class="flex items-center space-x-1.5">
				<span class="text-xl font-bold tracking-tight text-white">Shalendar</span>
			</div>
		</div>
		<div class="hidden sm:flex items-center space-x-3">
			<a
				href="/help"
				class="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 transition flex items-center space-x-1.5"
			>
				<Smartphone class="w-3.5 h-3.5" />
				<span>Setup Guide</span>
			</a>
			<button
				type="button"
				onclick={() => { activeTab = 'open'; document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' }); }}
				class="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition"
			>
				Open Calendar
			</button>
			<button
				type="button"
				onclick={() => { activeTab = 'create'; document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' }); }}
				class="text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-4 py-2 rounded-lg transition shadow-md shadow-orange-500/20"
			>
				Create Calendar
			</button>
		</div>
	</div>
</header>

<!-- Main Landing Container -->
<main class="flex-grow">
	<!-- Saved Calendars Quick Switcher Banner -->
	{#if savedCalendars.length > 0}
		<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
			<div class="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center space-x-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
					<Users class="w-4 h-4 text-orange-400" />
					<span>Your Saved Calendars:</span>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{#each savedCalendars as calName}
						<a
							href={`/calendar/${calName}`}
							class="px-3 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
						>
							<span class="capitalize">{calName}</span>
							<ExternalLink class="w-3 h-3 text-slate-400" />
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Hero Section -->
	<section class="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
		<!-- Background Glow Accents -->
		<div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>
		<div class="absolute top-1/3 right-1/4 w-80 h-80 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

		<div class="text-center max-w-3xl mx-auto">
			<div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-orange-400 mb-6 backdrop-blur-sm">
				<Sparkles class="w-3.5 h-3.5 text-orange-400" />
				<span>Multi-Person Timezone & iOS Shortcuts REST Sync</span>
			</div>
			
			<h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
				Multiple schedules. One unified <span class="text-gradient">shared view</span>.
			</h1>
			
			<p class="text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed">
				Shalendar lets long-distance partners, couples, roommates, and small teams overlay individual schedules side-by-side. Support for timezones, color-coded members, and iOS Shortcuts sync.
			</p>
		</div>

		<!-- Interactive Form Card -->
		<div id="auth-form" class="max-w-xl mx-auto glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative z-10">
			<!-- Form Tabs -->
			<div class="flex p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-800 text-xs sm:text-sm">
				<button
					type="button"
					onclick={() => activeTab = 'create'}
					class={`flex-1 py-2.5 px-2.5 rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
						activeTab === 'create'
							? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
							: 'text-slate-400 hover:text-white'
					}`}
				>
					<PlusCircle class="w-4 h-4 shrink-0" />
					<span>Create<span class="hidden sm:inline"> Shared</span> Calendar</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'open'}
					class={`flex-1 py-2.5 px-2.5 rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
						activeTab === 'open'
							? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
							: 'text-slate-400 hover:text-white'
					}`}
				>
					<LogIn class="w-4 h-4 shrink-0" />
					<span>Open Calendar</span>
				</button>
			</div>

			<!-- Tab 1: Create Calendar -->
			{#if activeTab === 'create'}
				<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
					{#if createError}
						<div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
							{createError}
						</div>
					{/if}

					<div>
						<label for="create-name-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Calendar Name</label>
						<div class="relative">
							<input
								id="create-name-input"
								type="text"
								bind:value={createName}
								placeholder="e.g. lemon-and-pineapple"
								required
								class="w-full px-4 py-3 rounded-xl glass-input pl-10 text-sm"
							/>
							<CalendarIcon class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
						</div>
						<p class="text-[11px] text-slate-500 mt-1">Calendar URL: /calendar/{createName || 'lemon-and-pineapple'}</p>
					</div>

					<div>
						<label for="create-password-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Shared Password</label>
						<div class="relative">
							<input
								id="create-password-input"
								type={showCreatePassword ? 'text' : 'password'}
								bind:value={createPassword}
								placeholder="Choose a shared password"
								required
								class="w-full px-4 py-3 rounded-xl glass-input pl-10 pr-10 text-sm"
							/>
							<Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
							<button
								type="button"
								onclick={() => showCreatePassword = !showCreatePassword}
								class="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
								title={showCreatePassword ? 'Hide password' : 'Show password'}
							>
								{#if showCreatePassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
							</button>
						</div>
					</div>

					<!-- Dynamic Member Customization -->
					<div class="pt-3 border-t border-slate-800 space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Calendar Members ({members.length})</span>
							<button
								type="button"
								onclick={addMember}
								class="flex items-center space-x-1 text-xs text-orange-400 hover:text-orange-300 font-semibold px-2 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition"
							>
								<Plus class="w-3.5 h-3.5" />
								<span>Add Person</span>
							</button>
						</div>

						<div class="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
							{#each members as member, idx}
								<div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 relative">
									<div class="flex items-center justify-between">
										<span class="text-xs font-medium text-slate-300">Person {idx + 1}</span>
										{#if members.length > 1}
											<button
												type="button"
												onclick={() => removeMember(idx)}
												class="text-slate-500 hover:text-red-400 p-1"
												title="Remove person"
											>
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										{/if}
									</div>

									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<input
											type="text"
											bind:value={member.name}
											placeholder="Name"
											class="px-3 py-1.5 rounded-lg glass-input text-xs"
										/>
										<select bind:value={member.timezone} class="px-2.5 py-1.5 rounded-lg glass-input text-xs bg-slate-900">
											{#each COMMON_TIMEZONES as tz}
												<option value={tz}>{tz}</option>
											{/each}
										</select>
									</div>

									<div class="flex items-center space-x-2 pt-1">
										<input type="color" bind:value={member.displayColor} class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
										<span class="text-[11px] text-slate-400 font-mono">{member.displayColor}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<button
						type="submit"
						disabled={createLoading}
						class="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
					>
						{#if createLoading}
							<span>Creating Calendar...</span>
						{:else}
							<span>Create Shared Calendar</span>
							<ArrowRight class="w-4 h-4" />
						{/if}
					</button>
				</form>

			<!-- Tab 2: Open Calendar -->
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleOpen(); }} class="space-y-4">
					{#if openError}
						<div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
							{openError}
						</div>
					{/if}

					<div>
						<label for="open-name-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Calendar Name</label>
						<div class="relative">
							<input
								id="open-name-input"
								type="text"
								bind:value={openName}
								placeholder="e.g. lemon-and-pineapple"
								required
								class="w-full px-4 py-3 rounded-xl glass-input pl-10 text-sm"
							/>
							<CalendarIcon class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
						</div>
					</div>

					<div>
						<label for="open-password-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
						<div class="relative">
							<input
								id="open-password-input"
								type={showOpenPassword ? 'text' : 'password'}
								bind:value={openPassword}
								placeholder="Enter calendar password"
								required
								class="w-full px-4 py-3 rounded-xl glass-input pl-10 pr-10 text-sm"
							/>
							<Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
							<button
								type="button"
								onclick={() => showOpenPassword = !showOpenPassword}
								class="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
								title={showOpenPassword ? 'Hide password' : 'Show password'}
							>
								{#if showOpenPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={openLoading}
						class="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
					>
						{#if openLoading}
							<span>Opening Calendar...</span>
						{:else}
							<span>Open Shared Calendar</span>
							<ArrowRight class="w-4 h-4" />
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</section>

	<!-- Feature Grid Section -->
	<section class="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
		<div class="text-center mb-12">
			<h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Built for multi-person & long distance sharing</h2>
			<p class="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">Overlay unshared personal schedules side-by-side and keep shared events in sync.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Feature 1 -->
			<div class="glass-card rounded-2xl p-6 border border-slate-800">
				<div class="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400">
					<Clock class="w-6 h-6" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">Timezone Conversion</h3>
				<p class="text-slate-400 text-sm leading-relaxed">
					Each person has their own timezone. Schedules automatically convert so an event at 10 AM EST shows up as 7 AM PDT.
				</p>
			</div>

			<!-- Feature 2 -->
			<div class="glass-card rounded-2xl p-6 border border-slate-800">
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
					<Users class="w-6 h-6" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">Hourly Calendar Grids</h3>
				<p class="text-slate-400 text-sm leading-relaxed">
					Compare individual daily & weekly schedules side-by-side on an hourly time grid (6 AM – 11 PM).
				</p>
			</div>

			<!-- Feature 3 -->
			<div class="glass-card rounded-2xl p-6 border border-slate-800">
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
					<Zap class="w-6 h-6" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">iOS Shortcuts REST Sync</h3>
				<p class="text-slate-400 text-sm leading-relaxed mb-4">
					Sync Apple Calendar events automatically via a single `/api/sync` POST request right from your iPhone.
				</p>
				<a
					href="/help"
					class="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
				>
					<Smartphone class="w-3.5 h-3.5" />
					<span>View Setup Guide →</span>
				</a>
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
