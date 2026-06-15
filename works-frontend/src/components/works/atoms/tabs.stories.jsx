import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from './tabs';

export default {
  title: 'Works/Atoms/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
  },
};

export const Default = {
  name: 'Uncontrolled (defaultValue)',
  render: () => (
    <Tabs defaultValue="overview">
      <TabList aria-label="View tabs">
        <Tab value="overview">Overview</Tab>
        <Tab value="activity">Activity</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      <TabPanel value="overview">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Overview content.</p>
      </TabPanel>
      <TabPanel value="activity">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Activity feed.</p>
      </TabPanel>
      <TabPanel value="settings">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Settings panel.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const Controlled = {
  name: 'Controlled (value/onValueChange)',
  render: () => {
    const [tab, setTab] = useState('overview');
    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">Active tab: <strong>{tab}</strong></p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Controlled tabs">
            <Tab value="overview">Overview</Tab>
            <Tab value="activity">Activity</Tab>
          </TabList>
          <TabPanel value="overview">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Overview content.</p>
          </TabPanel>
          <TabPanel value="activity">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Activity feed.</p>
          </TabPanel>
        </Tabs>
      </div>
    );
  },
};

export const WithDisabledTab = {
  name: 'With a disabled tab',
  render: () => (
    <Tabs defaultValue="active">
      <TabList aria-label="Status tabs">
        <Tab value="active">Active</Tab>
        <Tab value="archived" disabled>Archived (disabled)</Tab>
        <Tab value="all">All</Tab>
      </TabList>
      <TabPanel value="active">Active items.</TabPanel>
      <TabPanel value="all">All items.</TabPanel>
    </Tabs>
  ),
};

export const ManyTabs = {
  name: 'Many tabs (scrollable container)',
  render: () => (
    <Tabs defaultValue="tab1">
      <div className="overflow-x-auto">
        <TabList aria-label="Sprint cockpit tabs">
          {['Overview', 'Planning', 'Board', 'Standup', 'Ceremonies', 'Impediments', 'Patterns', 'Retro'].map((label, i) => (
            <Tab key={label} value={`tab${i + 1}`}>{label}</Tab>
          ))}
        </TabList>
      </div>
      {['Overview', 'Planning', 'Board', 'Standup', 'Ceremonies', 'Impediments', 'Patterns', 'Retro'].map((label, i) => (
        <TabPanel key={label} value={`tab${i + 1}`}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{label} content.</p>
        </TabPanel>
      ))}
    </Tabs>
  ),
};
