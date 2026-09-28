<script lang="ts">
 import logo from '$lib/assets/logo.png';
 let { compact = false } = $props<{ compact?: boolean }>();
</script>
<a href="/" class="brand" aria-label="Shalendar home">
 <img src={logo} width="40" height="40" alt="AD" />
 {#if !compact}<span>shalendar<span class="brand-period">.</span></span>{/if}
</a>
