<script lang="ts">
    import { calState } from '../state.svelte';
    import { getDaysInWeek, isLongEvent } from '../utils';
    import { ChevronLeft, ChevronRight, Sun, Columns4, CalendarDays, List, Sparkles, Eye, EyeOff } from 'lucide-svelte';

    const views = [
        { key: 'today', label: 'Day', icon: Sun },
        { key: 'week', label: 'Week', icon: Columns4 },
        { key: 'month', label: 'Month', icon: CalendarDays },
        { key: 'agenda', label: 'Agenda', icon: List },
        { key: 'match', label: 'Free time', icon: Sparkles }
    ] as const;
    let weekDays = $derived(getDaysInWeek(calState.currentDate));
    let periodLabel = $derived.by(() => {
        if (calState.viewMode === 'agenda') return 'Your upcoming plans';
        if (calState.viewMode === 'month') return calState.currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
        if (calState.viewMode === 'week') return `${weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
        return calState.currentDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    });
    function movePeriod(direction: number) {
        const date = new Date(calState.currentDate);
        if (calState.viewMode === 'month') {
            date.setDate(1);
            date.setMonth(date.getMonth() + direction);
        } else {
            date.setDate(date.getDate() + direction * (calState.viewMode === 'week' ? 7 : 1));
        }
        calState.currentDate = date;
    }
    function toggleLongEvents() {
        calState.showLongEvents = !calState.showLongEvents;
        if (!calState.showLongEvents && calState.selectedEvent && isLongEvent(calState.selectedEvent)) {
            calState.selectedEvent = null;
        }
    }
</script>

<div class="calendar-toolbar">
    <div class="period-heading">
        <h2 aria-live="polite">{periodLabel}</h2>
        {#if calState.viewMode !== 'agenda'}
            <div class="date-navigation">
                <button class="icon-button" aria-label="Previous period" onclick={() => movePeriod(-1)}><ChevronLeft size={17} /></button>
                <button class="button-secondary" onclick={() => calState.currentDate = new Date()}>Today</button>
                <button class="icon-button" aria-label="Next period" onclick={() => movePeriod(1)}><ChevronRight size={17} /></button>
            </div>
        {/if}
    </div>
    <div class="view-switcher" role="group" aria-label="Calendar view">
        {#each views as view}
            <button aria-pressed={calState.viewMode === view.key} onclick={() => calState.viewMode = view.key}><view.icon size={15} /><span>{view.label}</span></button>
        {/each}
    </div>
    <div class="toolbar-options">
        <button
            type="button"
            class="button-secondary long-events-toggle"
            aria-pressed={calState.showLongEvents}
            onclick={toggleLongEvents}
            title="Toggle events lasting 23 hours or longer"
        >
            {#if calState.showLongEvents}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
            <span>{calState.showLongEvents ? 'Hide 23+ hr' : 'Show 23+ hr'}</span>
        </button>
    </div>
</div>
