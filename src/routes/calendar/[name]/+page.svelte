<script lang="ts">
	import { calState } from "../state.svelte";
	import Header from "../components/Header.svelte";
	import AuthGuard from "../components/AuthGuard.svelte";
	import Toolbar from "../components/Toolbar.svelte";
	import TodayView from "../components/views/TodayView.svelte";
	import WeekView from "../components/views/WeekView.svelte";
	import MonthView from "../components/views/MonthView.svelte";
	import AgendaView from "../components/views/AgendaView.svelte";
	import AddEvent from "../components/modals/AddEvent.svelte";
	import EditEvent from "../components/modals/EditEvent.svelte";
	import SettingsModal from "../components/modals/Settings.svelte";
	import MatchView from "../components/views/MatchView.svelte";

	let { data } = $props();

	$effect(() => {
		calState.events = data.events;
		calState.partners = data.partners;
		calState.calendarName = data.calendarName;
		calState.isAuthenticated = data.isAuthenticated;
		calState.privacyEnabled = data.privacyEnabled;
		calState.viewerPartnerId = data.viewerPartnerId;
		calState.viewerIsOwner = data.viewerIsOwner;
	});
</script>

<div
	class="calendar-app"
>
	<Header />

	<main class="calendar-main">
		{#if !calState.isAuthenticated}
			<AuthGuard />
		{:else}
			<div class="space-y-6">
				<Toolbar />
 <div class="member-legend" aria-label="Calendar members">
  <span class="eyebrow">Your people</span>
  {#each calState.partners as member}<span class="member-chip"><i style="background: {member.displayColor}"></i>{member.name}<span class="member-timezone">{member.timezone.split('/').pop()?.replaceAll('_', ' ')}</span></span>{/each}
 </div>

				{#if calState.viewMode === "today"}
					<TodayView />
				{:else if calState.viewMode === "week"}
					<WeekView />
				{:else if calState.viewMode === "month"}
					<MonthView />
				{:else if calState.viewMode === "agenda"}
					<AgendaView />
				{:else}
					<MatchView />
				{/if}
			</div>
		{/if}
	</main>
</div>

{#if calState.showAddModal}
	<AddEvent />
{/if}
{#if calState.selectedEvent}
	<EditEvent />
{/if}
{#if calState.showSettingsModal}
	<SettingsModal />
{/if}
