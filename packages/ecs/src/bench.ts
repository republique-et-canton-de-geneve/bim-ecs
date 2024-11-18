import { EcsWorld } from './world'
import { defineMixin, defineSystem } from './systems'
import { startup, after, on, timer } from './scheduling'
import type { EcsEvent } from './event-bus'
import { EcsResource } from './resources'

const world = new EcsWorld([], { verbose: 'debug' })

const clickEvent = Symbol('clickEvent') as EcsEvent<{
  /** boost value */
  boost: 20
}>

export class CounterResource extends EcsResource {
  constructor(public value = 0) {
    super()
  }
}

document.addEventListener('click', () => world.bus.publish(clickEvent, { boost: 20 }))

const handleClickSystem = defineSystem(
  'handle click',
  ({ container }, { payload }) => {
    console.log(
      'boost counter',
      payload,
      (container.resolve(CounterResource).value += payload.boost),
    )
  },
  on(clickEvent),
)

const subInitFunction = defineMixin<{ foo: string }>(
  'subInitFunction',
  ({ container }, { payload }) => {
    const counterResource = container.resolve(CounterResource)
    console.log('sub init function', payload.foo, counterResource.value)
  },
)

const initSystem = defineSystem(
  'init',
  async ({ container }, { mixin }) => {
    console.log('Hello init')
    container.register(new CounterResource(5))
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Hello init end')

    mixin(subInitFunction)({ foo: 'bar' })
  },
  startup,
)

const initSystem2 = defineSystem(
  'init 2',
  async () => {
    console.log('Hello init 2')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Hello init 2 end')
  },
  after(initSystem),
)

const initSystem3 = defineSystem(
  'init 3',
  async () => {
    console.log('Hello init 3')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Hello init 3 end')
  },
  after(initSystem2),
)

const pollSystem = defineSystem(
  'polling',
  ({ container }) => {
    console.log('I am polling, counter value is: ', container.resolve(CounterResource).value++)
  },
  timer(1000),
)

world
  .registerSystem(initSystem)
  .registerSystem(pollSystem)
  .registerSystem(initSystem2)
  .registerSystem(initSystem3)
  .registerSystem(handleClickSystem)

world.run()
