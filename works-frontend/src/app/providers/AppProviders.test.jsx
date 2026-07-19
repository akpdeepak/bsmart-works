import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './AppProviders';

describe('AppProviders', () => {
  it('composes the global providers around application content', () => {
    render(
      <AppProviders>
        <p>Workspace content</p>
      </AppProviders>,
    );

    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });
});
