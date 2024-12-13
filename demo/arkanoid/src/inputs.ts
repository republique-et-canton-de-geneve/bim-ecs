import { EcsEvent } from 'bim-ecs/event-bus';

export const pointerMoveEvent = Symbol('pointer move event') as EcsEvent<{
  event: PointerEvent;
  scenePosition: { x: number; y: number };
}>;
