<script lang="ts">
    import { calState } from "../../state.svelte";
    import { formatDateTimeInput } from "../../utils";
    import { invalidateAll } from "$app/navigation";
    import { CalendarPlus, X, AlertTriangle } from "lucide-svelte";

    let newEventTitle = $state("");
    let newEventPartnerId = $state(calState.partners[0]?.id || "");
    let newEventStart = $state(formatDateTimeInput(new Date()));
    let newEventEnd = $state(
        formatDateTimeInput(new Date(Date.now() + 3600000)),
    );
    let addError = $state("");
    let addLoading = $state(false);

    async function handleAddEvent() {
        addError = "";
        if (
            !newEventTitle ||
            !newEventPartnerId ||
            !newEventStart ||
            !newEventEnd
        ) {
            addError = "Please fill out all event fields";
            return;
        }
        if (new Date(newEventEnd) <= new Date(newEventStart)) {
            addError = "End time must be after start time";
            return;
        }

        addLoading = true;
        try {
            const res = await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_event",
                    calendarName: calState.calendarName,
                    partnerId: newEventPartnerId,
                    title: newEventTitle,
                    startTime: new Date(newEventStart).toISOString(),
                    endTime: new Date(newEventEnd).toISOString(),
                }),
            });
            if (!res.ok) {
                const resJson = await res.json();
                addError = resJson.error || "Failed to add event";
            } else {
                calState.showAddModal = false;
                await invalidateAll();
            }
        } catch (err: any) {
            addError = err.message || "Error adding event";
        } finally {
            addLoading = false;
        }
    }
</script>

<div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all"
>
    <div
        class="bg-slate-900/95 border border-slate-800/80 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5"
    >
        <div
            class="flex items-center justify-between border-b border-slate-800/80 pb-3.5"
        >
            <div class="flex items-center space-x-2">
                <CalendarPlus class="w-5 h-5 text-orange-400" />
                <h3 class="text-base font-bold text-white">Add New Event</h3>
            </div>
            <button
                type="button"
                onclick={() => (calState.showAddModal = false)}
                class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        {#if addError}
            <div
                class="p-3.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/30 flex items-center space-x-2"
            >
                <AlertTriangle class="w-4 h-4 shrink-0" />
                <span>{addError}</span>
            </div>
        {/if}

        <div class="space-y-4">
            <div>
                <label
                    for="event-title-input"
                    class="block text-xs font-semibold text-slate-300 mb-1.5"
                    >Event Title</label
                >
                <input
                    id="event-title-input"
                    type="text"
                    bind:value={newEventTitle}
                    placeholder="e.g. Dinner Date"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
            </div>
            <div>
                <label
                    for="event-partner-select"
                    class="block text-xs font-semibold text-slate-300 mb-1.5"
                    >Person</label
                >
                <select
                    id="event-partner-select"
                    bind:value={newEventPartnerId}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition cursor-pointer"
                >
                    {#if calState.partners.length > 1}
                        <option value="BOTH">✨ Both (Together)</option>
                    {/if}
                    {#each calState.partners as partner}
                        <option value={partner.id}>{partner.name}</option>
                    {/each}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label
                        for="event-start-input"
                        class="block text-xs font-semibold text-slate-300 mb-1.5"
                        >Start Time</label
                    >
                    <input
                        id="event-start-input"
                        type="datetime-local"
                        bind:value={newEventStart}
                        class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                    />
                </div>
                <div>
                    <label
                        for="event-end-input"
                        class="block text-xs font-semibold text-slate-300 mb-1.5"
                        >End Time</label
                    >
                    <input
                        id="event-end-input"
                        type="datetime-local"
                        bind:value={newEventEnd}
                        class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                    />
                </div>
            </div>
        </div>

        <div class="pt-2 flex justify-end space-x-2">
            <button
                type="button"
                onclick={() => (calState.showAddModal = false)}
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >Cancel</button
            >
            <button
                type="button"
                onclick={handleAddEvent}
                disabled={addLoading}
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
            >
                {addLoading ? "Saving..." : "Save Event"}
            </button>
        </div>
    </div>
</div>
