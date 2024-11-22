import type { without } from './without';
import type { withValue } from './with-value';
import { withComponent } from './with-component';

export interface QueryModifiers {
  without: ReturnType<typeof without>;
  withValue: ReturnType<typeof withValue>;
  include: ReturnType<typeof withComponent>;
}
