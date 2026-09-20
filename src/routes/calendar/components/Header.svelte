<script lang="ts">
    import { calState } from "../state.svelte";
    import { getActiveTimezone } from "../utils";
    import { CalendarIcon, Globe, Plus, Settings, Lock } from "lucide-svelte";
    import { invalidateAll } from "$app/navigation";

    async function handleLockCalendar() {
        try {
            await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "logout",
                    calendarName: calState.calendarName,
                }),
            });
            await invalidateAll();
        } catch (e) {
            console.error(e);
        }
    }

    let activeTimezone = $derived(getActiveTimezone());
</script>

<header
    class="border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-xl sticky top-0 z-40 transition-all"
>
    <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0"
    >
        <div class="flex items-center justify-between w-full sm:w-auto">
            <div class="flex items-center space-x-3">
                <a
                    href="/"
                    class="flex items-center space-x-2.5 group focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded-xl"
                >
                    <div
                        class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-all duration-300"
                    >
                        <CalendarIcon
                            class="w-5 h-5 text-slate-950 font-bold"
                        />
                    </div>
                </a>
                <div class="flex items-center space-x-2">
                    <h1
                        class="text-base sm:text-lg font-bold text-white tracking-tight capitalize truncate max-w-[150px] sm:max-w-none"
                    >
                        {calState.calendarName}
                    </h1>
                    <span
                        class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold tracking-wide"
                        >Shared</span
                    >
                </div>
            </div>
        </div>

        {#if calState.isAuthenticated}
            <div
                class="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-3 text-xs w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60"
            >
                <div
                    class="flex items-center w-full sm:w-auto justify-center space-x-2 bg-slate-900/90 px-3 py-2 sm:py-1.5 rounded-xl border border-slate-800/80 shadow-inner"
                >
                    <Globe class="w-4 h-4 text-orange-400 shrink-0" />
                    <span
                        class="hidden md:inline text-slate-400 font-medium shrink-0"
                        >View in:</span
                    >
                    <select
                        bind:value={calState.selectedTimezonePerspective}
                        class="bg-transparent text-white font-semibold focus:outline-none cursor-pointer w-full text-center sm:text-left text-sm sm:text-xs"
                    >
                        <option value="LOCAL" class="bg-slate-900 text-white"
                            >Local ({activeTimezone.split("/")[1] ||
                                activeTimezone})</option
                        >
                        {#each calState.partners as member}
                            <option
                                value={member.id}
                                class="bg-slate-900 text-white"
                                >{member.name} ({member.timezone.split(
                                    "/",
                                )[1] || member.timezone})</option
                            >
                        {/each}
                        <option value="UTC" class="bg-slate-900 text-white"
                            >UTC</option
                        >
                    </select>
                </div>

                <div
                    class="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                >
                    <button
                        type="button"
                        onclick={() => (calState.showAddModal = true)}
                        class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm sm:text-xs font-semibold px-4 py-2 sm:py-1.5 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus class="w-4 h-4 shrink-0" />
                        <span class="hidden md:block">Add Event</span>
                    </button>

                    <button
                        type="button"
                        onclick={() => (calState.showSettingsModal = true)}
                        class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                        title="Calendar Settings"
                    >
                        <Settings class="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>

                    <button
                        type="button"
                        onclick={handleLockCalendar}
                        class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                        title="Lock Calendar"
                    >
                        <Lock class="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                        <span class="text-xs font-semibold">Lock</span>
                    </button>
                </div>
            </div>
        {/if}
    </div>
</header>
