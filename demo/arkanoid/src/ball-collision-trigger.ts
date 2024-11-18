import { EcsComponent } from '@bim/ecs/components';
import { EcsEvent } from '@bim/ecs/event-bus';
import { EntityId } from '@bim/ecs/entities';

export class BallCollisionTrigger extends EcsComponent<EcsEvent<EntityId>> {}
