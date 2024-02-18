import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
  verbose: true,
  transform: {
    '^.+\\.[jt]s?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '@/(.*).js': '<rootDir>/src/$1',
    '@/(.*)': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
