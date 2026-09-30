<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';

	let { children } = $props();
	const title = 'Shalendar — Shared Multi-Person Calendar';
	const description = 'See everyone’s schedule in one shared calendar. Compare time zones, find free time, and sync with Apple Calendar.';
	const previewImage = 'https://shalendar.aaryandehade.com/og-preview.png?v=3';
	let pageUrl = $derived(new URL(page.url.pathname, 'https://shalendar.aaryandehade.com').href);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:site_name" content="Shalendar" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={previewImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Shalendar: One calendar. Every schedule." />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={pageUrl} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={previewImage} />
</svelte:head>

<div class="app-shell min-h-screen text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
	<div class="ambient-background" aria-hidden="true">
		<div class="ambient-orbit"><span class="ambient-blob blob-one"></span><span class="ambient-blob blob-two"></span><span class="ambient-blob blob-three"></span></div>
		<div class="grain-layer"></div>
	</div>
	{@render children()}
</div>
