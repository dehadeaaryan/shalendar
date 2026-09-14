<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Shalendar — Shared Multi-Person Calendar</title>
	<meta name="description" content="Sync and view your shared calendar seamlessly with iOS Shortcuts integration, timezone conversions, and color-coded overlays." />
</svelte:head>

<div class="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
	{@render children()}
</div>
