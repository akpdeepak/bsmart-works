import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogProvider, useDialog } from './dialog';

// A tiny consumer that drives the promise-based API and writes the resolved value to the DOM,
// so each test can assert on what confirm/prompt/alert actually resolved with.
function Consumer({ opts = {}, kind = 'confirm' }) {
  const dialog = useDialog();
  const [result, setResult] = React.useState('pending');
  return (
    <div>
      <button type="button" onClick={async () => setResult(JSON.stringify(await dialog[kind](opts)))}>
        open
      </button>
      <output data-testid="result">{result}</output>
    </div>
  );
}

const renderWithProvider = (ui) => render(<DialogProvider>{ui}</DialogProvider>);

describe('dialog provider', () => {
  it('confirm: resolves true when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <Consumer kind="confirm" opts={{ title: 'Delete item', message: 'Sure?', confirmLabel: 'Delete', variant: 'danger' }} />
    );
    await user.click(screen.getByRole('button', { name: 'open' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Delete item');
    expect(screen.getByText('Sure?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true'));
    // dialog is gone after resolving
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirm: resolves false when cancelled', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Consumer kind="confirm" opts={{ message: 'Sure?' }} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
  });

  it('confirm: Escape resolves false', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Consumer kind="confirm" opts={{ message: 'Sure?' }} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
  });

  it('prompt: resolves the typed value on submit', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <Consumer kind="prompt" opts={{ title: 'New dashboard', label: 'Dashboard name', confirmLabel: 'Create' }} />
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    expect(screen.getByText('Dashboard name')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'Sprint health');
    expect(screen.queryByRole('dialog'), 'dialog still open after typing').toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('Sprint health'));
  });

  it('prompt: required by default — confirm is disabled until text is entered', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Consumer kind="prompt" opts={{ label: 'Name', confirmLabel: 'Save' }} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'x');
    expect(save).toBeEnabled();
  });

  it('prompt: resolves null when cancelled', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Consumer kind="prompt" opts={{ label: 'Name' }} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null'));
  });

  it('alert: shows a single dismiss button and no Cancel', async () => {
    const user = userEvent.setup();
    renderWithProvider(<Consumer kind="alert" opts={{ title: 'Heads up', message: 'Saved.' }} />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByRole('dialog');

    expect(screen.getByText('Saved.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('useDialog outside a provider falls back safely (confirm → false)', async () => {
    const user = userEvent.setup();
    render(<Consumer kind="confirm" opts={{ message: 'Sure?' }} />); // no provider
    await user.click(screen.getByRole('button', { name: 'open' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
