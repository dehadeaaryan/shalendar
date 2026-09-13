<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Shalendar — Shared Couple's Calendar</title>
	<meta name="description" content="Sync and view your couple calendar seamlessly with iOS Shortcuts integration and real-time color-coded overlays." />
</svelte:head>

<div class="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
	{@render children()}
</div>
