import { describe, it, expect } from 'vitest';
import { createElement, forwardRef, memo, isValidElement } from 'react';
import { Home } from 'lucide-react';
import { cn, isIconComponent } from './utils';

describe('cn', () => {
  it('merges class names and dedupes conflicting Tailwind utilities', () => {
    const isHidden = false;
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', isHidden && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('isIconComponent', () => {
  it('treats a plain function component as a component type', () => {
    const Fn = () => null;
    expect(isIconComponent(Fn)).toBe(true);
  });

  it('treats a forwardRef component (how lucide-react ships icons) as a component type', () => {
    const Ref = forwardRef(() => null);
    expect(isIconComponent(Ref)).toBe(true);
    // Guards against the real bug: a Lucide icon must be rendered as <Icon/>, not as a child node.
    expect(isIconComponent(Home)).toBe(true);
    expect(isValidElement(Home)).toBe(false);
  });

  it('treats a memo component as a component type', () => {
    expect(isIconComponent(memo(() => null))).toBe(true);
  });

  it('treats an already-created element as a node, not a component', () => {
    expect(isIconComponent(createElement(Home))).toBe(false);
  });

  it('treats strings (legacy emoji), null and undefined as nodes', () => {
    expect(isIconComponent('🔥')).toBe(false);
    expect(isIconComponent(null)).toBe(false);
    expect(isIconComponent(undefined)).toBe(false);
  });
});
