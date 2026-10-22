import { EcsComponent, EcsIndexedComponent } from '../../components';
import type { ArchetypeMask } from '../_archetype';
import { archetypeMaskFor } from '../_archetype/archetype-mask-for';
import type { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';

/** Bitwise compiled form of a query, ready for archetype mask matching */
export interface QueryClrMasks {
  /** Components that must all be present ('with' + 'withValue' parts) */
  readonly include: ArchetypeMask;
  /** Components that must all be absent ('without' part, "not" operator) */
  readonly exclude: ArchetypeMask;
  /** One mask per 'anyOf' group: each mask must share at least one bit with the tested archetype ("or" operator) */
  readonly anyOf: readonly ArchetypeMask[];
}

/** A compiled, ready to use ECS query (not to be used in ECS public API) */
export class QueryClr {
  public readonly with = new Set<typeof EcsComponent<any>>();
  public readonly without = new Set<typeof EcsComponent<any>>();
  public readonly withValue = [] as [typeof EcsIndexedComponent<any>, any][];
  public readonly withValueComponents = new Set<typeof EcsIndexedComponent<any>>();
  /** Component type groups: entities must hold at least one component of each group ("or" operator) */
  public readonly anyOf = [] as ReadonlySet<typeof EcsComponent<any>>[];

  /** Masks compiled on last `compiledMasks` call */
  #masks: QueryClrMasks | null = null;
  /** Counter the cached masks were compiled with */
  #masksCounter: ComponentTypeIdFlagCounter | null = null;
  /** Content sizes captured at mask compilation time (staleness detection, content can only grow) */
  #masksWithSize = -1;
  #masksWithoutSize = -1;
  #masksWithValueComponentsSize = -1;
  #masksAnyOfLength = -1;

  /**
   * Provides the bitwise compiled form of this query, cached across calls so repeated
   * archetype mask matching costs pure bitwise operations only
   * @param counter The component type id factory strategy to be used to handle id mask creation
   */
  public compiledMasks(counter: ComponentTypeIdFlagCounter): QueryClrMasks {
    if (
      this.#masks === null ||
      this.#masksCounter !== counter ||
      this.#masksWithSize !== this.with.size ||
      this.#masksWithoutSize !== this.without.size ||
      this.#masksWithValueComponentsSize !== this.withValueComponents.size ||
      this.#masksAnyOfLength !== this.anyOf.length
    ) {
      // 'with' and 'withValue' components merge into a single inclusion mask
      const include = archetypeMaskFor(this.with, counter);
      const withValueMask = archetypeMaskFor(this.withValueComponents, counter);
      for (let i = 0; i < include.length; i++) include[i] |= withValueMask[i];

      this.#masks = {
        include,
        exclude: archetypeMaskFor(this.without, counter),
        anyOf: this.anyOf.map((group) => archetypeMaskFor(group, counter)),
      };
      this.#masksCounter = counter;
      this.#masksWithSize = this.with.size;
      this.#masksWithoutSize = this.without.size;
      this.#masksWithValueComponentsSize = this.withValueComponents.size;
      this.#masksAnyOfLength = this.anyOf.length;
    }

    return this.#masks;
  }
}
