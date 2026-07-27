/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { TagAndDailyNoteTaskSerializer } from '../../src/TaskSerializer/TagAndDailyNoteTaskSerializer';
import { Priority } from '../../src/Task/Priority';
import { TaskBuilder } from '../TestingTools/TaskBuilder';
import { updateSettings } from '../../src/Config/Settings';

window.moment = moment;

describe('TagAndDailyNoteTaskSerializer', () => {
    const serializer = new TagAndDailyNoteTaskSerializer();

    beforeEach(() => {
        window.moment.locale('fr');
        updateSettings({
            dailyNoteDateFormat: 'DD-MM-YYYY ddd',
        });
    });

    afterEach(() => {
        window.moment.locale('en');
    });

    describe('deserialize', () => {
        it('should parse tag priority #priority/low', () => {
            const taskDetails = serializer.deserialize('buy milk #priority/low');
            expect(taskDetails.description).toEqual('buy milk');
            expect(taskDetails.priority).toEqual(Priority.Low);
        });

        it('should parse tag priority #priority/highest', () => {
            const taskDetails = serializer.deserialize('urgent task #priority/highest');
            expect(taskDetails.description).toEqual('urgent task');
            expect(taskDetails.priority).toEqual(Priority.Highest);
        });

        it('should parse daily note link as due date', () => {
            const taskDetails = serializer.deserialize('buy milk [[27-07-2026 lu]]');
            expect(taskDetails.description).toEqual('buy milk');
            expect(taskDetails.dueDate).not.toBeNull();
            expect(taskDetails.dueDate?.format('YYYY-MM-DD')).toEqual('2026-07-27');
        });

        it('should parse both priority tag and daily note due date link', () => {
            const taskDetails = serializer.deserialize('tache #priority/low [[27-07-2026 lu]]');
            expect(taskDetails.description).toEqual('tache');
            expect(taskDetails.priority).toEqual(Priority.Low);
            expect(taskDetails.dueDate?.format('YYYY-MM-DD')).toEqual('2026-07-27');
        });
    });

    describe('serialize', () => {
        it('should serialize priority and due date into tag and daily note link format', () => {
            const task = new TaskBuilder()
                .description('tache')
                .priority(Priority.Low)
                .dueDate('2026-07-27')
                .build();

            const line = serializer.serialize(task);
            expect(line).toMatch(/^tache #priority\/low \[\[27-07-2026 (lun\.|Mon|lu)\]\]$/);
        });
    });
});
