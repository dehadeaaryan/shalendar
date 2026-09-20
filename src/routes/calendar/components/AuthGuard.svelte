<script lang="ts">
    import { calState } from "../state.svelte.ts";
    import { invalidateAll } from "$app/navigation";
    import { Lock, ShieldAlert, Eye, EyeOff } from "lucide-svelte";

    let passwordInput = $state("");
    let showLockPassword = $state(false);
    let authError = $state("");
    let authLoading = $state(false);

    async function handleUnlock() {
        authError = "";
        if (!passwordInput) return;
        authLoading = true;
        try {
            const res = await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "login",
                    name: calState.calendarName,
                    password: passwordInput,
                }),
            });
            const resData = await res.json();
            if (!res.ok) authError = resData.error || "Incorrect password";
            else {
                passwordInput = "";
                await invalidateAll(); // Page will reload and update data.isAuthenticated
            }
        } catch (err: any) {
            authError = err.message || "Error authenticating";
        } finally {
            authLoading = false;
        }
    }
</script>

<div
    class="max-w-md mx-auto my-12 sm:my-20 bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 border border-slate-800/80 text-center shadow-2xl space-y-6"
>
    <div
        class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400 shadow-inner"
    >
        <Lock class="w-8 h-8" />
    </div>
    <div>
        <h2 class="text-2xl font-extrabold text-white tracking-tight">
            Protected Calendar
        </h2>
        <p class="text-slate-400 text-sm mt-1.5">
            Enter password to unlock <span
                class="text-orange-400 font-semibold capitalize"
                >{calState.calendarName}</span
            >.
        </p>
    </div>

    <form
        onsubmit={(e) => {
            e.preventDefault();
            handleUnlock();
        }}
        class="space-y-4"
    >
        {#if authError}
            <div
                class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center space-x-2"
            >
                <ShieldAlert class="w-4 h-4 shrink-0" />
                <span>{authError}</span>
            </div>
        {/if}

        <div class="relative">
            <input
                type={showLockPassword ? "text" : "password"}
                bind:value={passwordInput}
                placeholder="Enter calendar password"
                required
                class="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-center text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition pr-10"
            />
            <button
                type="button"
                onclick={() => (showLockPassword = !showLockPassword)}
                class="absolute right-3 top-3.5 text-slate-400 hover:text-white p-1 rounded-lg transition"
                aria-label="Toggle password visibility"
            >
                {#if showLockPassword}
                    <EyeOff class="w-4 h-4" />
                {:else}
                    <Eye class="w-4 h-4" />
                {/if}
            </button>
        </div>

        <button
            type="submit"
            disabled={authLoading}
            class="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
            {authLoading ? "Verifying..." : "Unlock Calendar"}
        </button>
    </form>
</div>
