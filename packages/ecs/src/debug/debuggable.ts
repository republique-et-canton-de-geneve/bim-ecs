export interface Debuggable {
  readonly [DEBUG_NAME]: string | string[]
  readonly [DEBUG_TYPE]: string
  readonly [DEBUG_ID]: string | string[]
  readonly [DEBUG_DEPENDENCIES]: any[]

  readonly [DEBUG_DEPENDENTS]?: Debuggable[]
}

export interface DebuggableSingle {
  readonly [DEBUG_NAME]: string
  readonly [DEBUG_TYPE]: string
  readonly [DEBUG_ID]: string
  readonly [DEBUG_DEPENDENCIES]: any[]
  readonly [DEBUG_DEPENDENTS]?: Debuggable[]
}

export const DEBUG_NAME = Symbol('DEBUG_NAME')
export const DEBUG_TYPE = Symbol('DEBUG_TYPE')
export const DEBUG_ID = Symbol('DEBUG_ID')
export const DEBUG_DEPENDENCIES = Symbol('DEBUG_DEPENDENCIES')
export const DEBUG_DEPENDENTS = Symbol('DEBUG_DEPENDENTS')
