// @vitest-environment node
import { expect, it } from 'vitest';

it('setup does not throw without a window', () => {
  expect(typeof window).toBe('undefined');
});
