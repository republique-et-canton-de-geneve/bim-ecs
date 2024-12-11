import type { EcsEvent } from './ecs-event';

/** ECS event system */
export class EventBus implements Disposable {
  private readonly handlers = new Map<EcsEvent<any>, Array<(arg: any) => unknown>>();

  /**
   * Subscribes an event handler to one or more event keys. Returns a dispose function that can be called to unsubscribe the handler.
   * @param keys The key(s) representing the event type(s), can be an array or a single key.
   * @param handler The handler function to be called when the event is published.
   */
  public subscribe<T>(keys: EcsEvent<T> | EcsEvent<T>[], handler: (arg: T) => unknown): () => void {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const unsubscribeFunctions: Array<() => void> = [];

    keyArray.forEach((key) => {
      if (!this.handlers.has(key)) this.handlers.set(key, []);
      const handlersArray = this.handlers.get(key)!;
      handlersArray.push(handler);

      // Create an unsubscribe function for each key
      const unsubscribe = () => {
        const index = handlersArray.indexOf(handler);
        if (index !== -1) {
          handlersArray.splice(index, 1);
          // Clean up if no handlers are left for the key
          if (handlersArray.length === 0) {
            this.handlers.delete(key);
          }
        }
      };

      unsubscribeFunctions.push(unsubscribe);
    });

    // Return a function that calls all unsubscribe functions
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }

  // Overload for when T is never
  public publish(key: EcsEvent<void>): void;
  // Overload for the general case
  public publish<T>(key: EcsEvent<T>, value: T): T;

  /**
   * Publishes an event to all handlers subscribed to the specified event key.
   * @param key The key representing the event type.
   * @param value The event data to be passed to the handlers.
   */
  public publish<T>(key: EcsEvent<T>, value?: T) {
    const keyHandlers = this.handlers.get(key);
    if (keyHandlers) {
      keyHandlers.forEach((handler) => handler(value));
    }

    return value;
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.handlers.clear();
  }
}
