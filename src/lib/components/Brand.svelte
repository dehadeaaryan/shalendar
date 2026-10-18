<script lang="ts">
 import logo from '$lib/assets/logo.png';
 let { compact = false } = $props<{ compact?: boolean }>();
</script>
<a href="/" class="brand" aria-label="Shalendar home">
 <img src={logo} width="46" height="32" alt="AD" />
 {#if !compact}<span>shalendar<span class="brand-period">.</span></span>{/if}
</a>
