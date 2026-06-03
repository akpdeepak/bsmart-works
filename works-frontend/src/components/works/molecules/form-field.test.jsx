import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field';
import { Input } from '@/components/works/atoms/input';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField id="name" label="Full name">
        <Input id="name" />
      </FormField>
    );
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders required asterisk', () => {
    render(
      <FormField id="name" label="Name" required>
        <Input id="name" />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows help text when no error', () => {
    render(
      <FormField id="name" label="Name" helpText="Max 200 chars">
        <Input id="name" />
      </FormField>
    );
    expect(screen.getByText('Max 200 chars')).toBeInTheDocument();
  });

  it('shows error instead of help text when error present', () => {
    render(
      <FormField id="name" label="Name" helpText="Max 200 chars" error="Name is required">
        <Input id="name" />
      </FormField>
    );
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.queryByText('Max 200 chars')).not.toBeInTheDocument();
  });

  it('wires aria-describedby between description and input', () => {
    render(
      <FormField id="email" label="Email" error="Invalid email">
        <Input id="email" />
      </FormField>
    );
    const input = screen.getByRole('textbox');
    const descId = input.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId)).toHaveTextContent('Invalid email');
  });

  it('sets aria-invalid on child input when error present', () => {
    render(
      <FormField id="email" label="Email" error="Required">
        <Input id="email" />
      </FormField>
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
