import {
  after,
  atCommand,
  compose,
  debounce,
  defineSystem,
  EcsComponent,
  EcsIndexedComponent,
  EcsMutableComponent,
  EcsResource,
  EcsWorld,
  entityRemoved,
  frame,
  on,
  spawned,
  startup,
  timer,
  when,
  componentAdded,
  type EcsCommand,
  type EcsEvent,
  type EcsResourceKey,
} from '@state-of-geneva/bim-ecs';
import { devtoolsPlugin } from '@state-of-geneva/bim-ecs-devtools-plugin';

// Components ---------------------------------------------------------------------------------------------------------

export class Position extends EcsComponent<{ x: number; y: number }> {}
export class Velocity extends EcsComponent<{ x: number; y: number }> {}
export class Health extends EcsMutableComponent<number> {}
export class Team extends EcsIndexedComponent<'red' | 'blue'> {}
export class Brick extends EcsComponent {}
export class Frozen extends EcsComponent {}
export class Label extends EcsComponent<string> {}

// Events, commands, resources ----------------------------------------------------------------------------------------

export const WORLD_READY = Symbol('WORLD_READY') as EcsEvent<void>;
export const COLLISION = Symbol('COLLISION') as EcsEvent<{ brick: number }>;
export const SCORE_CHANGED = Symbol('SCORE_CHANGED') as EcsEvent<number>;
export const SPAWN_BRICK = Symbol('SPAWN_BRICK') as EcsCommand<void>;
export const RESET = Symbol('RESET') as EcsCommand<void>;
export const LEVEL = Symbol('LEVEL') as EcsResourceKey<number>;

export class GameSettings extends EcsResource {
  gravity = 9.81;
  players = ['alice', 'bob'];
  difficulty = { name: 'normal', modifiers: { speed: 1.2, lives: 3, nested: { deep: { deeper: true } } } };
  highScores = new Map([
    ['alice', 1200],
    ['bob', 800],
  ]);
  tags = new Set(['arcade', 'demo']);
  canvas = document.createElement('canvas');
  onWin = function celebrate() {};
}

export class Scoreboard extends EcsResource {
  score = 0;
  collisions = 0;
  spawned = 0;
}

// Systems ------------------------------------------------------------------------------------------------------------

const rareCollision = () => () => Math.random() < 0.02;

function createSystems() {
  const init = defineSystem(
    'init world',
    ({ entities }) => {
      for (let index = 0; index < 8; index++) {
        entities.spawn(
          new Brick(),
          new Position({ x: index * 40, y: 20 }),
          new Health(3),
          new Team(index % 2 ? 'red' : 'blue'),
          new Label(`brick ${index}`),
        );
      }
      entities.spawn(new Position({ x: 160, y: 400 }), new Velocity({ x: 1, y: -1 }), new Label('ball'));
      entities.spawn(new Position({ x: 140, y: 420 }), new Label('plate'));
    },
    startup,
    { then: { publish: WORLD_READY } },
  );

  const movement = defineSystem(
    'movement',
    ({ entities }) => {
      for (const entity of entities.query(() => [Position, Velocity])) {
        const position = entities.componentOf(entity, Position)!.value;
        const velocity = entities.componentOf(entity, Velocity)!.value;
        position.x = (position.x + velocity.x + 320) % 320;
        position.y = (position.y + velocity.y + 480) % 480;
      }
    },
    frame,
  );

  const collisions = defineSystem(
    'collision detection',
    ({ entities }) => {
      const bricks = [...entities.query(() => [Brick, Health])];
      return { brick: bricks[Math.floor(Math.random() * bricks.length)] };
    },
    when(rareCollision, after(movement)),
    { then: { publish: COLLISION } },
  );

  const damage = defineSystem(
    'apply damage',
    ({ entities, container }, { payload }) => {
      const health = entities.componentOf(payload.brick, Health);
      if (!health) return 0;

      health.value = health.value <= 1 ? 3 : health.value - 1;
      const board = container.resolve(Scoreboard);
      board.collisions++;
      return (board.score += 10);
    },
    on(COLLISION),
    { then: { publish: SCORE_CHANGED } },
  );

  const scoreboard = defineSystem('refresh scoreboard', () => {}, debounce(on(SCORE_CHANGED), 250));

  const countSpawned = defineSystem(
    'count spawned bricks',
    ({ container }) => void container.resolve(Scoreboard).spawned++,
    spawned(({ without }) => [Brick, without(Frozen)]),
  );

  const healthTracking = defineSystem('track health', () => {}, componentAdded(Health));

  const respawn = defineSystem(
    'respawn after destruction',
    () => {},
    entityRemoved(() => [Brick]),
    { then: { trigger: SPAWN_BRICK } },
  );

  const spawnBrick = defineSystem(
    'spawn a brick',
    ({ entities }) => {
      entities.spawn(new Brick(), new Position({ x: Math.random() * 300, y: 20 }), new Health(3));
    },
    atCommand(SPAWN_BRICK),
  );

  const reset = defineSystem('reset', () => {}, compose(startup, atCommand(RESET)));

  const gameOver = defineSystem('game over check', () => {}, after([damage, scoreboard], { combination: 'and' }));

  const autosave = defineSystem('autosave', () => {}, timer(60_000));

  return [
    init,
    movement,
    collisions,
    damage,
    scoreboard,
    countSpawned,
    healthTracking,
    respawn,
    spawnBrick,
    reset,
    gameOver,
    autosave,
  ];
}

// World --------------------------------------------------------------------------------------------------------------

export interface DemoWorld {
  world: EcsWorld;
  /** Spawns a brick, as the game would do */
  spawnBrick(): void;
  removeRandomBrick(): void;
  freezeRandomBrick(): void;
  /** Registers a system once the world is running */
  registerLateSystem(): void;
  /** Gives the world some life: components change, entities come and go */
  animate(): () => void;
  dispose(): void;
}

export function createDemoWorld(name = 'Demo'): DemoWorld {
  const world = new EcsWorld([new GameSettings(), new Scoreboard()]);
  world.container.register(LEVEL, 3);
  createSystems().forEach((system) => world.registerSystem(system));
  world.use(devtoolsPlugin({ name }));
  world.run();

  let lateSystems = 0;
  const bricks = () => [...world.entities.query(() => [Brick])];
  const pick = (entities: number[]) => entities[Math.floor(Math.random() * entities.length)];

  return {
    world,

    spawnBrick() {
      world.entities.spawn(
        new Brick(),
        new Position({ x: Math.random() * 300, y: 20 }),
        new Health(3),
        new Team('red'),
      );
    },

    removeRandomBrick() {
      const entity = pick(bricks());
      if (entity !== undefined) world.entities.remove(entity);
    },

    freezeRandomBrick() {
      const entity = pick([...world.entities.query(({ without }) => [Brick, without(Frozen)])]);
      if (entity !== undefined) world.entities.addComponent(entity, new Frozen());
    },

    registerLateSystem() {
      world.registerSystem(defineSystem(`late system ${++lateSystems}`, () => {}, on(WORLD_READY)));
    },

    animate() {
      const interval = setInterval(() => {
        const entity = pick(bricks());
        const health = entity === undefined ? undefined : world.entities.componentOf(entity, Health);
        if (health) health.value = Math.max(1, (health.value + 1) % 5);

        if (Math.random() < 0.2) this.spawnBrick();
        if (Math.random() < 0.1 && bricks().length > 6) this.removeRandomBrick();
      }, 1200);

      return () => clearInterval(interval);
    },

    dispose() {
      world[Symbol.dispose]();
    },
  };
}
