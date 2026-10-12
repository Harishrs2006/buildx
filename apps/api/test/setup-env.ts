// Runs before each test file's imports, so src/config/env.ts parses these values.
// No real credentials: Firebase, FCM and Anthropic are mocked in test/helpers.ts,
// and MongoDB is an in-memory server started per test file.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://placeholder-overridden-by-memory-server';
process.env.API_RATE_LIMIT_MAX = '100000';
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
