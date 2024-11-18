import { EcsComponent } from './ecs-component.ts';

export type EcsComponentCtor<TComponent extends EcsComponent<TValue>, TValue> = new (value: TValue) => TComponent;
