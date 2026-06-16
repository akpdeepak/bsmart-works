import { useState } from 'react';
import { DensityToggle } from './density-toggle';

export default {
  title: 'Works/Atoms/DensityToggle',
  component: DensityToggle,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Default = {
  name: 'Default (comfortable)',
  render: () => {
    const [density, setDensity] = useState('comfortable');
    return <DensityToggle density={density} setDensity={setDensity} />;
  },
};

export const Compact = {
  name: 'Compact active',
  render: () => {
    const [density, setDensity] = useState('compact');
    return <DensityToggle density={density} setDensity={setDensity} />;
  },
};

export const Spacious = {
  name: 'Spacious active',
  render: () => {
    const [density, setDensity] = useState('spacious');
    return <DensityToggle density={density} setDensity={setDensity} />;
  },
};
