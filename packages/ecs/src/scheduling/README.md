# Scheduling

Scheduling extends [`Scheduler`](./scheduler.ts). It is used by system runner to trigger systems at predefined time.  
At its core, it uses [AsyncIterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator)
to create "ticks" on which associated systems are triggered.

## Existing schedulers

### startup

This is the most basic scheduler, triggering once when the world is started.

```typescript
import { defineSystem } from './define-system'
import { startup } from './startup'

defineSystem(
  'foo',
  () => {
    // implementation here
  },
  startup, // Triggers the system only once at world startup
)
```

### timer

This scheduler is triggering a Date.Now() each specified interval. Interval is specified as a parameter.

```typescript
import { defineSystem } from './define-system'
import { timer } from './timer'

defineSystem(
  'foo',
  () => {
    // implementation here
  },
  timer(500), // Triggers the system every 500ms
)
```

### frame

This scheduler triggers each frame

```typescript
import { defineSystem } from './define-system'
import { frame } from './frame'

defineSystem(
  'foo',
  () => {
    // implementation here
  },
  frame, // Triggers the system every frame
)
```

### on

This scheduler when the specified event is fired within the world event bus

```typescript
import { defineSystem } from './define-system'
import { on } from './on'
import { EcsEvent } from './ecs-event'

const FOO_EVENT = Symbol('foo event') as EcsEvent<number>

defineSystem(
  'foo',
  (_, { payload }) => {
    // payload is the event args (of type number in this case) the event has been fired with
    // implementation here
  },
  on(FOO_EVENT), // Triggers the system whenever the event is fired from world event bus
)
```

### after

This scheduler is triggered whenever specified system has finished processing

```typescript
import { defineSystem } from './define-system'
import { on } from './on'
import { EcsEvent } from './ecs-event'
import { after } from './after'

const FOO_EVENT = Symbol('foo event') as EcsEvent<number>

const system1 = defineSystem(/* System parameters here */)
defineSystem(
  'foo',
  () => {
    // implementation here
  },
  after(system1), // Triggers the system each time the system1 has finished being processed
)
```

## Scheduler modifiers

### compose

Scheduler can be aggregated this way:

```typescript
import { compose } from './compose'

compose(scheduler1, scheduler2) // Creates a scheduler combining scheduler1 and scheduler2 ticks
```

### debounce

Scheduler can be debounced this way:

```typescript
import { debounce } from './debounce'

debounce(scheduler1, 10) // Resulting scheduler won't tick until scheduler1 separates its own ticks with at least 10ms
```

### when

Scheduler can be filtered this way:

```typescript
import { when } from './when'

debounce((world) => {
  // Prepare here (container resolution for instance)
  return () => computePredicate() // Process filter here
}, scheduler1) // Resulting scheduler won't tick if predicate result is falsy
```
