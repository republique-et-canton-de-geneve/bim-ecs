import type { EntityId } from '../../entities';
import { EcsIndexedComponent } from '../../components';

export type CacheValue = Set<EntityId>;

export class EntitiesByComponentRepository {
  private keyMap = new Map<typeof EcsIndexedComponent<any>, Map<any, CacheValue>>();
  private groupMap = new Map<typeof EcsIndexedComponent<any>, Map<any, Set<any>>>();

  set([type, values]: [typeof EcsIndexedComponent<any>, any], value: CacheValue): void {
    const valueArray = Array.isArray(values) ? values : [values];

    if (!this.keyMap.has(type)) {
      this.keyMap.set(type, new Map());
    }

    if (!this.groupMap.has(type)) {
      this.groupMap.set(type, new Map());
    }

    const typeMap = this.keyMap.get(type)!;
    const group = this.groupMap.get(type)!;
    const primaryKey = valueArray[0];

    for (const val of valueArray) {
      typeMap.set(val, value);
    }

    group.set(primaryKey, new Set(valueArray));
  }

  get([type, value]: [typeof EcsIndexedComponent<any>, any]): CacheValue | undefined {
    return this.keyMap.get(type)?.get(value);
  }

  addKeyValue(type: typeof EcsIndexedComponent<any>, newValue: any): void {
    const group = this.groupMap.get(type);
    const typeMap = this.keyMap.get(type);

    if (!group || !typeMap) return;

    for (const [primary, members] of group.entries()) {
      if (members.has(newValue)) return;

      for (const existing of members) {
        if (typeMap.has(existing)) {
          typeMap.set(newValue, typeMap.get(existing)!);
          members.add(newValue);
          return;
        }
      }
    }
  }

  public delete([type, value]: [typeof EcsIndexedComponent<any>, any]): void {
    this.keyMap.get(type)?.delete(value);

    const group = this.groupMap.get(type);
    if (!group) return;

    for (const [primary, members] of group.entries()) {
      if (members.delete(value) && members.size === 0) {
        group.delete(primary);
      }
    }
  }

  public deleteKeyValue(type: typeof EcsIndexedComponent<any>, value: any): void {
    const typeMap = this.keyMap.get(type);
    const group = this.groupMap.get(type);

    if (!typeMap || !group) return;

    typeMap.delete(value);

    for (const [primary, members] of group.entries()) {
      if (members.delete(value) && members.size === 0) {
        group.delete(primary);
      }
    }
  }

  public *entries(): IterableIterator<[[typeof EcsIndexedComponent<any>, any], CacheValue]> {
    for (const [type, subMap] of this.keyMap.entries()) {
      for (const [value, entitySet] of subMap.entries()) {
        yield [[type, value], entitySet];
      }
    }
  }

  values(): IterableIterator<CacheValue> {
    const seen = new Set<CacheValue>();

    function* iterator(this: EntitiesByComponentRepository) {
      for (const subMap of this.keyMap.values()) {
        for (const value of subMap.values()) {
          if (!seen.has(value)) {
            seen.add(value);
            yield value;
          }
        }
      }
    }

    return iterator.call(this);
  }

}

