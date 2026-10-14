import { describe, it, expect } from 'vitest';
import { EcsComponent, EcsIndexedComponent, EcsMutableComponent, EcsWorld } from '@state-of-geneva/bim-ecs';
import { componentTypeKey, inspectComponents, inspectEntities, inspectEntity } from './inspect-entities';

class Position extends EcsComponent<{ x: number; y: number }> {}
class Health extends EcsMutableComponent<number> {}
class Team extends EcsIndexedComponent<string> {}
class Tag extends EcsComponent {}

describe('inspect-entities', () => {
  describe('componentTypeKey', () => {
    it('should be stable and distinct between types sharing the same name', () => {
      const makeType = () => class Same extends EcsComponent {};
      const first = makeType();
      const second = makeType();

      expect(componentTypeKey(first)).toBe(componentTypeKey(first));
      expect(componentTypeKey(first)).not.toBe(componentTypeKey(second));
    });
  });

  describe('inspectComponents', () => {
    it('should count entities by component type and by archetype', () => {
      const world = new EcsWorld();
      world.entities.spawn(new Position({ x: 0, y: 0 }), new Health(10));
      world.entities.spawn(new Position({ x: 1, y: 1 }), new Health(5));
      world.entities.spawn(new Position({ x: 2, y: 2 }));
      world.entities.spawn(new Tag());

      const snapshot = inspectComponents(world);
      const key = (type: any) => componentTypeKey(type);

      expect(snapshot.entities).toBe(4);
      expect(snapshot.types).toEqual([
        { key: key(Position), name: 'Position', kind: 'component', entities: 3 },
        { key: key(Health), name: 'Health', kind: 'mutable', entities: 2 },
        { key: key(Tag), name: 'Tag', kind: 'component', entities: 1 },
      ]);
      expect(snapshot.archetypes.map((archetype) => archetype.entities)).toEqual([2, 1, 1]);
      expect(snapshot.archetypes[0].components).toEqual([key(Position), key(Health)].sort());
    });

    it('should state the kind of indexed components', () => {
      const world = new EcsWorld();
      world.entities.spawn(new Team('red'));

      expect(inspectComponents(world).types[0]).toMatchObject({ name: 'Team', kind: 'indexed' });
    });

    it('should describe an empty world', () => {
      expect(inspectComponents(new EcsWorld())).toEqual({ entities: 0, types: [], archetypes: [] });
    });
  });

  describe('inspectEntities', () => {
    function createWorld() {
      const world = new EcsWorld();
      const ids = {
        moving: [
          world.entities.spawn(new Position({ x: 0, y: 0 }), new Health(1)),
          world.entities.spawn(new Position({ x: 0, y: 0 }), new Health(2)),
          world.entities.spawn(new Position({ x: 0, y: 0 }), new Health(3)),
        ],
        fixed: [world.entities.spawn(new Position({ x: 0, y: 0 }))],
        tagged: [world.entities.spawn(new Tag())],
      };
      return { world, ids };
    }

    it('should list every entity without filter', () => {
      const { world } = createWorld();

      const page = inspectEntities(world);

      expect(page.total).toBe(5);
      expect(page.entities).toHaveLength(5);
    });

    it('should filter on required and excluded component types', () => {
      const { world, ids } = createWorld();

      const withPosition = inspectEntities(world, { with: [componentTypeKey(Position)] });
      const positionOnly = inspectEntities(world, {
        with: [componentTypeKey(Position)],
        without: [componentTypeKey(Health)],
      });

      expect(withPosition.total).toBe(4);
      expect(positionOnly.entities.map((entity) => entity.id)).toEqual(ids.fixed);
    });

    it('should page the result across archetypes', () => {
      const { world } = createWorld();
      const all = inspectEntities(world).entities.map((entity) => entity.id);

      const pages = [
        inspectEntities(world, { offset: 0, limit: 2 }),
        inspectEntities(world, { offset: 2, limit: 2 }),
        inspectEntities(world, { offset: 4, limit: 2 }),
      ];

      expect(pages.map((page) => page.total)).toEqual([5, 5, 5]);
      expect(pages.flatMap((page) => page.entities.map((entity) => entity.id))).toEqual(all);
      expect(pages[2].entities).toHaveLength(1);
    });

    it('should return an empty page beyond the end', () => {
      const { world } = createWorld();

      expect(inspectEntities(world, { offset: 50 })).toEqual({ total: 5, entities: [] });
    });
  });

  describe('inspectEntity', () => {
    it('should detail the components with their serialized values', () => {
      const world = new EcsWorld();
      const entity = world.entities.spawn(new Position({ x: 1, y: 2 }), new Health(10));

      const detail = inspectEntity(world, entity);

      expect(detail).toEqual({
        id: entity,
        components: [
          {
            key: componentTypeKey(Position),
            name: 'Position',
            kind: 'component',
            value: {
              $: 'object',
              cls: 'Object',
              size: 2,
              entries: [
                ['x', 1],
                ['y', 2],
              ],
            },
          },
          { key: componentTypeKey(Health), name: 'Health', kind: 'mutable', value: 10 },
        ],
      });
    });

    it('should expose the additional fields of components', () => {
      class Extended extends EcsComponent<string> {
        public readonly note = 'hello';
      }

      const world = new EcsWorld();
      const entity = world.entities.spawn(new Extended('value'));

      expect(inspectEntity(world, entity)!.components[0]).toMatchObject({
        value: 'value',
        fields: { $: 'object', entries: [['note', 'hello']] },
      });
    });

    it('should provide null for an unknown entity', () => {
      expect(inspectEntity(new EcsWorld(), 42)).toBeNull();
    });
  });
});
