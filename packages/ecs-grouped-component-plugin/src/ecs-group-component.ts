import { EcsComponent } from '@state-of-geneva/bim-ecs';
import type { EcsGroupedComponent } from './ecs-grouped-component';

export abstract class EcsGroupComponent extends EcsComponent<ReadonlySet<EcsGroupedComponent>> {}
