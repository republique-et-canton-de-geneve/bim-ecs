import { EcsComponent } from './ecs-component';

/**
 * Ecs indexed component base definition.
 * This component type handles value querying
 * */
export abstract class EcsIndexedComponent<T> extends EcsComponent<T> {}
