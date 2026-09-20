<script lang="ts">
    import { calState } from "../../state.svelte";
    import {
        getEventsForDay,
        getActiveTimezone,
        formatInTimezone,
        getHourLabel,
        getEventTopPx,
        getEventHeightPx,
        HOUR_HEIGHT,
    } from "../../utils";
    import { Sparkles, CalendarHeart, Clock } from "lucide-svelte";

    let activeTimezone = $derived(getActiveTimezone());
    let dayEvents = $derived(getEventsForDay(calState.currentDate));

    // Allow user to dynamically select the search window
    let startHour = $state(8);
    let endHour = $state(22);

    $effect(() => {
        if (startHour >= endHour) endHour = Math.min(24, startHour + 1);
    });

    let freeSlots = $derived.by(() => {
        const day = calState.currentDate;
        const windowStart = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            startHour,
            0,
            0,
        ).getTime();
        const windowEnd = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            endHour,
            0,
            0,
        ).getTime();

        const intervals = dayEvents
            .map((e) => ({
                start: new Date(e.startTime).getTime(),
                end: new Date(e.endTime).getTime(),
            }))
            .filter((e) => e.end > windowStart && e.start < windowEnd);

        intervals.sort((a, b) => a.start - b.start);

        const merged = [];
        for (const it of intervals) {
            if (merged.length === 0) merged.push({ ...it });
            else {
                const last = merged[merged.length - 1];
                if (last.end >= it.start) last.end = Math.max(last.end, it.end);
                else merged.push({ ...it });
            }
        }

        const gaps = [];
        let current = windowStart;
        for (const m of merged) {
            if (m.start > current && current < windowEnd) {
                gaps.push({
                    start: current,
                    end: Math.min(m.start, windowEnd),
                });
            }
            current = Math.max(current, m.end);
        }
        if (current < windowEnd) gaps.push({ start: current, end: windowEnd });

        return gaps.filter((g) => g.end - g.start >= 1800000); // 30+ mins only
    });

    function formatDuration(ms: number) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
        if (hours > 0) return `${hours} hr`;
        return `${minutes} min`;
    }
</script>

<div
    class="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 p-4 sm:p-6 space-y-4 shadow-xl"
>
    <div
        class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4"
    >
        <div class="flex items-center space-x-3">
            <div
                class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"
            >
                <Sparkles class="w-5 h-5" />
            </div>
            <div>
                <h3 class="text-base font-bold text-white">Mutual Free Time</h3>
                <p class="text-xs text-slate-400 font-medium">
                    Available blocks (30+ min)
                </p>
            </div>
        </div>

        <div
            class="flex items-center space-x-2 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800 shadow-inner"
        >
            <span
                class="text-slate-400 text-xs font-medium pl-1 hidden sm:inline"
                >Between</span
            >
            <select
                bind:value={startHour}
                class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none cursor-pointer transition"
            >
                {#each Array.from({ length: 24 }, (_, i) => i) as hr}
                    <option value={hr}>{getHourLabel(hr)}</option>
                {/each}
            </select>
            <span class="text-slate-400 text-xs font-medium">and</span>
            <select
                bind:value={endHour}
                class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none cursor-pointer transition"
            >
                {#each Array.from({ length: 24 }, (_, i) => i) as hr}
                    <option value={hr} disabled={hr <= startHour}
                        >{getHourLabel(hr)}</option
                    >
                {/each}
                <option value={24} disabled={24 <= startHour}
                    >12 AM (Next Day)</option
                >
            </select>
        </div>
    </div>

    {#if freeSlots.length === 0}
        <div
            class="text-center py-12 text-slate-500 text-sm flex flex-col items-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30"
        >
            <CalendarHeart class="w-8 h-8 text-slate-700 mb-3" />
            No mutual free time found in this window. Everyone is booked!
        </div>
    {:else}
        <!-- Removed overflow-x-auto so it perfectly fits the screen width -->
        <div
            class="border border-slate-800/80 rounded-xl bg-slate-950/80 shadow-inner mt-2"
        >
            <!-- Changed from min-w-[600px] to w-full so it takes exactly 1 column width -->
            <div
                class="w-full grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] relative"
            >
                <div
                    class="border-r border-slate-800/80 bg-slate-900/60 divide-y divide-slate-800/60"
                >
                    {#each Array.from({ length: endHour - startHour }, (_, i) => startHour + i) as hr}
                        <div
                            class="px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-mono text-slate-500 flex items-start pt-1 justify-end"
                            style="height: {HOUR_HEIGHT}px;"
                        >
                            {getHourLabel(hr, false)}
                        </div>
                    {/each}
                </div>

                <div
                    class="relative overflow-hidden"
                    style="height: {(endHour - startHour) * HOUR_HEIGHT}px"
                >
                    {#each Array.from( { length: endHour - startHour }, ) as _, idx}
                        <div
                            class="absolute w-full border-b border-slate-800/30"
                            style="top: {idx *
                                HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"
                        ></div>
                    {/each}

                    {#each freeSlots as slot}
                        {@const isoStart = new Date(slot.start).toISOString()}
                        {@const isoEnd = new Date(slot.end).toISOString()}

                        <div
                            class="absolute rounded-xl border-l-4 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex flex-col justify-start p-2 sm:p-2.5 shadow-sm overflow-hidden z-10 backdrop-blur-sm"
                            style="
                                top: {getEventTopPx(
                                isoStart,
                                activeTimezone,
                                startHour,
                            )}px; 
                                height: {getEventHeightPx(isoStart, isoEnd)}px;
                                left: 6px;
                                width: calc(100% - 12px);
                            "
                        >
                            <div
                                class="flex items-center justify-between w-full"
                            >
                                <span
                                    class="text-[11px] sm:text-xs font-bold text-emerald-400 leading-tight"
                                    >Free Time Match</span
                                >
                                <span
                                    class="text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
                                >
                                    {formatDuration(slot.end - slot.start)}
                                </span>
                            </div>
                            <span
                                class="text-[10px] sm:text-[11px] text-emerald-500/80 font-mono mt-1 truncate"
                            >
                                {formatInTimezone(isoStart, activeTimezone)} – {formatInTimezone(
                                    isoEnd,
                                    activeTimezone,
                                )}
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
