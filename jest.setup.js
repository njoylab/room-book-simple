import '@testing-library/jest-dom'

// Polyfill for Next.js Web API globals
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js server Web APIs
global.Request = class Request {
  constructor(input, init = {}) {
    this._url = typeof input === 'string' ? input : input.url
    this.method = init.method || 'GET'
    this.headers = new Headers(init.headers)
    this.body = init.body
  }
  
  get url() {
    return this._url
  }
  
  async json() {
    return this.body ? JSON.parse(this.body) : {}
  }
  
  async text() {
    return this.body || ''
  }
}

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Headers(init.headers)
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }
  
  async text() {
    if (typeof this.body === 'string') {
      return this.body
    }
    return JSON.stringify(this.body)
  }
  
  static json(data, init = {}) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  }
}

global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = {}
    if (init) {
      if (init instanceof Headers) {
        for (const [key, value] of init.entries()) {
          this._headers[key.toLowerCase()] = value
        }
      } else if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this._headers[key.toLowerCase()] = value
        }
      }
    }
  }
  
  get(name) {
    return this._headers[name.toLowerCase()]
  }
  
  set(name, value) {
    this._headers[name.toLowerCase()] = value
  }
  
  has(name) {
    return name.toLowerCase() in this._headers
  }
  
  delete(name) {
    delete this._headers[name.toLowerCase()]
  }
  
  append(name, value) {
    const existing = this.get(name)
    if (existing) {
      this.set(name, existing + ', ' + value)
    } else {
      this.set(name, value)
    }
  }
  
  *entries() {
    for (const [key, value] of Object.entries(this._headers)) {
      yield [key, value]
    }
  }
  
  *keys() {
    for (const key of Object.keys(this._headers)) {
      yield key
    }
  }
  
  *values() {
    for (const value of Object.values(this._headers)) {
      yield value
    }
  }
  
  [Symbol.iterator]() {
    return this.entries()
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  AIRTABLE_API_KEY: 'valid_airtable_api_key_123456789',
  AIRTABLE_BASE_ID: 'test_base',
  SLACK_CLIENT_ID: 'mock_client_id_value',
  SLACK_CLIENT_SECRET: 'mock_client_secret_value',
  SLACK_SIGNING_SECRET: 'mock_signing_secret_value',
  SESSION_SECRET: 'mocksessionsecret32charsfortestX',
  APP_BASE_URL: 'http://localhost:3000',
  CALENDAR_FEED_TOKEN: 'mock_calendar_feed_token_value',
}

// Mock fetch globally
global.fetch = jest.fn()

// Mock window.location methods if needed
// Note: jsdom provides its own location implementation

// Suppress console errors during tests unless explicitly testing for them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})