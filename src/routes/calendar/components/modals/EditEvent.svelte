<script lang="ts">
    import { calState } from "../../state.svelte";
    import {
        formatDateTimeInput,
        formatInTimezone,
        getActiveTimezone,
        getMemberColor,
        getMemberName,
    } from "../../utils";
    import { invalidateAll } from "$app/navigation";
    import {
        SquarePen,
        X,
        TriangleAlert,
        Trash2,
        Save,
        CalendarDays,
        Clock,
        User,
    } from "lucide-svelte";

    // Toggle between view mode and edit mode
    let isEditing = $state(false);

    let activeTimezone = $derived(getActiveTimezone());

    let editTitle = $state(calState.selectedEvent?.title || "");
    let editPartnerId = $state(calState.selectedEvent?.partnerId || "");
    let editStart = $state(
        formatDateTimeInput(new Date(calState.selectedEvent?.startTime)),
    );
    let editEnd = $state(
        formatDateTimeInput(new Date(calState.selectedEvent?.endTime)),
    );
    let editError = $state("");
    let editLoading = $state(false);

    async function handleUpdateEvent() {
        editError = "";
        if (!editTitle || !editPartnerId || !editStart || !editEnd) {
            editError = "Please fill out all event fields";
            return;
        }
        if (new Date(editEnd) <= new Date(editStart)) {
            editError = "End time must be after start time";
            return;
        }

        editLoading = true;
        try {
            const res = await fetch("/api/calendar", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_event",
                    calendarName: calState.calendarName,
                    eventId: calState.selectedEvent.id,
                    partnerId: editPartnerId,
                    title: editTitle,
                    startTime: new Date(editStart).toISOString(),
                    endTime: new Date(editEnd).toISOString(),
                }),
            });
            if (!res.ok) {
                const resJson = await res.json();
                editError = resJson.error || "Failed to update event";
            } else {
                calState.selectedEvent = null;
                await invalidateAll();
            }
        } catch (err: any) {
            editError = err.message || "Error updating event";
        } finally {
            editLoading = false;
        }
    }

    async function handleDeleteEvent() {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await fetch("/api/calendar", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_event",
                    calendarName: calState.calendarName,
                    eventId: calState.selectedEvent.id,
                }),
            });
            calState.selectedEvent = null;
            await invalidateAll();
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all"
>
    <div
        class="bg-slate-900/95 border border-slate-800/80 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5"
    >
        {#if !isEditing}
            <!-- ================= VIEW MODE ================= -->
            <div
                class="flex items-center justify-between border-b border-slate-800/80 pb-3.5"
            >
                <div class="flex items-center space-x-2">
                    <CalendarDays class="w-5 h-5 text-orange-400" />
                    <h3 class="text-base font-bold text-white">
                        Event Details
                    </h3>
                </div>
                <div class="flex items-center space-x-1.5">
                    <button
                        type="button"
                        onclick={() => (isEditing = true)}
                        class="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Edit Event"
                    >
                        <SquarePen class="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onclick={handleDeleteEvent}
                        class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Delete Event"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onclick={() => (calState.selectedEvent = null)}
                        class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Close"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div class="space-y-6 pt-2 pb-2">
                <div>
                    <h2
                        class="text-2xl font-extrabold text-white tracking-tight"
                    >
                        {calState.selectedEvent.title}
                    </h2>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center space-x-3.5 text-sm">
                        <User class="w-5 h-5 text-slate-500 shrink-0" />
                        <span
                            class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                            style="background-color: {getMemberColor(
                                calState.selectedEvent.partnerId,
                            )}22; color: {getMemberColor(
                                calState.selectedEvent.partnerId,
                            )}"
                        >
                            {calState.selectedEvent.partnerId === "BOTH"
                                ? "✨ Both (Together)"
                                : getMemberName(
                                      calState.selectedEvent.partnerId,
                                  )}
                        </span>
                    </div>

                    <div class="flex items-start space-x-3.5 text-sm">
                        <Clock class="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        <div class="flex flex-col space-y-0.5">
                            <span class="font-medium text-white">
                                {new Date(
                                    calState.selectedEvent.startTime,
                                ).toLocaleDateString([], {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                            <span class="text-slate-400 text-xs">
                                {formatInTimezone(
                                    calState.selectedEvent.startTime,
                                    activeTimezone,
                                )} – {formatInTimezone(
                                    calState.selectedEvent.endTime,
                                    activeTimezone,
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- ================= EDIT MODE ================= -->
            <div
                class="flex items-center justify-between border-b border-slate-800/80 pb-3.5"
            >
                <div class="flex items-center space-x-2">
                    <SquarePen class="w-5 h-5 text-orange-400" />
                    <h3 class="text-base font-bold text-white">
                        Edit Event Details
                    </h3>
                </div>
                <button
                    type="button"
                    onclick={() => (calState.selectedEvent = null)}
                    class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            {#if editError}
                <div
                    class="p-3.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/30 flex items-center space-x-2"
                >
                    <TriangleAlert class="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                </div>
            {/if}

            <div class="space-y-4">
                <div>
                    <label
                        for="edit-event-title"
                        class="block text-xs font-semibold text-slate-300 mb-1.5"
                        >Event Title</label
                    >
                    <input
                        id="edit-event-title"
                        type="text"
                        bind:value={editTitle}
                        class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                    />
                </div>
                <div>
                    <label
                        for="edit-event-partner"
                        class="block text-xs font-semibold text-slate-300 mb-1.5"
                        >Person</label
                    >
                    <select
                        id="edit-event-partner"
                        bind:value={editPartnerId}
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
                            for="edit-event-start"
                            class="block text-xs font-semibold text-slate-300 mb-1.5"
                            >Start Time</label
                        >
                        <input
                            id="edit-event-start"
                            type="datetime-local"
                            bind:value={editStart}
                            class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                        />
                    </div>
                    <div>
                        <label
                            for="edit-event-end"
                            class="block text-xs font-semibold text-slate-300 mb-1.5"
                            >End Time</label
                        >
                        <input
                            id="edit-event-end"
                            type="datetime-local"
                            bind:value={editEnd}
                            class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                        />
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between pt-2">
                <button
                    type="button"
                    onclick={() => (isEditing = false)}
                    class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onclick={handleUpdateEvent}
                    disabled={editLoading}
                    class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                    <Save class="w-3.5 h-3.5" />
                    <span>{editLoading ? "Updating..." : "Save Changes"}</span>
                </button>
            </div>
        {/if}
    </div>
</div>
