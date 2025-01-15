import { EcsComponent, EcsEvent, EntityId } from 'bim-ecs';

export class BallCollisionTrigger extends EcsComponent<EcsEvent<{ obstacle: EntityId; ball: EntityId }>> {}
