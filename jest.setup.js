// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom doesn't implement crypto.randomUUID — polyfill it for tests
if (!('randomUUID' in crypto)) {
  crypto.randomUUID = () =>
    '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
    );
}
