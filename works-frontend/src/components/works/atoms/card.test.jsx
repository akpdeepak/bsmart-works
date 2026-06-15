import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from './card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies elevated variant (shadow-md) by default', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('shadow-md');
  });

  it('applies outlined variant classes', () => {
    const { container } = render(<Card variant="outlined">x</Card>);
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).not.toHaveClass('shadow-md');
  });

  it('applies flat variant classes', () => {
    const { container } = render(<Card variant="flat">x</Card>);
    expect(container.firstChild).toHaveClass('bg-neutral-50');
    expect(container.firstChild).not.toHaveClass('shadow-md');
    expect(container.firstChild).not.toHaveClass('border');
  });

  it('applies sm padding', () => {
    const { container } = render(<Card padding="sm">x</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('applies none padding', () => {
    const { container } = render(<Card padding="none">x</Card>);
    expect(container.firstChild).not.toHaveClass('p-4');
    expect(container.firstChild).not.toHaveClass('p-6');
  });

  it('merges extra className', () => {
    const { container } = render(<Card className="w-full">x</Card>);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).not.toBeNull();
  });

  it('includes dark mode classes', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild.className).toMatch(/dark:/);
  });
});

describe('CardHeader', () => {
  it('renders children in a flex row', () => {
    render(<CardHeader>header</CardHeader>);
    expect(screen.getByText('header')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('renders as h3', () => {
    render(<CardTitle>My Card</CardTitle>);
    expect(screen.getByRole('heading', { level: 3, name: 'My Card' })).toBeInTheDocument();
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<CardDescription>Sub text</CardDescription>);
    expect(screen.getByText('Sub text')).toBeInTheDocument();
  });
});

describe('CardBody', () => {
  it('renders children', () => {
    render(<CardBody>body</CardBody>);
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children and applies border-top classes', () => {
    const { container } = render(<CardFooter>footer</CardFooter>);
    expect(screen.getByText('footer')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('border-t');
  });
});
