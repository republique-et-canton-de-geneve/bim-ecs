import { EcsComponent } from './ecs-component';

export type EcsComponentCtor<TComponent extends EcsComponent<TValue>, TValue> = new (value: TValue) => TComponent;
