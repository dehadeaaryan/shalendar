<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Shalendar — Shared Multi-Person Calendar</title>
	<meta name="description" content="Sync and view your shared calendar seamlessly with iOS Shortcuts integration, timezone conversions, and color-coded overlays." />
</svelte:head>

<div class="app-shell min-h-screen text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
	<div class="ambient-background" aria-hidden="true">
		<div class="ambient-orbit"><span class="ambient-blob blob-one"></span><span class="ambient-blob blob-two"></span><span class="ambient-blob blob-three"></span></div>
		<div class="grain-layer"></div>
	</div>
	{@render children()}
</div>
