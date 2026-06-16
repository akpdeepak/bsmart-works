import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncBoundary } from './async-boundary';

describe('AsyncBoundary', () => {
  describe('loading state', () => {
    it('renders the skeleton node when loading=true', () => {
      render(
        <AsyncBoundary loading skeleton={<div data-testid="skel" />}>
          <p>content</p>
        </AsyncBoundary>
      );
      expect(screen.getByTestId('skel')).toBeInTheDocument();
      expect(screen.queryByText('content')).not.toBeInTheDocument();
    });

    it('marks the container aria-busy="true" when loading', () => {
      render(
        <AsyncBoundary loading skeleton={<span />} label="Loading items">
          <p>content</p>
        </AsyncBoundary>
      );
      const container = screen.getByRole('generic', { name: 'Loading items' });
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('uses the caller-supplied aria label', () => {
      render(
        <AsyncBoundary loading skeleton={<span />} label="Loading work items">
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByRole('generic', { name: 'Loading work items' })).toBeInTheDocument();
    });

    it('takes precedence over error and empty when all three are true', () => {
      render(
        <AsyncBoundary loading error="oops" empty skeleton={<div data-testid="skel" />}>
          <p>content</p>
        </AsyncBoundary>
      );
      expect(screen.getByTestId('skel')).toBeInTheDocument();
      expect(screen.queryByText('oops')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders EmptyState with the error string', () => {
      render(
        <AsyncBoundary error="Server is down" skeleton={<span />}>
          <p>content</p>
        </AsyncBoundary>
      );
      expect(screen.getByText('Server is down')).toBeInTheDocument();
      expect(screen.queryByText('content')).not.toBeInTheDocument();
    });

    it('renders error title', () => {
      render(
        <AsyncBoundary error="timeout" skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText("Couldn't load this view")).toBeInTheDocument();
    });

    it('uses a custom errorTitle', () => {
      render(
        <AsyncBoundary error="404" errorTitle="Sprint not found" skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('Sprint not found')).toBeInTheDocument();
    });

    it('maps an Error object message to the subtitle', () => {
      const err = new Error('Network failure');
      render(
        <AsyncBoundary error={err} skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });

    it('shows fallback text for an error without a message', () => {
      render(
        <AsyncBoundary error={{}} skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
    });

    it('does NOT render a retry button when onRetry is absent', () => {
      render(
        <AsyncBoundary error="oops" skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('renders and calls the retry button when onRetry is provided', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(
        <AsyncBoundary error="oops" onRetry={onRetry} skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      const btn = screen.getByRole('button', { name: /try again/i });
      await user.click(btn);
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('takes precedence over empty when both error and empty are truthy', () => {
      render(
        <AsyncBoundary error="db error" empty skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('db error')).toBeInTheDocument();
      expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders EmptyState with caller-supplied title when empty=true', () => {
      render(
        <AsyncBoundary empty emptyTitle="No sprints yet" skeleton={<span />}>
          <p>content</p>
        </AsyncBoundary>
      );
      expect(screen.getByText('No sprints yet')).toBeInTheDocument();
      expect(screen.queryByText('content')).not.toBeInTheDocument();
    });

    it('renders the default emptyTitle when none is supplied', () => {
      render(
        <AsyncBoundary empty skeleton={<span />}>
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });

    it('renders emptySubtitle and emptyAction', () => {
      render(
        <AsyncBoundary
          empty
          emptyTitle="No items"
          emptySubtitle="Create your first item to get started."
          emptyAction={<button>Create item</button>}
          skeleton={<span />}
        >
          <p />
        </AsyncBoundary>
      );
      expect(screen.getByText('Create your first item to get started.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
    });
  });

  describe('resolved state (default)', () => {
    it('renders children when loading=false, error=null, empty=false', () => {
      render(
        <AsyncBoundary skeleton={<span />}>
          <p>My content</p>
        </AsyncBoundary>
      );
      expect(screen.getByText('My content')).toBeInTheDocument();
    });

    it('renders children when all flags are false/null', () => {
      render(
        <AsyncBoundary loading={false} error={null} empty={false} skeleton={<span />}>
          <ul>
            <li>Item A</li>
            <li>Item B</li>
          </ul>
        </AsyncBoundary>
      );
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
    });
  });
});
