import { addMinutes, format, parse, isBefore, isEqual, isAfter } from "date-fns";

export interface TimeSlot {
    start: string;
    end: string;
    available: boolean;
}

export const generateTimeSlots = (
    startStr: string,
    endStr: string,
    durationMinutes: number,
    intervalMinutes: number,
    lunchStartStr?: string,
    lunchEndStr?: string,
    excludeLunch: boolean = true
): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const baseDate = new Date(); // Use today as base for time parsing

    let currentToken = parse(startStr, "HH:mm", baseDate);
    const endToken = parse(endStr, "HH:mm", baseDate);

    const lunchStart = lunchStartStr ? parse(lunchStartStr, "HH:mm", baseDate) : null;
    const lunchEnd = lunchEndStr ? parse(lunchEndStr, "HH:mm", baseDate) : null;

    while (isBefore(currentToken, endToken)) {
        const slotEnd = addMinutes(currentToken, durationMinutes);

        // Check if slot exceeds end time
        if (isAfter(slotEnd, endToken)) {
            break;
        }

        let isDuringLunch = false;
        if (excludeLunch && lunchStart && lunchEnd) {
            // Check overlap: (StartA < EndB) and (EndA > StartB)
            if (isBefore(currentToken, lunchEnd) && isAfter(slotEnd, lunchStart)) {
                isDuringLunch = true;
            }
        }

        if (!isDuringLunch) {
            slots.push({
                start: format(currentToken, "HH:mm"),
                end: format(slotEnd, "HH:mm"),
                available: true
            });
        }

        // Add interval
        currentToken = addMinutes(slotEnd, intervalMinutes);
    }

    return slots;
};

export const getShiftPresets = () => {
    return [
        { id: "morning", label: "Manhã", start: "08:00", end: "12:00" },
        { id: "afternoon", label: "Tarde", start: "13:00", end: "18:00" },
        { id: "all", label: "Dia Todo", start: "09:00", end: "17:00" }
    ];
};
