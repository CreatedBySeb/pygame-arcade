/**
 * Helpers for debugging during development
 * @module
 */

/**
 * Helper to conditionally wrap an object in a `Proxy` with a handler that logs
 * unimplemented properties when in development
 * @param original The original object to proxy
 * @param label How to describe the object, defaults to constructor name
 * @returns The original or the proxy, depending on environment
 */
export function proxyInDev<T extends object>(original: T, label?: string): T {
  if (import.meta.env.DEV) {
    label = label ?? original.constructor.name;

    return new Proxy(original, {
      get(target, prop, receiver) {
        if (!(prop in target)) {
          console.debug(
            `Attempted to access ${String(prop)} on ${label} but undefined`,
          );
          debugger;
        }

        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        console.debug(
          `Intercepted set for "${String(prop)}" to "${value}" on ${label}`,
        );
        return Reflect.set(target, prop, value, receiver);
      },
    });
  }

  return original;
}
