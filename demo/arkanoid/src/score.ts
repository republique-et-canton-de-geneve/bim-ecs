import { defineSystem, EcsPlugin, EcsResource, componentAdded } from 'bim-ecs';
import { Disabled } from './disabling';
import { Brick } from './brick';

export const scorePlugin: EcsPlugin = (world) => {
  world.registerSystem(handleBrickDeletionScoreSystem);
};

export class ScoreResource extends EcsResource {
  value = 0;

  public increment(offset = 1) {
    this.value += offset;
  }
}

export const handleBrickDeletionScoreSystem = defineSystem(
  'Handle brick score',
  ({ container }) => container.resolve(ScoreResource).increment(),
  componentAdded(Disabled, () => [Brick]),
);
