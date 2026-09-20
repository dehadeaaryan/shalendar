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
	});
</script>

<div
	class="min-h-screen flex flex-col bg-[#080c14] text-slate-100 antialiased selection:bg-orange-500/30 selection:text-orange-200"
>
	<Header />

	<main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{#if !calState.isAuthenticated}
			<AuthGuard />
		{:else}
			<div class="space-y-6">
				<Toolbar />

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
