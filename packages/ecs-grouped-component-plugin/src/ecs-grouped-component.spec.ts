import { describe, it, expect } from 'vitest';
import { EcsWorld } from 'bim-ecs';
import { EcsComponent } from 'bim-ecs/components';
import { EcsGroupComponent } from './ecs-group-component';
import { ECS_GROUP_COMPONENT, type EcsGroupedComponent } from './ecs-grouped-component';
import { ecsGroupedComponentPlugin } from './ecs-grouped-component-plugin';

describe('ecs-grouped-component', () => {
  it('should have added a group component when first grouped component was assigned', () => {
    class GroupFoo extends EcsGroupComponent {}

    class GroupedFoo extends EcsComponent implements EcsGroupedComponent {
      [ECS_GROUP_COMPONENT] = GroupFoo;
    }

    // noinspection JSUnusedLocalSymbols
    class BarComponent extends EcsComponent {}

    const world = new EcsWorld();
    world.use(ecsGroupedComponentPlugin);
    world.run();

    const entity = world.entities.spawn(new BarComponent());
    expect(Array.from(world.query.execute(() => [GroupFoo]))).toHaveLength(0);

    world.entities.addComponent(entity, new GroupedFoo());
    expect(Array.from(world.query.execute(() => [GroupFoo]))).toHaveLength(1);

    world.entities.removeComponent(entity, GroupedFoo);
    expect(Array.from(world.query.execute(() => [GroupFoo]))).toHaveLength(0);
  });

  it('should have added a group component when entity have been spawned with grouped component', () => {
    class GroupFoo extends EcsGroupComponent {}

    class GroupedFoo extends EcsComponent implements EcsGroupedComponent {
      [ECS_GROUP_COMPONENT] = GroupFoo;
    }

    const world = new EcsWorld();
    world.use(ecsGroupedComponentPlugin);
    world.run();

    const entity = world.entities.spawn(new GroupedFoo());
    expect(Array.from(world.query.execute(() => [GroupFoo]))).toHaveLength(1);

    world.entities.removeComponent(entity, GroupedFoo);
    expect(Array.from(world.query.execute(() => [GroupFoo]))).toHaveLength(0);
  });
});
