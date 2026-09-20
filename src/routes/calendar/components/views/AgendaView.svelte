<script lang="ts">
    import { calState } from "../../state.svelte";
    import { formatInTimezone, getActiveTimezone } from "../../utils";
    import { List, Clock, Trash2 } from "lucide-svelte";
    import { invalidateAll } from "$app/navigation";

    let activeTimezone = $derived(getActiveTimezone());

    // Reactively filter out past events and sort the remaining upcoming ones
    let upcomingEvents = $derived(
        calState.events
            .filter(
                (evt: any) =>
                    new Date(evt.endTime).getTime() >
                    calState.currentTime.getTime(),
            )
            .sort(
                (a: any, b: any) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime(),
            ),
    );

    function getMemberColor(partnerId: string) {
        return (
            calState.partners.find((pt: any) => pt.id === partnerId)
                ?.displayColor || "#f97316"
        );
    }

    function getMemberName(partnerId: string) {
        return (
            calState.partners.find((pt: any) => pt.id === partnerId)?.name ||
            "Person"
        );
    }

    async function handleDeleteEvent(eventId: string) {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await fetch("/api/calendar", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_event",
                    calendarName: calState.calendarName,
                    eventId,
                }),
            });
            await invalidateAll();
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div
    class="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 p-4 sm:p-6 space-y-4 shadow-xl"
>
    <h3
        class="text-base sm:text-lg font-bold text-white flex items-center space-x-2"
    >
        <div
            class="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0"
        >
            <List class="w-5 h-5" />
        </div>
        <span>Upcoming Agenda</span>
    </h3>

    <!-- Check against our new filtered array instead of calState.events -->
    {#if upcomingEvents.length === 0}
        <div class="text-center py-16 text-slate-500 text-sm">
            No upcoming events found. Click "Add Event" or sync via iOS
            Shortcuts!
        </div>
    {:else}
        <div class="space-y-2.5">
            <!-- Iterate over the filtered array -->
            {#each upcomingEvents as evt}
                <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all gap-3 shadow-sm"
                >
                    <button
                        type="button"
                        onclick={() => (calState.selectedEvent = evt)}
                        class="flex-1 text-left flex items-start sm:items-center space-x-3 cursor-pointer min-w-0"
                    >
                        <div
                            class="w-2.5 h-10 rounded-full shrink-0 shadow-sm"
                            style="background-color: {getMemberColor(
                                evt.partnerId,
                            )}"
                        ></div>
                        <div class="min-w-0 flex-1">
                            <h4
                                class="text-xs sm:text-sm font-bold text-white truncate"
                            >
                                {evt.title}
                            </h4>
                            <div
                                class="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1"
                            >
                                <span
                                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                                    style="background-color: {getMemberColor(
                                        evt.partnerId,
                                    )}22; color: {getMemberColor(
                                        evt.partnerId,
                                    )}"
                                >
                                    {getMemberName(evt.partnerId)}
                                </span>
                                <span
                                    class="flex items-center gap-1 font-mono text-slate-300 text-[11px]"
                                >
                                    <Clock class="w-3 h-3 text-slate-400" />
                                    {formatInTimezone(
                                        evt.startTime,
                                        activeTimezone,
                                    )} – {formatInTimezone(
                                        evt.endTime,
                                        activeTimezone,
                                    )}
                                </span>
                            </div>
                        </div>
                    </button>
                    <button
                        type="button"
                        onclick={() => handleDeleteEvent(evt.id)}
                        class="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer self-end sm:self-center"
                        title="Delete event"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>
