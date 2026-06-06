import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './field';

describe('Field', () => {
  it('associates its label with the wrapped control', () => {
    render(
      <Field label="Email">
        <input type="email" />
      </Field>,
    );
    // Implicit association: the input is reachable by its label text.
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
