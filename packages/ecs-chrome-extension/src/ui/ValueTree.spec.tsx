import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { serializeValue } from '@state-of-geneva/bim-ecs-devtools-plugin';
import { ValueTree } from './ValueTree';

describe('ValueTree', () => {
  it('should display primitives', () => {
    render(<ValueTree value="hello" />);

    expect(screen.getByText('"hello"')).toBeTruthy();
  });

  it('should display the properties of an object and the class of an instance', () => {
    class Point {
      x = 1;
      y = 'two';
    }

    const { container } = render(<ValueTree value={serializeValue(new Point())} expandedDepth={1} />);

    expect(container.textContent).toContain('Point');
    expect(container.textContent).toContain('x: 1');
    expect(container.textContent).toContain('y: "two"');
  });

  it('should state what has been left out', () => {
    const items = Array.from({ length: 5 }, (_, i) => i);

    const { container } = render(<ValueTree value={serializeValue(items, { maxEntries: 2 })} />);

    expect(container.textContent).toContain('Array(5)');
    expect(container.textContent).toContain('… 3 more');
  });

  it('should keep special values readable', () => {
    const value = serializeValue({ nothing: undefined, nan: NaN, self: null as unknown, fn() {} });

    const { container } = render(<ValueTree value={value} />);

    expect(container.textContent).toContain('nothing: undefined');
    expect(container.textContent).toContain('nan: NaN');
    expect(container.textContent).toContain('fn: ƒ fn');
  });
});
