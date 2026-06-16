import { render, screen } from '@testing-library/react';
import { SuccessCheck } from './success-check';

// jsdom does not implement getTotalLength on SVG path elements.
// Stub it on SVGElement (the common ancestor) before tests so the useEffect
// in SuccessCheck doesn't throw at `path.getTotalLength()`.
beforeAll(() => {
  if (typeof window.SVGElement !== 'undefined' && !window.SVGElement.prototype.getTotalLength) {
    window.SVGElement.prototype.getTotalLength = () => 30;
  }
});

describe('SuccessCheck', () => {
  it('renders without crashing', () => {
    const { container } = render(<SuccessCheck />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('has role="img"', () => {
    render(<SuccessCheck />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has the default aria-label "Success"', () => {
    render(<SuccessCheck />);
    expect(screen.getByRole('img', { name: 'Success' })).toBeInTheDocument();
  });

  it('accepts a custom aria-label', () => {
    render(<SuccessCheck aria-label="Item saved" />);
    expect(screen.getByRole('img', { name: 'Item saved' })).toBeInTheDocument();
  });

  it('sets width and height from the size prop', () => {
    render(<SuccessCheck size={48} />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('defaults to size 24 when size prop is omitted', () => {
    render(<SuccessCheck />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('applies the className prop to the svg element', () => {
    render(<SuccessCheck className="my-custom-class" />);
    expect(screen.getByRole('img')).toHaveClass('my-custom-class');
  });
});
