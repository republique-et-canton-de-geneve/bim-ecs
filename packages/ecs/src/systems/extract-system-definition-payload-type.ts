import type { SystemDefinition } from './system-definition'

export type ExtractSystemDefinitionPayloadType<P> =
  P extends SystemDefinition<any, infer T> ? T : never
