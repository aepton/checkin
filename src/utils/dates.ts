export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US').replace(/\//g, '-');
};

export function getMondayWithOffset(weekOffset: number): Date {
    const today = new Date();
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