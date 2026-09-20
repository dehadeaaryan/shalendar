<script lang="ts">
    import { calState } from "../state.svelte";
    import { isSameDay, monthNames } from "../utils";
    import {
        ChevronLeft,
        ChevronRight,
        Sun,
        Columns4,
        CalendarDays,
        List,
        Sparkles,
    } from "lucide-svelte";

    function getDaysInWeek(date: Date) {
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - date.getDay());
        return Array.from(
            { length: 7 },
            (_, i) =>
                new Date(
                    sunday.getFullYear(),
                    sunday.getMonth(),
                    sunday.getDate() + i,
                ),
        );
    }

    let weekDays = $derived(getDaysInWeek(calState.currentDate));

    function prevPeriod() {
        calState.currentDate =
            calState.viewMode === "month"
                ? new Date(
                      calState.currentDate.getFullYear(),
                      calState.currentDate.getMonth() - 1,
                      1,
                  )
                : calState.viewMode === "week"
                  ? new Date(calState.currentDate.getTime() - 7 * 86400000)
                  : new Date(calState.currentDate.getTime() - 86400000);
    }

    function nextPeriod() {
        calState.currentDate =
            calState.viewMode === "month"
                ? new Date(
                      calState.currentDate.getFullYear(),
                      calState.currentDate.getMonth() + 1,
                      1,
                  )
                : calState.viewMode === "week"
                  ? new Date(calState.currentDate.getTime() + 7 * 86400000)
                  : new Date(calState.currentDate.getTime() + 86400000);
    }
</script>

<div
    class="bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-800/80 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2 shadow-lg"
>
    <div
        class="flex items-center justify-between sm:justify-start gap-x-1 sm:gap-x-2 w-full sm:w-auto"
    >
        <h2
            class="text-base sm:text-xl font-bold text-white tracking-tight truncate"
        >
            {#if calState.viewMode === "today" || calState.viewMode === "match"}
                {isSameDay(calState.currentDate, new Date())
                    ? `Today, ${calState.currentDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
                    : calState.currentDate.toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })}
            {:else if calState.viewMode === "week"}
                {weekDays[0].toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                })} – {weekDays[6].toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}
            {:else}
                {monthNames[calState.currentDate.getMonth()]}
                {calState.currentDate.getFullYear()}
            {/if}
        </h2>

        <div
            class="flex items-center gap-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0"
        >
            <button
                type="button"
                onclick={prevPeriod}
                class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-95"
                ><ChevronLeft class="w-4 h-4" /></button
            >
            <button
                type="button"
                onclick={() => (calState.currentDate = new Date())}
                class={`px-3 py-1 rounded-lg text-xs font-semibold transition ${isSameDay(calState.currentDate, new Date()) ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "hover:bg-slate-800 text-slate-300"}`}
                >Today</button
            >
            <button
                type="button"
                onclick={nextPeriod}
                class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-95"
                ><ChevronRight class="w-4 h-4" /></button
            >
        </div>
    </div>

    <div
        class="grid grid-cols-5 sm:flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs w-full sm:w-auto"
    >
        <button
            onclick={() => (calState.viewMode = "today")}
            class={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${calState.viewMode === "today" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "text-slate-400 hover:text-slate-200"}`}
            ><Sun class="w-3.5 h-3.5 shrink-0" /><span class={`hidden md:block`}
                >Today</span
            ></button
        >
        <button
            onclick={() => (calState.viewMode = "week")}
            class={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${calState.viewMode === "week" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"}`}
            ><Columns4 class="w-3.5 h-3.5 shrink-0" /><span
                class={`hidden md:block`}>Week</span
            ></button
        >
        <button
            onclick={() => (calState.viewMode = "month")}
            class={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${calState.viewMode === "month" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-slate-400 hover:text-slate-200"}`}
            ><CalendarDays class="w-3.5 h-3.5 shrink-0" /><span
                class={`hidden md:block`}>Month</span
            ></button
        >
        <button
            onclick={() => (calState.viewMode = "agenda")}
            class={`py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${calState.viewMode === "agenda" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-slate-400 hover:text-slate-200"}`}
            ><List class="w-3.5 h-3.5 shrink-0" /><span
                class={`hidden md:block`}>Agenda</span
            ></button
        >
        <button
            onclick={() => (calState.viewMode = "match")}
            class={`py-1.5 px-2 sm:px-3 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${calState.viewMode === "match" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"}`}
            ><Sparkles class="w-3.5 h-3.5 shrink-0" /><span
                class="hidden md:block">Free</span
            ></button
        >
    </div>
</div>
