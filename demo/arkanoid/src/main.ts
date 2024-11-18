import { EcsWorld } from '@bim/ecs';
import { eventsHandlingPlugin } from './inputs-binding.ts';
import { renderingPlugin } from './rendering.ts';
import { bricksPlugin } from './brick.ts';
import { platePlugin } from './plate.ts';
import { ballPlugin } from './ball.ts';
import { disablingPlugin } from './disabling.ts';

const world = new EcsWorld();

world.use(platePlugin);
world.use(bricksPlugin);
world.use(ballPlugin);
world.use(renderingPlugin);
world.use(eventsHandlingPlugin);
world.use(disablingPlugin);

world.debug.render();
world.run();
