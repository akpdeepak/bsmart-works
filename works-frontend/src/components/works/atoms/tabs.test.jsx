import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabList, Tab, TabPanel } from './tabs';

function BasicTabs({ defaultValue = 'a', onValueChange } = {}) {
  return (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabList aria-label="Test tabs">
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
        <Tab value="c" disabled>Gamma</Tab>
      </TabList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the default tab panel', () => {
    render(<BasicTabs defaultValue="a" />);
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).toBeNull();
  });

  it('switches panel on tab click', async () => {
    const user = userEvent.setup();
    render(<BasicTabs />);
    await user.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    expect(screen.queryByText('Panel A')).toBeNull();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<BasicTabs defaultValue="b" />);
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false');
  });

  it('active tab has tabIndex=0; others have tabIndex=-1', () => {
    render(<BasicTabs defaultValue="a" />);
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabIndex', '-1');
  });

  it('disabled tab cannot be clicked', async () => {
    const user = userEvent.setup();
    render(<BasicTabs />);
    await user.click(screen.getByRole('tab', { name: 'Gamma' }));
    expect(screen.queryByText('Panel C')).toBeNull();
  });

  it('tab has aria-controls pointing to panel id', () => {
    render(<BasicTabs defaultValue="a" />);
    const tab = screen.getByRole('tab', { name: 'Alpha' });
    const panelId = tab.getAttribute('aria-controls');
    expect(document.getElementById(panelId)).toHaveTextContent('Panel A');
  });

  it('panel has aria-labelledby pointing to its tab', () => {
    render(<BasicTabs defaultValue="a" />);
    const panel = screen.getByRole('tabpanel');
    const tabId = panel.getAttribute('aria-labelledby');
    expect(document.getElementById(tabId)).toHaveTextContent('Alpha');
  });

  it('tablist has role=tablist', () => {
    render(<BasicTabs />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('tabpanel is focusable', () => {
    render(<BasicTabs defaultValue="a" />);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabIndex', '0');
  });

  it('calls onValueChange on tab click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<BasicTabs onValueChange={handler} />);
    await user.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(handler).toHaveBeenCalledWith('b');
  });

  it('ArrowRight moves focus to next tab', () => {
    render(<BasicTabs defaultValue="a" />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    alpha.focus();
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(document.activeElement).toHaveTextContent('Beta');
  });

  it('ArrowLeft wraps around to last enabled tab', () => {
    render(<BasicTabs defaultValue="a" />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    alpha.focus();
    fireEvent.keyDown(alpha, { key: 'ArrowLeft' });
    expect(document.activeElement).toHaveTextContent('Beta');
  });

  it('Home key moves focus to first tab', () => {
    render(<BasicTabs defaultValue="b" />);
    const beta = screen.getByRole('tab', { name: 'Beta' });
    beta.focus();
    fireEvent.keyDown(beta, { key: 'Home' });
    expect(document.activeElement).toHaveTextContent('Alpha');
  });

  it('End key moves focus to last enabled tab', () => {
    render(<BasicTabs defaultValue="a" />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    alpha.focus();
    fireEvent.keyDown(alpha, { key: 'End' });
    expect(document.activeElement).toHaveTextContent('Beta');
  });
});
