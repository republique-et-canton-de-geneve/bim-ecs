import { EcsPlugin, defineSystem } from '@bim/ecs';
import { after } from '@bim/ecs/scheduling';
import { pointerMoveEvent } from './inputs.ts';
import { initializeSceneSystem } from './rendering.ts';

export const eventsHandlingPlugin: EcsPlugin = (world) => {
  world.registerSystem(
    defineSystem(
      'Init inputs binding',
      (_, { payload }) => {
        const { sceneElement } = payload;

        // DOM Events binding into ECS ecosystem
        document.addEventListener('pointermove', (event) => {
          const rect = sceneElement.getBoundingClientRect();
          const relativePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          world.bus.publish(pointerMoveEvent, { event, scenePosition: relativePosition });
        });
      },
      after(initializeSceneSystem),
    ),
  );
};
