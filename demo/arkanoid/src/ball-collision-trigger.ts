import { EcsComponent, EcsEvent, EntityId } from '@state-of-geneva/bim-ecs';

export class BallCollisionTrigger extends EcsComponent<EcsEvent<{ obstacle: EntityId; ball: EntityId }>> {}
