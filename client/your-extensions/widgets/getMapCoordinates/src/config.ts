import { type ImmutableObject } from 'seamless-immutable'

export interface Config {
  version: '1.14.0',
  exampleConfigProperty: string
}

export type IMConfig = ImmutableObject<Config>
