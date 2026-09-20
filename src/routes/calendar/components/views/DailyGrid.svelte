<script lang="ts">
    import { calState } from "../../state.svelte";
    import {
        getActiveTimezone,
        getGridRangeForDay,
        getHourLabel,
        getEventTopPx,
        getEventHeightPx,
        formatInTimezone,
        isSameDayInTz,
        computeEventColumns,
        HOUR_HEIGHT,
        getEventsForDayAndMember,
    } from "../../utils";

    let { dayDate } = $props<{ dayDate: Date }>();

    let activeTimezone = $derived(getActiveTimezone());

    // Track whether the user wants to see all 24 hours or the auto-fitted range
    let showAllHours = $state(false);

    // Dynamically calculate the range based on the toggle state
    let range = $derived(
        showAllHours
            ? { startHour: 0, endHour: 24, totalHours: 24 }
            : getGridRangeForDay(dayDate),
    );
</script>

<div
    class="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/80 shadow-inner"
>
    <div
        class="min-w-[320px] sm:min-w-[700px] grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] relative"
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
            )}, minmax(0, 1fr))"
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
                        style="height: {range.totalHours * HOUR_HEIGHT}px"
                    >
                        {#each Array.from( { length: range.totalHours }, ) as _, idx}
                            <div
                                class="absolute w-full border-b border-slate-800/30"
                                style="top: {idx *
                                    HOUR_HEIGHT}px; height: {HOUR_HEIGHT}px"
                            ></div>
                        {/each}

                        {#if isSameDayInTz(dayDate, calState.currentTime.toISOString(), activeTimezone)}
                            {@const topPx = getEventTopPx(
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

                        {#each computeEventColumns(getEventsForDayAndMember(dayDate, member.id)) as { evt, col, totalCols }}
                            <button
                                type="button"
                                onclick={() => (calState.selectedEvent = evt)}
                                class="absolute p-2 rounded-xl text-xs font-medium overflow-hidden shadow-md flex flex-col justify-start text-left transition-all hover:brightness-125 hover:scale-[1.01] cursor-pointer z-10"
                                style="top: {getEventTopPx(
                                    evt.startTime,
                                    activeTimezone,
                                    range.startHour,
                                )}px; height: {getEventHeightPx(
                                    evt.startTime,
                                    evt.endTime,
                                )}px; left: calc({(col / totalCols) *
                                    100}% + 2px); width: calc({(1 / totalCols) *
                                    100}% - 4px); background-color: {member.displayColor}22; border-left: 3.5px solid {member.displayColor}; border-top: 1px solid {member.displayColor}44"
                            >
                                <span
                                    class="font-bold text-white truncate text-[11px] leading-tight w-full"
                                    >{evt.title}</span
                                >
                                <span
                                    class="text-[9px] text-slate-300 font-mono truncate opacity-90 w-full mt-1"
                                >
                                    {formatInTimezone(
                                        evt.startTime,
                                        activeTimezone,
                                    )} – {formatInTimezone(
                                        evt.endTime,
                                        activeTimezone,
                                    )}
                                </span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
