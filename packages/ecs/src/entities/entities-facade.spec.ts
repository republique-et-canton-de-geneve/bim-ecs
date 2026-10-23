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

  describe('addComponents', () => {
    it('should add a component to every entity matching the query', () => {
      const world = new EcsWorld();
      const a = world.entities.spawn(new Position(1));
      const b = world.entities.spawn(new Position(2), new Name('b'));
      const c = world.entities.spawn(new Name('c'));

      const mutated = world.entities.addComponents(
        () => [Position],
        () => new Velocity(1),
      );

      expect(mutated.sort()).toEqual([a, b]);
      expect([...world.entities.query(() => [Position, Velocity])].sort()).toEqual([a, b]);
      expect([...world.entities.query(() => [Velocity])]).not.toContain(c);
    });

    it('should invoke the factory once per matched entity', () => {
      const world = new EcsWorld();
      world.entities.spawn(new Position(1));
      world.entities.spawn(new Position(2));
      world.entities.spawn(new Name('c'));

      const factoryEntities: number[] = [];
      world.entities.addComponents(
        () => [Position],
        (entity) => {
          factoryEntities.push(entity);
          return new Velocity(entity);
        },
      );

      expect(factoryEntities).toHaveLength(2);
      expect(new Set(factoryEntities).size).toBe(2); // No entity mutated twice
    });

    it('should support multiple components per entity', () => {
      const world = new EcsWorld();
      const a = world.entities.spawn(new Position(1));

      world.entities.addComponents(
        () => [Position],
        () => [new Velocity(1), new Name('a')],
      );

      expect([...world.entities.query(() => [Position, Velocity, Name])]).toEqual([a]);
    });
  });

  describe('removeComponents', () => {
    it('should remove component types from every entity matching the query', () => {
      const world = new EcsWorld();
      const a = world.entities.spawn(new Position(1), new Velocity(1));
      const b = world.entities.spawn(new Position(2), new Velocity(2), new Name('b'));
      const c = world.entities.spawn(new Velocity(3));

      const mutated = world.entities.removeComponents(() => [Position, Velocity], Velocity);

      expect(mutated.sort()).toEqual([a, b]);
      expect([...world.entities.query(() => [Velocity])]).toEqual([c]);
      expect([...world.entities.query(() => [Position])].sort()).toEqual([a, b]);
    });

    it('should remove multiple component types at once', () => {
      const world = new EcsWorld();
      const a = world.entities.spawn(new Position(1), new Velocity(1), new Name('a'));

      world.entities.removeComponents(() => [Name], Position, Velocity);

      expect([...world.entities.query(() => [Name])]).toEqual([a]);
      expect([...world.entities.query(() => [Position])]).toHaveLength(0);
      expect([...world.entities.query(() => [Velocity])]).toHaveLength(0);
    });
  });
});
