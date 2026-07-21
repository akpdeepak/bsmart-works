import * as React from 'react';
import { cn } from '@/lib/utils';

/** Structural table primitive for layouts that cannot use the column-driven DataTable. */
export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <table ref={ref} className={cn(className)} {...props} />
));

Table.displayName = 'Table';
