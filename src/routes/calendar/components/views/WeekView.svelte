<script lang="ts">
    import { calState } from "../../state.svelte";
    import { getDaysInWeek, getEventsForDay, isVisibleEvent, isSameDay } from "../../utils";
    import DailyGrid from "./DailyGrid.svelte";
    import { Maximize2, Minimize2, ChevronDown, ChevronUp, Columns4 } from "lucide-svelte";

    let collapsedDays = $state<Record<string, boolean>>({});
    let weekDays = $derived(getDaysInWeek(calState.currentDate));

    function getDayKey(date: Date) {
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    function isDayCollapsed(dayDate: Date, eventCount: number): boolean {
        const key = getDayKey(dayDate);
        if (collapsedDays[key] !== undefined) return collapsedDays[key];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const check = new Date(dayDate);
        check.setHours(0, 0, 0, 0);
        return check.getTime() < now.getTime() || eventCount === 0;
    }

    function toggleDayCollapse(dayDate: Date, eventCount: number) {
        collapsedDays[getDayKey(dayDate)] = !isDayCollapsed(dayDate, eventCount);
    }
</script>

<div class="calendar-surface bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 space-y-4 shadow-sm">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-3 gap-3">
        <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-yellow-400 shrink-0">
                <Columns4 class="w-5 h-5" />
            </div>
            <div>
                <h3 class="text-base font-bold text-white">The week ahead</h3>
                <p class="text-xs text-slate-400 font-medium">Select an event to see the details.</p>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <button
                onclick={() => { for (const day of weekDays) collapsedDays[getDayKey(day)] = false; }}
                class="px-3 py-1.5 rounded-xl bg-slate-950 text-[11px] font-semibold text-slate-300 border border-slate-800/80 hover:bg-slate-800 hover:text-white transition flex items-center space-x-1.5"
            ><Maximize2 class="w-3.5 h-3.5 text-orange-400" /><span>Expand All</span></button>
            <button
                onclick={() => { for (const day of weekDays) collapsedDays[getDayKey(day)] = true; }}
                class="px-3 py-1.5 rounded-xl bg-slate-950 text-[11px] font-semibold text-slate-300 border border-slate-800/80 hover:bg-slate-800 hover:text-white transition flex items-center space-x-1.5"
            ><Minimize2 class="w-3.5 h-3.5 text-slate-400" /><span>Collapse All</span></button>
        </div>
    </div>

    <div class="overflow-x-auto pb-2">
        <div class="grid grid-flow-col auto-cols-[minmax(320px,1fr)] gap-3 min-w-max">
            {#each weekDays as day}
                {@const dayEvents = getEventsForDay(day).filter(isVisibleEvent)}
                {@const isCollapsed = isDayCollapsed(day, dayEvents.length)}
                <section class={`rounded-2xl border transition-all ${isSameDay(day, new Date()) ? "border-orange-500/50 bg-slate-900/80 shadow-sm" : "border-slate-800/80 bg-slate-950/40"}`}>
                    <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        onclick={() => toggleDayCollapse(day, dayEvents.length)}
                        class="w-full min-h-16 p-3 flex items-center justify-between text-left hover:bg-slate-900/60 rounded-2xl transition cursor-pointer"
                    >
                        <div class="flex items-center space-x-3">
                            <span class={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center ${isSameDay(day, new Date()) ? "bg-orange-500 text-white shadow-sm" : "bg-slate-800 text-slate-300"}`}>{day.getDate()}</span>
                            <span class="text-sm font-bold text-white">{day.toLocaleDateString([], { weekday: "short", month: "short" })}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800/80">{dayEvents.length}</span>
                            {#if isCollapsed}<ChevronDown class="w-4 h-4 text-slate-400" />{:else}<ChevronUp class="w-4 h-4 text-orange-400" />{/if}
                        </div>
                    </button>

                    {#if !isCollapsed}
                        <div class="p-2 pt-0 border-t border-slate-800/60">
                            <DailyGrid dayDate={day} />
                        </div>
                    {/if}
                </section>
            {/each}
        </div>
    </div>
</div>
