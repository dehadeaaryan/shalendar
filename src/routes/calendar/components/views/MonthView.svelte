<script lang="ts">
    import { calState } from "../../state.svelte";
    import { isSameDay, getEventsForDay } from "../../utils";

    function getDaysInMonthGrid(year: number, month: number) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        for (let i = firstDay.getDay() - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
            });
        }
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true,
            });
        }
        for (let i = 1; i <= 42 - days.length; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false,
            });
        }
        return days;
    }

    function getMemberColor(partnerId: string) {
        return (
            calState.partners.find((pt: any) => pt.id === partnerId)
                ?.displayColor || "#f97316"
        );
    }

    let monthDays = $derived(
        getDaysInMonthGrid(
            calState.currentDate.getFullYear(),
            calState.currentDate.getMonth(),
        ),
    );
</script>

<div
    class="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl"
>
    <div
        class="grid grid-cols-7 border-b border-slate-800/80 bg-slate-900/80 text-center py-3 text-xs font-bold uppercase tracking-wider text-slate-400"
    >
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
    </div>
    <div
        class="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/40"
    >
        {#each monthDays as day}
            <div
                class={`min-h-[110px] p-2 flex flex-col transition-all ${isSameDay(day.date, new Date()) ? "bg-orange-500/10 border border-orange-500/40 ring-1 ring-orange-500/20" : day.isCurrentMonth ? "bg-slate-900/20" : "bg-slate-950/90 text-slate-600"}`}
            >
                <div class="mb-1.5 flex justify-between items-center">
                    <span
                        class={`text-xs font-bold w-6 h-6 rounded-full flex justify-center items-center ${isSameDay(day.date, new Date()) ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : day.isCurrentMonth ? "text-slate-300" : "text-slate-600"}`}
                    >
                        {day.date.getDate()}
                    </span>
                </div>
                <div class="space-y-1 overflow-y-auto max-h-[85px]">
                    {#each getEventsForDay(day.date) as evt}
                        <button
                            type="button"
                            onclick={() => (calState.selectedEvent = evt)}
                            class="w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate flex items-center space-x-1.5 transition hover:brightness-125 cursor-pointer"
                            style="background-color: {getMemberColor(
                                evt.partnerId,
                            )}22; border-left: 3px solid {getMemberColor(
                                evt.partnerId,
                            )}"
                        >
                            <span class="truncate text-slate-200"
                                >{evt.title}</span
                            >
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
