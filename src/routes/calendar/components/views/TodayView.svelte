<script lang="ts">
    import { calState } from "../../state.svelte";
    import DailyGrid from "./DailyGrid.svelte";
    import { Sun } from "lucide-svelte";
</script>

<div
    class="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 p-4 space-y-4 shadow-xl"
>
    <div
        class="flex items-center justify-between border-b border-slate-800/80 pb-3"
    >
        <div class="flex items-center space-x-3">
            <div
                class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-yellow-400 shrink-0"
            >
                <Sun class="w-5 h-5" />
            </div>
            <div>
                <h3 class="text-base font-bold text-white">
                    Daily Schedule Grid
                </h3>
                <p class="text-xs text-slate-400 font-medium">
                    Click any event to edit title or start/end times
                </p>
            </div>
        </div>
    </div>

    <DailyGrid dayDate={calState.currentDate} />
</div>
