import { useState } from 'react';
import { Slider } from './slider';

export default {
  title: 'Works/Atoms/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: {
    label: 'Volume',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
  },
};

export const Default = {
  args: { label: 'Volume', defaultValue: 50 },
};

export const WithValueDisplay = {
  name: 'With value display',
  render: () => {
    const [val, setVal] = useState(60);
    return (
      <div className="p-4 max-w-xs">
        <Slider label="Brightness" min={0} max={100} value={val} showValue onChange={setVal} />
      </div>
    );
  },
};

export const SteppedSlider = {
  name: 'Stepped (step=10)',
  args: { label: 'Speed', min: 0, max: 100, step: 10, defaultValue: 40, showValue: true },
};

export const Disabled = {
  args: { label: 'Volume', defaultValue: 30, disabled: true },
};

export const CustomRange = {
  name: 'Custom range',
  args: { label: 'Temperature (°C)', min: -20, max: 50, step: 5, defaultValue: 20, showValue: true },
};
