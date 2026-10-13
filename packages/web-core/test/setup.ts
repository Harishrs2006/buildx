import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest runs without globals, so Testing Library's auto-cleanup isn't registered
afterEach(() => cleanup());
