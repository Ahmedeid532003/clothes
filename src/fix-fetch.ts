// Defensive fix for environments where window.fetch is a read-only getter
// but some libraries attempt to polyfill it.
if (typeof window !== 'undefined') {
  try {
    const target = window;
    const descriptor = Object.getOwnPropertyDescriptor(target, 'fetch') || 
                       Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'fetch');
                       
    if (descriptor && !descriptor.set && (descriptor.configurable || !Object.getOwnPropertyDescriptor(target, 'fetch'))) {
      const originalFetch = window.fetch;
      try {
        Object.defineProperty(target, 'fetch', {
          get: () => originalFetch,
          set: () => { /* ignore attempts to overwrite */ },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // If defineProperty fails, just log it.
        console.warn('Could not redefine window.fetch to be writable');
      }
    }
  } catch (e) {
    // ignore errors during definition
  }
}
export {};
