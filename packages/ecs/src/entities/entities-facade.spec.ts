import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { EcsComponent } from '../components';

describe('EntitiesFacade', () => {
  class Position extends EcsComponent<number> {}
  class Velocity extends EcsComponent<number> {}
  class Name extends EcsComponent<string> {}

  /** Normalizes archetypes to comparable data */
  function archetypesOf(world: EcsWorld) {
    return world.entities
      .archetypes()
      .map(({ components, entities }) => ({
        components: components.map((c) => c.name).sort(),
        entities: [...entities],
      }))
      .sort((a, b) => a.components.join().localeCompare(b.components.join()));
  }

  describe('archetypes', () => {
    it('should be empty when there is no entity', () => {
      expect(new EcsWorld().entities.archetypes()).toEqual([]);
    });

    it('should group entities sharing the same component types', () => {
      const world = new EcsWorld();
      const a = world.entities.spawn(new Position(1), new Velocity(1));
      const b = world.entities.spawn(new Position(2), new Velocity(2));
      const c = world.entities.spawn(new Name('c'));

      expect(archetypesOf(world)).toEqual([
        { components: ['Name'], entities: [c] },
        { components: ['Position', 'Velocity'], entities: [a, b] },
      ]);
    });

    it('should follow components additions and removals', () => {
      const world = new EcsWorld();
      const entity = world.entities.spawn(new Position(1));

      world.entities.addComponent(entity, new Velocity(1));
      expect(archetypesOf(world)).toEqual([{ components: ['Position', 'Velocity'], entities: [entity] }]);

      world.entities.removeComponent(entity, Velocity);
      expect(archetypesOf(world)).toEqual([{ components: ['Position'], entities: [entity] }]);
    });

    it('should ignore archetypes left empty', () => {
      const world = new EcsWorld();
      const entity = world.entities.spawn(new Position(1), new Velocity(1));

      world.entities.remove(entity);

      expect(world.entities.archetypes()).toEqual([]);
    });
  });
});
