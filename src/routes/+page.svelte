<script lang="ts">
	import { onMount } from 'svelte';
 import Brand from '$lib/components/Brand.svelte';
 import CalendarPreview from '$lib/components/CalendarPreview.svelte';
	import { goto } from '$app/navigation';
	import {
		Calendar as CalendarIcon,
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
	let privacyEnabled = $state(false);
	let members = $state([
		{ name: 'Person 1', displayColor: '#f97316', timezone: 'America/Los_Angeles', accessPassword: '' },
		{ name: 'Person 2', displayColor: '#3b82f6', timezone: 'America/New_York', accessPassword: '' }
	]);

	let createError = $state('');
	let createLoading = $state(false);

	// Open Form state
	let openName = $state('');
	let openMemberName = $state('');
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
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
				accessPassword: ''
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
		if (privacyEnabled && createPassword.length < 8) {
			createError = 'Person 1’s access password must be at least 8 characters.';
			return;
		}
		if (privacyEnabled && members.some((member, idx) => idx > 0 && (member.accessPassword.length < 8 || member.accessPassword === createPassword))) {
			createError = 'Set an access password of at least 8 characters for each additional member.';
			return;
		}
		if (privacyEnabled && new Set(members.map((member) => member.name.trim().toLowerCase())).size !== members.length) {
			createError = 'Each privacy calendar member needs a unique name.';
			return;
		}
		if (privacyEnabled && new Set([createPassword, ...members.slice(1).map((member) => member.accessPassword)]).size !== members.length) {
			createError = 'Each privacy calendar member needs a different password.';
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
					privacyEnabled,
					members: members.map((member, idx) => ({
						...member,
						accessPassword: idx === 0 ? createPassword : member.accessPassword
					}))
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
					password: openPassword,
					partnerName: openMemberName
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
<header class="site-header">
 <div class="site-header-inner"><Brand /><nav aria-label="Main navigation"><a class="quiet-link" href="/help">Setup guide</a><button class="button-secondary" onclick={() => { activeTab = 'open'; document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' }); }}>Open calendar <ArrowRight size={15} /></button></nav></div>
</header>
<main class="landing-main">
 <section class="landing-hero">
  <div class="hero-story">
   <span class="eyebrow"><span class="status-dot"></span>Shared calendar</span>
   <h1>One calendar.<br /><em>Every schedule.</em></h1>
   <p class="hero-description">See events for everyone in one view. Switch timezones, find free time, and sync Apple or Google Calendar.</p>
   <div class="hero-details"><span><Users size={15} />Multiple members</span><span><Clock size={15} />Timezone support</span></div>
   <CalendarPreview />
  </div>
  <div class="auth-panel" id="auth-form">
   <div class="auth-heading"><span class="eyebrow">Get started</span><h2>{activeTab === 'create' ? 'Create a calendar' : 'Open a calendar'}</h2><p>{activeTab === 'create' ? 'Name your calendar, add members, and choose how event details are shared.' : 'Enter the password for your member account or standard shared calendar.'}</p></div>
			<!-- Form Tabs -->
			<div class="auth-tabs">
				<button
					type="button"
					aria-pressed={activeTab === 'create'} onclick={() => activeTab = 'create'}
					class={`flex-1 py-2.5 px-2.5 rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
						activeTab === 'create'
							? 'tab-selected'
							: 'text-slate-400 hover:text-white'
					}`}
				>
					<PlusCircle class="w-4 h-4 shrink-0" />
					<span>Create calendar</span>
				</button>
				<button
					type="button"
					aria-pressed={activeTab === 'open'} onclick={() => activeTab = 'open'}
					class={`flex-1 py-2.5 px-2.5 rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
						activeTab === 'open'
							? 'tab-selected'
							: 'text-slate-400 hover:text-white'
					}`}
				>
					<LogIn class="w-4 h-4 shrink-0" />
					<span>Open calendar</span>
				</button>
			</div>

			<!-- Tab 1: Create Calendar -->
			{#if activeTab === 'create'}
				<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="auth-fields space-y-5">
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
						<label for="create-password-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{privacyEnabled ? 'Person 1 Access Password' : 'Shared Password'}</label>
						<div class="relative">
							<input
								id="create-password-input" autocomplete="new-password"
								type={showCreatePassword ? 'text' : 'password'}
								bind:value={createPassword}
								placeholder={privacyEnabled ? 'Choose Person 1’s password' : 'Choose a shared password'}
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
					<div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
						<label class="flex items-start gap-3 cursor-pointer">
							<input type="checkbox" bind:checked={privacyEnabled} class="mt-0.5 accent-orange-500" />
							<span><strong class="block text-xs text-slate-200">Privacy capable</strong><small class="block text-[11px] leading-relaxed text-slate-400 mt-1">Each person uses a separate password. Other members see your events as Busy. This choice is permanent for this calendar.</small></span>
						</label>
					</div>

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

						<div class="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
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
											aria-label={`Person ${idx + 1} name`} bind:value={member.name}
											placeholder="Name"
											class="px-3 py-1.5 rounded-lg glass-input text-xs"
										/>
										<select aria-label={`Person ${idx + 1} timezone`} bind:value={member.timezone} class="px-2.5 py-1.5 rounded-lg glass-input text-xs bg-slate-900">
											{#each COMMON_TIMEZONES as tz}
												<option value={tz}>{tz}</option>
											{/each}
										</select>
									</div>

										<div class="flex items-center space-x-2 pt-1">
										<input type="color" aria-label={`Person ${idx + 1} color`} bind:value={member.displayColor} class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
										<span class="text-[11px] text-slate-400 font-mono">{member.displayColor}</span>
									</div>
									{#if privacyEnabled && idx === 0}
										<p class="text-[10px] leading-relaxed text-slate-500">Person 1 signs in with the password above.</p>
									{:else if privacyEnabled}
										<label class="block text-[11px] text-slate-400" for={`member-access-${idx}`}>Access password for {member.name || `Person ${idx + 1}`}</label>
										<input id={`member-access-${idx}`} type="password" autocomplete="new-password" minlength="8" bind:value={member.accessPassword} placeholder="At least 8 characters" class="w-full px-3 py-2 rounded-lg glass-input text-xs" />
										<p class="text-[10px] leading-relaxed text-slate-500">Share this password privately with this person. It is only stored as a hash.</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<button
						type="submit"
						disabled={createLoading}
						class="w-full py-3.5 rounded-xl action-primary text-white font-semibold shadow-sm  flex items-center justify-center space-x-2 transition disabled:opacity-50"
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
				<form onsubmit={(e) => { e.preventDefault(); handleOpen(); }} class="auth-fields space-y-5">
					{#if openError}
						<div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
							{openError}
						</div>
					{/if}

					<div>
						<label for="open-member-input" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Your Member Name <span class="normal-case tracking-normal">(privacy calendars)</span></label>
						<input id="open-member-input" type="text" bind:value={openMemberName} placeholder="Your name in this calendar" class="w-full px-4 py-3 rounded-xl glass-input text-sm" />
						<p class="text-[11px] text-slate-500 mt-1">Required for privacy calendars. Leave blank for standard calendars.</p>
					</div>

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
								id="open-password-input" autocomplete="current-password"
								type={showOpenPassword ? 'text' : 'password'}
								bind:value={openPassword}
								placeholder="Enter your password"
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
						class="w-full py-3.5 rounded-xl action-primary text-white font-semibold shadow-sm  flex items-center justify-center space-x-2 transition disabled:opacity-50"
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
  <p class="form-footnote"><Lock size={12} />{activeTab === 'create' ? privacyEnabled ? 'Privacy is fixed when the calendar is created.' : 'Anyone with the name and password can open this calendar.' : 'Privacy calendars require each member’s own password.'}</p>
  </div>
 </section>
 {#if savedCalendars.length > 0}
 <section class="saved-calendars" aria-label="Saved calendars"><span class="eyebrow">Recent calendars</span><div>{#each savedCalendars as name}<a href={`/calendar/${encodeURIComponent(name)}`}><CalendarIcon size={16} /><span>{name}</span><ArrowRight size={14} /></a>{/each}</div></section>
 {/if}
 <section class="features-section">
  <div class="features-heading"><span class="eyebrow">Features</span><h2>Built for shared schedules.</h2><p>View events across members and timezones.</p></div>
  <div class="feature-list">
   <article><span class="feature-number">01</span><div><h3>Timezone views</h3><p>View the calendar in your timezone or a member's timezone.</p></div><Clock size={22} /></article>
   <article><span class="feature-number">02</span><div><h3>Free time</h3><p>Compare schedules to find times when everyone is available.</p></div><Users size={22} /></article>
   <article><span class="feature-number">03</span><div><h3>Apple & Google Calendar sync</h3><p>Import events with iOS Shortcuts or Google Apps Script.</p><a href="/help">Setup guide <ArrowRight size={14} /></a></div><Smartphone size={22} /></article>
  </div>
 </section>
</main>
<footer class="site-footer"><Brand /><a href="/help">Help & setup <ArrowRight size={14} /></a></footer>
