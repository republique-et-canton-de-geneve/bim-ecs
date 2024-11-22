import { EcsWorld } from '@bim/ecs';
import { eventsHandlingPlugin } from './inputs-binding';
import { renderingPlugin } from './rendering';
import { bricksPlugin } from './brick';
import { platePlugin } from './plate';
import { ballPlugin } from './ball';
import { disablingPlugin } from './disabling';
import { scorePlugin } from './score';

const world = new EcsWorld();

world.use(platePlugin);
world.use(bricksPlugin);
world.use(ballPlugin);
world.use(renderingPlugin);
world.use(eventsHandlingPlugin);
world.use(disablingPlugin);
world.use(scorePlugin);

world.debug.render();
world.run();
