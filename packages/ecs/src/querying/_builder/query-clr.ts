import { EcsComponent } from '../../components';

/** A compiled, ready to use ECS query (not to be used in ECS public API) */
export class QueryClr {
  public readonly with = new Set<typeof EcsComponent<any>>();
  public readonly without = new Set<typeof EcsComponent<any>>();
  public readonly withValue = [] as [typeof EcsComponent<any>, any][];
}
