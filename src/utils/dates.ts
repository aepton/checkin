export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US').replace(/\//g, '-');
};

export function toISODateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Returns the 7 dates (Monday-Sunday) for the week starting on the given Monday
export function getWeekDatesFromMonday(monday: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
};

export function getMondayWithOffset(weekOffset: number): Date {
    const today = new Date();
    today.setHours(12, 0, 0, 0);       // Set time to noon to avoid timezone issues
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Either it's:
    // the day before Monday, and we're almost a whole week away from the current week's Monday
    // or it's Monday, and we're 0 days away from Monday
    // or it's Tuesday through Saturday, in which case we're currentDay - 1 days away from Monday
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    
    // Apply week offset
    monday.setDate(monday.getDate() + (weekOffset * 7));

    return monday;
};