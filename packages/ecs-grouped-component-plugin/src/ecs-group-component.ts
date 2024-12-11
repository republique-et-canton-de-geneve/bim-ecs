import { EcsComponent } from 'bim-ecs/components';
import type { EcsGroupedComponent } from './ecs-grouped-component';

export abstract class EcsGroupComponent extends EcsComponent<ReadonlySet<EcsGroupedComponent>> {}
