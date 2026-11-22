import '@testing-library/jest-dom';

// JSDOM does not implement ResizeObserver used by Recharts ResponsiveContainer
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// JSDOM does not implement window.scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}

