<script lang="ts">
    import { calState } from "../../state.svelte";
    import { COMMON_TIMEZONES } from "../../utils";
    import { invalidateAll } from "$app/navigation";
    import {
        Settings,
        X,
        Check,
        UserX,
        UserPlus,
        Smartphone,
        ExternalLink,
        Copy,
        AlertTriangle,
        Trash2,
        Users,
    } from "lucide-svelte";

    let activeSettingsTab = $state<"members" | "sync" | "danger">("members");
    let memberSettings = $state(calState.partners.map((p: any) => ({ ...p })));
    let settingsMessage = $state("");
    let settingsLoading = $state(false);
    let newMemberName = $state("");
    let copiedEndpoint = $state(false);

    async function handleSaveSettings() {
        settingsMessage = "";
        settingsLoading = true;
        try {
            for (const m of memberSettings) {
                await fetch("/api/calendar", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        calendarName: calState.calendarName,
                        partnerId: m.id,
                        name: m.name,
                        displayColor: m.displayColor,
                        timezone: m.timezone,
                    }),
                });
            }
            settingsMessage = "Member settings saved successfully!";
            await invalidateAll();
        } catch (e: any) {
            settingsMessage = "Failed to save settings";
        } finally {
            settingsLoading = false;
            setTimeout(() => (settingsMessage = ""), 4000);
        }
    }

    async function handleAddMember() {
        if (!newMemberName.trim()) return;
        try {
            await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_member",
                    calendarName: calState.calendarName,
                    name: newMemberName.trim(),
                    displayColor: "#3b82f6",
                    timezone: "UTC",
                }),
            });
            newMemberName = "";
            settingsMessage = "Member added successfully!";
            await invalidateAll();
            memberSettings = calState.partners.map((p: any) => ({ ...p }));
            setTimeout(() => (settingsMessage = ""), 4000);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleDeleteMember(partnerId: string, name: string) {
        if (
            !confirm(
                `Are you sure you want to remove ${name} and ALL of their events?`,
            )
        )
            return;
        try {
            await fetch("/api/calendar", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_member",
                    calendarName: calState.calendarName,
                    partnerId,
                }),
            });
            settingsMessage = `${name} removed successfully.`;
            await invalidateAll();
            memberSettings = memberSettings.filter((m) => m.id !== partnerId);
            setTimeout(() => (settingsMessage = ""), 4000);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleDeleteAllEvents() {
        if (
            !confirm(
                "DANGER: Are you sure you want to delete ALL events from this calendar?",
            )
        )
            return;
        try {
            await fetch("/api/calendar", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_all_events",
                    calendarName: calState.calendarName,
                }),
            });
            calState.showSettingsModal = false;
            await invalidateAll();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleDeleteCalendar() {
        const confirmName = prompt(
            `DANGER: Type "${calState.calendarName}" to confirm deletion:`,
        );
        if (confirmName !== calState.calendarName) return;
        try {
            const res = await fetch("/api/calendar", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_calendar",
                    calendarName: calState.calendarName,
                }),
            });
            if (res.ok) window.location.href = "/";
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
>
    <div
        class="bg-slate-900 border border-slate-800/80 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl shadow-black/50"
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md"
        >
            <div class="flex items-center space-x-3">
                <div
                    class="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20"
                >
                    <Settings class="w-5 h-5 text-orange-400" />
                </div>
                <div>
                    <h3 class="text-lg font-bold text-white tracking-tight">
                        Calendar Settings
                    </h3>
                    <p class="text-[11px] text-slate-400 font-medium">
                        Manage members, syncing, and data
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={() => (calState.showSettingsModal = false)}
                class="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition cursor-pointer active:scale-95"
                title="Close"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Navigation Tabs -->
        <div
            class="flex px-6 bg-slate-950/40 border-b border-slate-800/80 space-x-6 text-sm font-semibold overflow-x-auto hide-scrollbar"
        >
            <button
                onclick={() => (activeSettingsTab = "members")}
                class={`py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-2 ${activeSettingsTab === "members" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
                <Users class="w-4 h-4" /><span>Members</span>
            </button>
            <button
                onclick={() => (activeSettingsTab = "sync")}
                class={`py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-2 ${activeSettingsTab === "sync" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
                <Smartphone class="w-4 h-4" /><span>API & Sync</span>
            </button>
            <button
                onclick={() => (activeSettingsTab = "danger")}
                class={`py-4 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-2 ${activeSettingsTab === "danger" ? "border-red-500 text-red-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
                <AlertTriangle class="w-4 h-4" /><span>Danger Zone</span>
            </button>
        </div>

        <!-- Content Area -->
        <div class="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            {#if settingsMessage}
                <div
                    class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2"
                >
                    <Check class="w-4 h-4 shrink-0" />
                    <span>{settingsMessage}</span>
                </div>
            {/if}

            {#if activeSettingsTab === "members"}
                <div class="space-y-6 animate-in fade-in duration-300">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {#each memberSettings as member, idx}
                            <div
                                class="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 relative space-y-4 shadow-sm group hover:border-slate-700 transition-colors"
                            >
                                <button
                                    type="button"
                                    onclick={() =>
                                        handleDeleteMember(
                                            member.id,
                                            member.name,
                                        )}
                                    class="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                                    title="Remove Member"
                                >
                                    <UserX class="w-4 h-4" />
                                </button>

                                <div class="space-y-4">
                                    <div>
                                        <label
                                            for={`member-name-${idx}`}
                                            class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                                            >Display Name</label
                                        >
                                        <input
                                            id={`member-name-${idx}`}
                                            type="text"
                                            bind:value={member.name}
                                            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for={`member-tz-${idx}`}
                                            class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                                            >Timezone</label
                                        >
                                        <select
                                            id={`member-tz-${idx}`}
                                            bind:value={member.timezone}
                                            class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition cursor-pointer appearance-none"
                                            style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.2em 1.2em;"
                                        >
                                            {#each COMMON_TIMEZONES as tz}
                                                <option value={tz}>{tz}</option>
                                            {/each}
                                        </select>
                                    </div>
                                    <div
                                        class="flex items-center space-x-3 pt-1 border-t border-slate-800/80"
                                    >
                                        <div
                                            class="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow-sm mt-3"
                                        >
                                            <input
                                                id={`member-color-${idx}`}
                                                type="color"
                                                bind:value={member.displayColor}
                                                class="absolute -top-2 -left-2 w-12 h-12 cursor-pointer bg-transparent border-0"
                                            />
                                        </div>
                                        <label
                                            for={`member-color-${idx}`}
                                            class="text-xs font-semibold text-slate-300 cursor-pointer mt-3"
                                            >Event Color</label
                                        >
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>

                    <div class="flex justify-end">
                        <button
                            type="button"
                            onclick={handleSaveSettings}
                            disabled={settingsLoading}
                            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                        >
                            {#if settingsLoading}
                                <span
                                    class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
                                ></span>
                                <span>Saving...</span>
                            {:else}
                                <Check class="w-4 h-4" />
                                <span>Save Changes</span>
                            {/if}
                        </button>
                    </div>

                    <div class="mt-8 pt-6 border-t border-slate-800/80">
                        <h4
                            class="text-sm font-bold text-white flex items-center space-x-2 mb-4"
                        >
                            <UserPlus class="w-4 h-4 text-orange-400" />
                            <span>Add New Member</span>
                        </h4>
                        <div
                            class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3"
                        >
                            <input
                                type="text"
                                bind:value={newMemberName}
                                placeholder="Enter member's name..."
                                class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                            />
                            <button
                                type="button"
                                onclick={handleAddMember}
                                disabled={!newMemberName.trim()}
                                class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition disabled:opacity-50 cursor-pointer whitespace-nowrap active:scale-95"
                            >
                                Add Member
                            </button>
                        </div>
                    </div>
                </div>
            {:else if activeSettingsTab === "sync"}
                <div class="space-y-6 animate-in fade-in duration-300">
                    <div
                        class="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4"
                    >
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <div class="flex items-center space-x-3">
                                <div
                                    class="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400"
                                >
                                    <Smartphone class="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-white">
                                        iOS Shortcuts Sync
                                    </h4>
                                    <p class="text-xs text-slate-400 mt-0.5">
                                        Add events directly from your iPhone
                                    </p>
                                </div>
                            </div>
                            <a
                                href={`/help?calendar=${calState.calendarName}`}
                                target="_blank"
                                class="flex items-center justify-center space-x-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 rounded-xl border border-orange-500/20 transition cursor-pointer whitespace-nowrap"
                            >
                                <span>View Setup Guide</span>
                                <ExternalLink class="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div
                            class="pt-4 border-t border-slate-800/80 space-y-2"
                        >
                            <span
                                class="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                                >POST Endpoint URL</span
                            >
                            <div
                                class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800"
                            >
                                <span
                                    class="font-mono text-xs sm:text-sm text-orange-400 truncate mr-3"
                                    >https://shalendar.aaryandehade.com/api/sync</span
                                >
                                <button
                                    type="button"
                                    onclick={() => {
                                        navigator.clipboard.writeText(
                                            "https://shalendar.aaryandehade.com/api/sync",
                                        );
                                        copiedEndpoint = true;
                                        setTimeout(
                                            () => (copiedEndpoint = false),
                                            2000,
                                        );
                                    }}
                                    class="flex items-center space-x-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                    {#if copiedEndpoint}
                                        <Check
                                            class="w-4 h-4 text-emerald-400"
                                        />
                                        <span
                                            class="text-xs font-semibold text-emerald-400 hidden sm:inline"
                                            >Copied!</span
                                        >
                                    {:else}
                                        <Copy class="w-4 h-4" />
                                        <span
                                            class="text-xs font-semibold hidden sm:inline"
                                            >Copy</span
                                        >
                                    {/if}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            {:else if activeSettingsTab === "danger"}
                <div class="space-y-5 animate-in fade-in duration-300">
                    <div
                        class="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                        <div class="flex items-start space-x-3">
                            <div
                                class="p-2 bg-red-500/10 rounded-xl text-red-400 shrink-0"
                            >
                                <AlertTriangle class="w-5 h-5" />
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-red-400">
                                    Purge Calendar Data
                                </h4>
                                <p class="text-xs text-slate-400 mt-0.5">
                                    Delete all events for all members. This
                                    cannot be undone.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick={handleDeleteAllEvents}
                            class="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                        >
                            Delete All Events
                        </button>
                    </div>

                    <div
                        class="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                        <div class="flex items-start space-x-3">
                            <div
                                class="p-2 bg-red-600/20 rounded-xl text-red-500 shrink-0"
                            >
                                <Trash2 class="w-5 h-5" />
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-red-500">
                                    Delete Entire Calendar
                                </h4>
                                <p class="text-xs text-red-400/60 mt-0.5">
                                    Permanently delete <strong
                                        class="text-red-400"
                                        >{calState.calendarName}</strong
                                    > and all its data.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick={handleDeleteCalendar}
                            class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition cursor-pointer flex items-center justify-center space-x-1.5 whitespace-nowrap"
                        >
                            <Trash2 class="w-4 h-4" />
                            <span>Delete Calendar</span>
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
