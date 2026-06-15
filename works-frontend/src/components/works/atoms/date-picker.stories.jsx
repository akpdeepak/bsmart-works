import { useState } from 'react';
import { DatePicker } from './date-picker';

export default {
  title: 'Works/Atoms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Date',
  },
};

export const Default = {
  args: { 'aria-label': 'Due date' },
};

export const WithValue = {
  name: 'With value',
  render: () => {
    const [date, setDate] = useState('2026-07-01');
    return (
      <div className="p-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="dp-story">
          Due date
        </label>
        <DatePicker id="dp-story" value={date} onChange={setDate} />
        {date && <p className="mt-2 text-xs text-neutral-500">Selected: {date}</p>}
      </div>
    );
  },
};

export const WithMinMax = {
  name: 'Bounded (min / max)',
  args: {
    'aria-label': 'Sprint date',
    min: '2026-06-01',
    max: '2026-12-31',
    defaultValue: '2026-07-15',
  },
};

export const Invalid = {
  args: { 'aria-label': 'Due date', invalid: true, defaultValue: '2025-01-01' },
};

export const Disabled = {
  args: { 'aria-label': 'Due date', disabled: true, defaultValue: '2026-07-01' },
};
