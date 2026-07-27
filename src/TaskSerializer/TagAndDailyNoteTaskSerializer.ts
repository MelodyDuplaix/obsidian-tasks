import type { Moment } from 'moment';
import { TaskLayoutComponent } from '../Layout/TaskLayoutOptions';
import { Priority } from '../Task/Priority';
import type { Task } from '../Task/Task';
import type { TaskDetails } from '.';
import { DefaultTaskSerializer, type DefaultTaskSerializerSymbols, type ParsingState } from './DefaultTaskSerializer';
import { getSettings } from '../Config/Settings';

/**
 * Symbol map for Tag and Daily Note task format.
 * - Priorities: #priority/highest, #priority/high, #priority/medium, #priority/low, #priority/lowest
 * - Due dates: [[<daily-note-format>]] (e.g., [[27-07-2026 lu]])
 */
export const TAG_AND_DAILY_NOTE_SYMBOLS: DefaultTaskSerializerSymbols = {
    /* FORK CUSTOMIZATION: Priority tags */
    prioritySymbols: {
        Highest: '#priority/highest',
        High: '#priority/high',
        Medium: '#priority/medium',
        Low: '#priority/low',
        Lowest: '#priority/lowest',
        None: '',
    },
    startDateSymbol: '🛫',
    createdDateSymbol: '➕',
    scheduledDateSymbol: '⏳',
    dueDateSymbol: '', // Due dates use [[date]] format
    doneDateSymbol: '✅',
    cancelledDateSymbol: '❌',
    recurrenceSymbol: '🔁',
    onCompletionSymbol: '🏁',
    dependsOnSymbol: '⛔',
    idSymbol: '🆔',
    TaskFormatRegularExpressions: {
        // Match priority tag at end of line (or before trailing components)
        priorityRegex: /#priority\/(highest|high|medium|low|lowest)$/i,
        startDateRegex: /🛫 *(\d{4}-\d{2}-\d{2})$/,
        createdDateRegex: /➕ *(\d{4}-\d{2}-\d{2})$/,
        scheduledDateRegex: /(?:⏳|⌛) *(\d{4}-\d{2}-\d{2})$/,
        // Match due date as a wikilink at end of components, e.g. [[27-07-2026 lu]]
        dueDateRegex: /\[\[([^\]]+)\]\]$/,
        doneDateRegex: /✅ *(\d{4}-\d{2}-\d{2})$/,
        cancelledDateRegex: /❌ *(\d{4}-\d{2}-\d{2})$/,
        recurrenceRegex: /🔁 *([a-zA-Z0-9, !]+)$/,
        onCompletionRegex: /🏁 *([a-zA-Z]+)$/,
        dependsOnRegex: /⛔ *([a-zA-Z0-9-_]+(?: *, *[a-zA-Z0-9-_]+ *)*)$/,
        idRegex: /🆔 *([a-zA-Z0-9-_]+)$/,
    },
} as const;

export function parseDailyNoteDate(dateStr: string): Moment | null {
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    const userFormat = getSettings().dailyNoteDateFormat || 'DD-MM-YYYY ddd';
    const formatsToTry = [
        userFormat,
        'DD-MM-YYYY dd',
        'DD-MM-YYYY ddd',
        'DD-MM-YYYY dddd',
        'YYYY-MM-DD dd',
        'YYYY-MM-DD ddd',
        'YYYY-MM-DD dddd',
        'DD-MM-YYYY',
        'YYYY-MM-DD',
        'DD/MM/YYYY',
        'YYYY/MM/DD',
    ];

    // 1. Try strict parsing with fr and en locales
    for (const loc of ['fr', 'en']) {
        for (const fmt of formatsToTry) {
            const m = window.moment(trimmed, fmt, loc, true);
            if (m.isValid()) return m;
        }
    }

    // 2. Try non-strict parsing with formatsToTry
    for (const fmt of formatsToTry) {
        const m = window.moment(trimmed, fmt, false);
        if (m.isValid()) return m;
    }

    // 3. Try extracting numeric date string (e.g. "27-07-2026" from "27-07-2026 lu")
    const dateMatch = trimmed.match(/(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})/);
    if (dateMatch) {
        const rawDate = dateMatch[1];
        for (const fmt of ['DD-MM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY/MM/DD', 'DD.MM.YYYY', 'YYYY.MM.DD']) {
            const m = window.moment(rawDate, fmt, true);
            if (m.isValid()) return m;
        }
    }

    // 4. Fallback moment parse
    const fallback = window.moment(trimmed);
    return fallback.isValid() ? fallback : null;
}

export class TagAndDailyNoteTaskSerializer extends DefaultTaskSerializer {
    constructor() {
        super(TAG_AND_DAILY_NOTE_SYMBOLS);
    }

    protected parsePriority(p: string): Priority {
        const lower = p.toLowerCase();
        if (lower.includes('highest')) return Priority.Highest;
        if (lower.includes('high')) return Priority.High;
        if (lower.includes('medium')) return Priority.Medium;
        if (lower.includes('low')) return Priority.Low;
        if (lower.includes('lowest')) return Priority.Lowest;
        return Priority.None;
    }

    protected extractDateField(state: ParsingState, regex: RegExp, setter: (date: Moment) => void): void {
        if (regex === TAG_AND_DAILY_NOTE_SYMBOLS.TaskFormatRegularExpressions.dueDateRegex) {
            // First check if the line matches the due date regex
            const match = state.line.match(regex);
            if (match !== null) {
                const dateStr = match[1].trim();
                const parsed = parseDailyNoteDate(dateStr);
                if (parsed) {
                    setter(parsed);
                    state.line = state.line.replace(regex, '').trim();
                    state.matched = true;
                }
            }
            return;
        }

        super.extractDateField(state, regex, setter);
    }

    public componentToString(task: Task, shortMode: boolean, component: TaskLayoutComponent): string {
        if (component === TaskLayoutComponent.DueDate) {
            if (!task.dueDate) return '';
            const format = getSettings().dailyNoteDateFormat || 'DD-MM-YYYY ddd';
            return ` [[${task.dueDate.format(format)}]]`;
        }

        if (component === TaskLayoutComponent.Priority) {
            switch (task.priority) {
                case Priority.Highest:
                    return ' #priority/highest';
                case Priority.High:
                    return ' #priority/high';
                case Priority.Medium:
                    return ' #priority/medium';
                case Priority.Low:
                    return ' #priority/low';
                case Priority.Lowest:
                    return ' #priority/lowest';
                default:
                    return '';
            }
        }

        return super.componentToString(task, shortMode, component);
    }

    public deserialize(line: string): TaskDetails {
        let extractedPriority: Priority = Priority.None;
        let cleanLine = line;

        const priorityMatch = line.match(/(?:^|\s)(#priority\/(highest|high|medium|low|lowest))(?:\s|$)/i);
        if (priorityMatch !== null) {
            extractedPriority = this.parsePriority(priorityMatch[1]);
            cleanLine = line.replace(priorityMatch[1], '').replace(/  +/g, ' ').trim();
        }

        const details = super.deserialize(cleanLine);

        if (extractedPriority !== Priority.None) {
            details.priority = extractedPriority;
        }

        // Remove any #priority/* tags from the parsed tags list so they aren't duplicated as general tags
        if (details.tags && details.tags.length > 0) {
            details.tags = details.tags.filter((tag) => !tag.toLowerCase().startsWith('#priority/'));
        }

        return details;
    }
}
