import { type ArchetypeMaskHash, hashArchetypeMask } from './hash-archetype-mask';
import { map } from '@bim/iterable';
import type { ArchetypeMask } from './archetype';

/** Handles values mapping by `ArchetypeMask` */
export class ArchetypeMaskMap<V> {
  private readonly _entries = new Map<ArchetypeMaskHash, [ArchetypeMask, V]>();

  set(key: ArchetypeMask, value: V): this {
    const hash = hashArchetypeMask(key);
    this._entries.set(hash, [key, value]);
    return this;
  }

  get(key: ArchetypeMask): V | undefined {
    const hash = hashArchetypeMask(key);
    return this._entries.get(hash)?.[1]; // Return the value
  }

  has(key: ArchetypeMask): boolean {
    const hash = hashArchetypeMask(key);
    return this._entries.has(hash);
  }

  delete(key: ArchetypeMask): boolean {
    const hash = hashArchetypeMask(key);
    return this._entries.delete(hash);
  }

  clear(): void {
    this._entries.clear();
  }

  get size() {
    return this._entries.size;
  }

  keys() {
    return map(this._entries.values(), ([key]) => key);
  }

  values() {
    return map(this._entries.values(), ([, value]) => value);
  }

  entries() {
    return this._entries.values();
  }
}
