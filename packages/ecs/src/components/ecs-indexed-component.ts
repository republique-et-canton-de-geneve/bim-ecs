import { EcsComponent } from './ecs-component.ts';

/**
 * Ecs indexed component base definition.
 * This component type handles value querying
 * */
export abstract class EcsIndexedComponent<T> extends EcsComponent<T> {}
