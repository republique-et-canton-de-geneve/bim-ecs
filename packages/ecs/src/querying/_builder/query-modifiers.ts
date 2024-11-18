import type { without } from './without.ts';
import type { withValue } from './with-value.ts';
import { withComponent } from './with-component.ts';

export interface QueryModifiers {
  without: ReturnType<typeof without>;
  withValue: ReturnType<typeof withValue>;
  include: ReturnType<typeof withComponent>;
}
