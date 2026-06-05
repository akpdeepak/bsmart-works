import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

function Boom() {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders a calm fallback when a child throws', () => {
    // React logs the caught error; silence it for this expected-throw test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    // no raw stack/message leaked to the user
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
