import { calState } from "./state.svelte";

export const COMMON_TIMEZONES = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney"
];
export const HOUR_HEIGHT = 56;
export const MIN_START_HOUR = 8;
export const MIN_END_HOUR = 14;
export const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function getActiveTimezone(): string {
    if (calState.selectedTimezonePerspective === "UTC") return "UTC";
    if (calState.selectedTimezonePerspective === "LOCAL") {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
    const member = calState.partners.find((p: any) => p.id === calState.selectedTimezonePerspective);
    return member ? member.timezone || "UTC" : "UTC";
}

export function formatDateTimeInput(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatInTimezone(isoString: string, targetTz: string): string {
    try {
        return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: targetTz });
    } catch (e) {
        return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
}

export function getDecimalHourInTimezone(isoString: string, targetTz: string): number {
    try {
        const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: targetTz }).formatToParts(new Date(isoString));
        let hour = 0, minute = 0;
        for (const p of parts) {
            if (p.type === "hour") hour = parseInt(p.value, 10);
            if (p.type === "minute") minute = parseInt(p.value, 10);
        }
        return (hour === 24 ? 0 : hour) + minute / 60;
    } catch (e) {
        const d = new Date(isoString);
        return d.getHours() + d.getMinutes() / 60;
    }
}

export function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export function isSameDayInTz(d1: Date, isoString: string, targetTz: string): boolean {
    try {
        const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone: targetTz });
        return fmt.format(d1) === fmt.format(new Date(isoString));
    } catch (e) {
        const d2 = new Date(isoString);
        return isSameDay(d1, d2);
    }
}

export function getEventsForDay(dayDate: Date) {
    const tz = getActiveTimezone();
    return calState.events.filter((evt: any) => isSameDayInTz(dayDate, evt.startTime, tz));
}

export function getEventsForDayAndMember(dayDate: Date, memberId: string) {
    const tz = getActiveTimezone();
    return calState.events.filter((evt: any) => evt.partnerId === memberId && isSameDayInTz(dayDate, evt.startTime, tz));
}

export function getGridRangeForDay(dayDate: Date) {
    const dayEvents = getEventsForDay(dayDate);
    const tz = getActiveTimezone();
    let startHour = MIN_START_HOUR;
    let endHour = MIN_END_HOUR;

    for (const evt of dayEvents) {
        const start = getDecimalHourInTimezone(evt.startTime, tz);
        const end = getDecimalHourInTimezone(evt.endTime, tz);
        startHour = Math.min(startHour, Math.max(0, Math.floor(start) - 1));
        endHour = Math.max(endHour, Math.min(24, Math.ceil(end) + 1));
    }
    return { startHour, endHour, totalHours: endHour - startHour };
}

export function getEventTopPx(startTimeISO: string, targetTz: string, startHour: number): number {
    return (getDecimalHourInTimezone(startTimeISO, targetTz) - startHour) * HOUR_HEIGHT;
}

export function getEventHeightPx(startTimeISO: string, endTimeISO: string): number {
    const start = new Date(startTimeISO).getTime();
    const end = new Date(endTimeISO).getTime();
    return Math.max(32, Math.max(0.5, (end - start) / 3600000) * HOUR_HEIGHT);
}

// Fixed missing getHourLabel function
export function getHourLabel(hr: number, compact = false): string {
    if (hr === 0) return compact ? "12A" : "12 AM";
    if (hr === 12) return compact ? "12P" : "12 PM";
    if (hr > 12) return compact ? `${hr - 12}P` : `${hr - 12} PM`;
    return compact ? `${hr}A` : `${hr} AM`;
}

// Added missing member lookup helpers used by Agenda & Month views
export function getMemberColor(partnerId: string): string {
    return calState.partners.find((pt: any) => pt.id === partnerId)?.displayColor || "#f97316";
}

export function getMemberName(partnerId: string): string {
    return calState.partners.find((pt: any) => pt.id === partnerId)?.name || "Person";
}

// Added missing date array generators used by Week & Month views
export function getDaysInWeek(date: Date) {
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    return Array.from(
        { length: 7 },
        (_, i) => new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
    );
}

export function getDaysInMonthGrid(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
        days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
        days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    for (let i = 1; i <= 42 - days.length; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
}

export function computeEventColumns(events: any[]) {
    if (events.length === 0) return [];
    const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const result: any[] = [];
    let columns: number[] = [];
    let currentGroup: any[] = [];
    let lastEventEnd = 0;

    for (const evt of sorted) {
        const start = new Date(evt.startTime).getTime();
        const end = new Date(evt.endTime).getTime();

        if (currentGroup.length > 0 && start >= lastEventEnd) {
            const totalCols = columns.length;
            for (const item of currentGroup) result.push({ evt: item.evt, col: item.col, totalCols });
            columns = []; currentGroup = []; lastEventEnd = 0;
        }

        let placed = false;
        for (let c = 0; c < columns.length; c++) {
            if (columns[c] <= start) {
                columns[c] = end;
                currentGroup.push({ evt, col: c });
                placed = true;
                break;
            }
        }
        if (!placed) {
            currentGroup.push({ evt, col: columns.length });
            columns.push(end);
        }
        lastEventEnd = Math.max(lastEventEnd, end);
    }

    if (currentGroup.length > 0) {
        const totalCols = columns.length;
        for (const item of currentGroup) result.push({ evt: item.evt, col: item.col, totalCols });
    }
    return result;
}