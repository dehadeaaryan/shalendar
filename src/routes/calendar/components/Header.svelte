<script lang="ts">
    import Brand from '$lib/components/Brand.svelte';
    import { calState } from '../state.svelte';
    import { Globe, Plus, Settings, Lock, CircleHelp } from 'lucide-svelte';
    import { invalidateAll } from '$app/navigation';

    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    let lockError = $state('');
    async function handleLockCalendar() {
        lockError = '';
        try {
            const res = await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout', calendarName: calState.calendarName })
            });
            if (!res.ok) throw new Error('Could not lock calendar. Please try again.');
            await invalidateAll();
        } catch {
            lockError = 'Could not lock calendar. Please try again.';
        }
    }
</script>

<header class="calendar-header">
    <div class="calendar-header-inner">
        <div class="calendar-identity">
            <Brand />
            <div class="calendar-title"><h1>{calState.calendarName}</h1><p>Your shared calendar</p></div>
        </div>
        {#if calState.isAuthenticated}
            <div class="calendar-actions">
                <label class="timezone-control">
                    <Globe size={16} />
                    <select aria-label="View calendar in timezone" bind:value={calState.selectedTimezonePerspective}>
                        <option value="LOCAL">Local · {localTimezone.split('/').pop()?.replaceAll('_', ' ')}</option>
                        {#each calState.partners as member}
                            <option value={member.id}>{member.name} · {member.timezone.split('/').pop()?.replaceAll('_', ' ')}</option>
                        {/each}
                        <option value="UTC">UTC</option>
                    </select>
                </label>
                <button class="button-primary" onclick={() => calState.showAddModal = true}><Plus size={16} />Add event</button>
                <button class="icon-button" aria-label="Calendar settings" title="Calendar settings" onclick={() => calState.showSettingsModal = true}><Settings size={18} /></button>
                <button class="icon-button" aria-label="Lock calendar" title="Lock calendar" onclick={handleLockCalendar}><Lock size={17} /></button>
            </div>
        {:else}
            <a class="button-secondary" href="/help"><CircleHelp size={16} />Setup guide</a>
        {/if}
    </div>
    {#if lockError}<p role="alert" class="px-8 pb-4 text-sm text-red-400">{lockError}</p>{/if}
</header>
