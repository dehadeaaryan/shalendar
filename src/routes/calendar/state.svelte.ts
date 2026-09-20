export const calState = $state({
    currentDate: new Date(),
    viewMode: "today" as "month" | "week" | "today" | "agenda" | "match",
    currentTime: new Date(),
    selectedTimezonePerspective: "LOCAL",

    showAddModal: false,
    showSettingsModal: false,
    selectedEvent: null as any,

    events: [] as any[],
    partners: [] as any[],
    calendarName: "",
    isAuthenticated: false
});

if (typeof window !== "undefined") {
    setInterval(() => {
        calState.currentTime = new Date();
    }, 60000);
}