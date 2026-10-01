<script lang="ts">
    import { calState } from "../../state.svelte";
    import {
        getActiveTimezone,
        getGridRangeForDay,
        getHourLabel,
        getEventTopPx,
        getEventSegmentForDay,
        getEventSegmentTopPx,
        formatInTimezone,
        isSameDayInTz,
        computeEventColumns,
        HOUR_HEIGHT,
        getEventsForDayAndMember,
        isVisibleEvent,
    } from "../../utils";

    let { dayDate } = $props<{ dayDate: Date }>();

    let activeTimezone = $derived(getActiveTimezone());

    // Track whether the user wants to see all 24 hours or the auto-fitted range
    let showAllHours = $state(false);
    const GRID_TOP_PADDING = 16;

    // Dynamically calculate the range based on the toggle state
    let range = $derived(
        showAllHours
            ? { startHour: 0, endHour: 24, totalHours: 24 }
            : getGridRangeForDay(dayDate),
    );
</script>

<div
    class="daily-grid overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/80 shadow-sm"
>
    <div
        class="min-w-[320px] grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] relative"
    >
        <div
            class="border-r border-slate-800/80 bg-slate-900/60 divide-y divide-slate-800/60"
        >
            <!-- Top-left corner cell holding the toggle button -->
            <div
                class="h-10 bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-20 flex items-center justify-center p-1 sm:p-2"
            >
                <button
                    type="button"
                    onclick={() => (showAllHours = !showAllHours)}
                    class="w-full h-full rounded text-[9px] sm:text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer {showAllHours
                        ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                    title={showAllHours
                        ? "Fit to events"
                        : "Show full 24 hours"}
                >
                    {showAllHours ? "FIT" : "24H"}
                </button>
            </div>

            {#each Array.from({ length: range.totalHours }, (_, i) => range.startHour + i) as hr}
                {#if hr === range.startHour}<div style="height: {GRID_TOP_PADDING}px"></div>{/if}
                <div
                    class="h-[56px] px-1.5 text-[10px] font-mono text-slate-500 flex items-start pt-1 justify-end"
                >
                    {getHourLabel(hr, false)}
                </div>
            {/each}
        </div>

        <div
            class="grid divide-x divide-slate-800/80 w-full"
            style="grid-template-columns: repeat({Math.max(
                1,
                calState.partners.length,
            )}, minmax(140px, 1fr))"
        >
            {#each calState.partners as member}
                <div class="flex flex-col relative overflow-hidden">
                    <div
                        class="h-10 px-3 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20"
                    >
                        <div class="flex items-center space-x-2 truncate">
                            <span
                                class="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                style="background-color: {member.displayColor}"
                            ></span>
                            <span class="text-xs font-bold text-white truncate"
                                >{member.name}</span
                            >
                        </div>
                    </div>
                    <div
                        class="relative"
                        style="height: {range.totalHours * HOUR_HEIGHT + GRID_TOP_PADDING}px"
                    >
                        {#each Array.from( { length: range.totalHours }, ) as _, idx}
                            <div
                                class="absolute w-full border-b border-slate-800/30"
                                style="top: {GRID_TOP_PADDING + idx *
                                    HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"
                            ></div>
                        {/each}

                        {#if isSameDayInTz(dayDate, calState.currentTime.toISOString(), activeTimezone)}
                            {@const topPx = GRID_TOP_PADDING + getEventTopPx(
                                calState.currentTime.toISOString(),
                                activeTimezone,
                                range.startHour,
                            )}
                            {#if topPx >= 0 && topPx <= range.totalHours * HOUR_HEIGHT}
                                <div
                                    class="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                                    style="top: {topPx}px;"
                                >
                                    <div
                                        class="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                                    ></div>
                                    <div
                                        class="h-[2px] bg-red-500/80 w-full shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                                    ></div>
                                </div>
                            {/if}
                        {/if}

                        {#each computeEventColumns(getEventsForDayAndMember(dayDate, member.id).filter(isVisibleEvent)) as { evt, col, totalCols }}
                            {@const segment = getEventSegmentForDay(evt, dayDate, activeTimezone)}
                            {@const eventHeight = Math.max(32, segment.durationHours * HOUR_HEIGHT)}
                            {@const isCompact = eventHeight < 48}
                            <button
                                type="button"
                                onclick={() => (calState.selectedEvent = evt)}
                                aria-label="{evt.title}, {formatInTimezone(evt.startTime, activeTimezone)} to {formatInTimezone(evt.endTime, activeTimezone)}"
                                class="schedule-event absolute {isCompact ? 'p-1.5' : 'p-2'} rounded-xl text-xs font-medium overflow-hidden shadow-sm flex flex-col justify-start text-left transition-all hover:brightness-125 hover:scale-[1.01] cursor-pointer z-10"
                                style="top: {GRID_TOP_PADDING + getEventSegmentTopPx(
                                    segment.startTime,
                                    range.startHour,
                                )}px; height: {eventHeight}px; left: calc({(col / totalCols) *
                                    100}% + 2px); width: calc({(1 / totalCols) *
                                    100}% - 4px); background-color: {member.displayColor}22; border-left: 3.5px solid {member.displayColor}; border-top: 1px solid {member.displayColor}44"
                            >
                                <span
                                    class="font-bold text-white truncate text-[11px] leading-tight w-full"
                                    >{evt.title}</span
                                >
                                {#if !isCompact}
                                    <span
                                        class="event-time text-[11px] text-slate-300 font-mono truncate opacity-90 w-full mt-1"
                                    >
                                        {formatInTimezone(evt.startTime, activeTimezone)} – {formatInTimezone(evt.endTime, activeTimezone)}
                                    </span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
