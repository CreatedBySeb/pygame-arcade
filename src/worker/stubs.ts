/**
 * Stubs for functionality required by Emscripten/SDL/Pygame but not available
 * in the worker context, see PYGAME-WORKER.md
 * @module
 */

import { proxyInDev } from "@/debug";
import type { SomeEventData, TouchData } from "@/worker/events";

/** The possible third arguments for an `addEventListener` call */
type EventListenerArgs = AddEventListenerOptions | boolean | undefined;
/** A mapping of event types to listeners */
export type EventListeners = Record<string, [Function, EventListenerArgs][]>;
/** An `OffscreenCanvas` modified to act like an `HTMLCanvasElement` */
export type FakeCanvas = OffscreenCanvas &
  HTMLCanvasElement & { _boundingRect: DOMRect };
/** An `Array` of `TouchData` modified to act like an `TouchList` */
export type FakeTouchList = TouchData[] & TouchList;

/**
 * Modifies an `OffscreenCanvas` object to implement functionality from
 * `HTMLCanvasElement` needed by Pygame/SDL
 * @param offscreen The `OffscreenCanvas` object to modify
 * @param listeners The object to store registered event listeners in
 * @param boundingRect The real `HTMLCanvasElement`'s bounding `DOMRect`
 * @returns  The modified `OffscreenCanvas` object
 */
export function fakeCanvas(
  offscreen: OffscreenCanvas,
  listeners: EventListeners,
  boundingRect: DOMRect,
): FakeCanvas {
  const modified = offscreen as FakeCanvas;
  modified._boundingRect = boundingRect;

  // @ts-expect-error -- Emscripten only uses Function but this may change in the future
  modified.addEventListener = (
    type: string,
    listener: Function,
    options?: EventListenerArgs,
  ) => {
    console.debug(
      `Registered event handler for "${type}" on canvas (options: ${options})`,
    );
    listeners[type] = listeners[type] ?? [];
    listeners[type].push([listener, options]);
  };

  modified.getBoundingClientRect = () => modified._boundingRect;
  modified.id = "canvas";

  Object.defineProperty(modified, "style", {
    get() {
      // FIXME: Implement support for controlling the cursor style
      console.debug("Attempted to get canvas style");
      return {};
    },

    set(value) {
      console.debug("Attempted to set canvas style to: " + value);
    },
  });

  return modified;
}

/**
 * Modifies event data passed to the worker to implement functionality from
 * `Event` needed by Pygame/SDL
 * @param data The event data passed to the worker
 * @returns The modified object
 */
export function fakeEvent(data: SomeEventData): Event {
  // Make `TouchData` arrays work as `TouchList`s
  if ("touches" in data) {
    const { changedTouches, targetTouches, touches } = data;
    data = {
      ...data,
      changedTouches: fakeTouchList(changedTouches),
      targetTouches: fakeTouchList(targetTouches),
      touches: fakeTouchList(touches),
    };
  }

  data = {
    ...data,
    target: data.target && proxyInDev(data.target, "EventTargetData"),
  };

  const modified = data as Event;

  modified.preventDefault = () =>
    console.debug("Prevent default called on " + data.type);

  return proxyInDev(modified, `FakeEvent(${data?.type})`);
}

/**
 * Adds an `item` method to an array to match the `TouchList` interface
 * @param array The array of `TouchData` objects
 * @returns The array with the `item` method added
 */
export function fakeTouchList(array: TouchData[]): FakeTouchList {
  const modified = array as FakeTouchList;
  modified.item = (idx) => modified[idx] ?? null;
  return modified;
}

/**
 * Base stub for any stubs that need to pretend to be an `EventTarget`
 * @param listeners The object to store registered event listeners in
 */
class EventTargetStub {
  protected listeners: EventListeners;

  constructor(listeners: EventListeners) {
    this.listeners = listeners;
  }

  // TODO: Need to investigate each event for handling
  public addEventListener(
    type: string,
    listener: Function,
    options?: EventListenerArgs,
  ) {
    console.debug(
      `Registered event handler for "${type}" on ${this.constructor.name} (options: ${options})`,
    );

    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type].push([listener, options]);
  }

  public removeEventListener(
    type: string,
    listener: Function,
    options?: EventListenerArgs,
  ) {
    console.debug(
      `Removed event handler for "${type}" on ${this.constructor.name} (options: ${JSON.stringify(options)})`,
    );

    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(([func, opts]) => {
        return func !== listener && opts !== options;
      });
    }
  }
}

/**
 * Stub for re-implementing `body` functionality for Pygame/SDL
 */
export class BodyStub {
  public requestPointerLock(options: PointerLockOptions) {
    console.debug("Pointer lock requested");
    postMessage({
      _type: "requestPointerLock",
      options,
    });
  }
}

/**
 * Stub for re-implementing `document` functionality for Pygame/SDL
 */
export class DocumentStub extends EventTargetStub {
  public readonly body: BodyStub;
  public readonly hidden: boolean = false; // FIXME: Proper visibility events
  public readonly fullscreenElement: null = null;
  public readonly fullscreenEnabled: boolean = false;
  public readonly visibilityState: string = "visible"; // FIXME: Proper visibility events
  public readonly webkitFullscreenEnabled: undefined = undefined;

  protected canvasGetter: () => unknown;

  constructor(listeners: EventListeners, canvasGetter: () => unknown) {
    super(listeners);
    this.canvasGetter = canvasGetter;
    this.body = proxyInDev(new BodyStub());
  }

  public querySelector(selector: string): unknown {
    if (selector === "#canvas") {
      return this.canvasGetter();
    }

    // Pyodide shouldn't need any elements other than the canvas, but log any
    // others so we can figure out how to handle them
    console.error(
      `Received unexpected querySelector call for "${selector}" in worker`,
    );
  }
}

/**
 * Stub for re-implementing `screen` functionality for Pygame/SDL
 *
 * Initialise with typical height/width and correct via events
 */
export class ScreenStub {
  public height: number = 1080;
  public width: number = 1080;

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}

/**
 * Stub for re-implementing `window` functionality for Pygame/SDL
 */
export class WindowStub extends EventTargetStub {}
