import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isValidElement } from 'react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// True when `icon` is a renderable component *type* that should be created as <Icon /> rather than
// rendered as a child node. lucide-react ships its icons as forwardRef objects (typeof 'object',
// not 'function'), so a bare `typeof icon === 'function'` check misclassifies every Lucide icon as
// a node and React throws "Objects are not valid as a React child". This accepts function
// components and forwardRef/memo objects, while letting already-created elements and strings
// (legacy emoji) fall through to be rendered directly.
export function isIconComponent(icon) {
  if (typeof icon === 'function') return true;
  return typeof icon === 'object' && icon !== null && '$$typeof' in icon && !isValidElement(icon);
}
