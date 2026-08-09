/**
 * Helpers for serialising `Event`s into a form that is supported by the
 * structured clone algorithm for passing to the worker, see PYGAME-WORKER.md
 * @module
 */

type EventData<T extends string = string> = Pick<Event, "timeStamp"> & {
  target: EventTargetData | null;
  type: T;
};

interface EventTargetData {
  id?: string;
  nodeName?: string;
}

interface FocusEventData extends UIEventData<"blur" | "focus"> {
  relatedTarget: EventTargetData | null;
}

type KeyEventData = Pick<
  KeyboardEvent,
  | "altKey"
  | "charCode"
  | "code"
  | "ctrlKey"
  | "isComposing"
  | "key"
  | "keyCode"
  | "location"
  | "metaKey"
  | "repeat"
  | "shiftKey"
> & { char: undefined; locale: undefined } & UIEventData<
    "keydown" | "keypress" | "keyup"
  >;

type MouseEventData = Pick<
  MouseEvent,
  | "altKey"
  | "button"
  | "buttons"
  | "clientX"
  | "clientY"
  | "ctrlKey"
  | "layerX"
  | "layerY"
  | "metaKey"
  | "movementX"
  | "movementY"
  | "offsetX"
  | "offsetY"
  | "pageX"
  | "pageY"
  | "screenX"
  | "screenY"
  | "shiftKey"
  | "x"
  | "y"
> & { relatedTarget: EventTargetData | null } & UIEventData<
    "mousedown" | "mouseenter" | "mouseleave" | "mousemove"
  >;

export type TouchData = Pick<
  Touch,
  | "clientX"
  | "clientY"
  | "force"
  | "identifier"
  | "pageX"
  | "pageY"
  | "radiusX"
  | "radiusY"
  | "rotationAngle"
  | "screenX"
  | "screenY"
> & { target: EventTargetData | null };

type TouchEventData = Pick<
  TouchEvent,
  "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
> & {
  changedTouches: TouchData[];
  targetTouches: TouchData[];
  touches: TouchData[];
} & UIEventData<"touchcancel" | "touchend" | "touchmove" | "touchstart">;

type UIEventData<T extends string = string> = Pick<
  UIEvent,
  "detail" | "which"
> &
  EventData<T>;

export type SomeEventData =
  | EventData<"pointerlockchange" | "resize" | "visiblitychange">
  | FocusEventData
  | KeyEventData
  | MouseEventData
  | TouchEventData;

/**
 * Serialises an event to a cloneable object
 * @param event The event to serialise
 * @returns The event data
 */
export function serialiseEvent(event: Event): SomeEventData {
  if (event instanceof FocusEvent) {
    return serialiseFocusEvent(event);
  } else if (event instanceof KeyboardEvent) {
    return serialiseKeyEvent(event);
  } else if (event instanceof MouseEvent) {
    return serialiseMouseEvent(event);
  } else if (event instanceof TouchEvent) {
    return serialiseTouchEvent(event);
  } else if (event.constructor === Event) {
    return serialiseBaseEvent<
      "pointerlockchange" | "resize" | "visiblitychange"
    >(event);
  } else {
    throw new TypeError("Unhandled event type: " + event.constructor.name);
  }
}

/**
 * Serialises a base `Event` to a cloneable object
 * @param event The `Event` to serialise
 * @returns The event data
 */
function serialiseBaseEvent<T extends string = string>(
  event: Event,
): EventData<T> {
  const { target, timeStamp, type } = event;
  return { target: serialiseEventTarget(target), timeStamp, type: type as T };
}

/**
 * Serialises an `EventTarget` to a cloneable object
 * @param event The `EventTarget` to serialise
 * @returns The event target data
 */
function serialiseEventTarget(
  target: EventTarget | null,
): EventTargetData | null {
  // Node target data
  const { nodeName } = target instanceof Node ? target : {};

  // Element target data
  const { id } = target instanceof Element ? target : {};

  return { id, nodeName };
}

/**
 * Serialises a `FocusEvent`'s data to a cloneable object
 * @param event The `FocusEvent` to serialise
 * @returns The event data
 */
export function serialiseFocusEvent(event: FocusEvent): FocusEventData {
  return {
    ...serialiseUIEvent(event),
    relatedTarget: serialiseEventTarget(event.relatedTarget),
  };
}

/**
 * Serialises a `KeyboardEvent`'s data to a cloneable object
 * @param event The `KeyboardEvent` to serialise
 * @returns The event data
 */
function serialiseKeyEvent(event: KeyboardEvent): KeyEventData {
  const {
    altKey,
    code,
    charCode,
    ctrlKey,
    isComposing,
    key,
    keyCode,
    location,
    metaKey,
    repeat,
    shiftKey,
  } = event;

  // Explicit `undefined` for deprecated properties helps avoid flagging them
  // when looking for unimplemented properties
  return {
    ...serialiseUIEvent(event),
    altKey,
    char: undefined,
    charCode,
    code,
    ctrlKey,
    isComposing,
    key,
    keyCode,
    locale: undefined,
    location,
    metaKey,
    repeat,
    shiftKey,
  };
}

/**
 * Serialises a `MouseEvent`'s data to a cloneable object
 * @param event The `MouseEvent` to serialise
 * @returns The event data
 */
function serialiseMouseEvent(event: MouseEvent): MouseEventData {
  const {
    altKey,
    button,
    buttons,
    clientX,
    clientY,
    ctrlKey,
    layerX,
    layerY,
    metaKey,
    movementX,
    movementY,
    offsetX,
    offsetY,
    pageX,
    pageY,
    relatedTarget,
    screenX,
    screenY,
    shiftKey,
    x,
    y,
  } = event;

  return {
    ...serialiseUIEvent(event),
    altKey,
    button,
    buttons,
    clientX,
    clientY,
    ctrlKey,
    layerX,
    layerY,
    metaKey,
    movementX,
    movementY,
    offsetX,
    offsetY,
    pageX,
    pageY,
    relatedTarget: serialiseEventTarget(relatedTarget),
    screenX,
    screenY,
    shiftKey,
    x,
    y,
  };
}

/**
 * Serialises a `Touch`'s data to a cloneable object
 * @param event The `Touch` to serialise
 * @returns The touch data
 */
function serialiseTouch(touch: Touch): TouchData {
  const {
    clientX,
    clientY,
    force,
    identifier,
    pageX,
    pageY,
    radiusX,
    radiusY,
    rotationAngle,
    screenX,
    screenY,
    target,
  } = touch;

  return {
    clientX,
    clientY,
    force,
    identifier,
    pageX,
    pageY,
    radiusX,
    radiusY,
    rotationAngle,
    screenX,
    screenY,
    target: serialiseEventTarget(target),
  };
}

/**
 * Serialises a `TouchEvent`'s data to a cloneable object
 * @param event The `TouchEvent` to serialise
 * @returns The event data
 */
function serialiseTouchEvent(event: TouchEvent): TouchEventData {
  const {
    altKey,
    changedTouches,
    ctrlKey,
    metaKey,
    shiftKey,
    targetTouches,
    touches,
  } = event;

  return {
    ...serialiseUIEvent(event),
    altKey,
    changedTouches: Array.from(changedTouches).map(serialiseTouch),
    ctrlKey,
    metaKey,
    shiftKey,
    targetTouches: Array.from(targetTouches).map(serialiseTouch),
    touches: Array.from(touches).map(serialiseTouch),
  };
}

/**
 * Serialises a `UIEvent`'s data to a cloneable object
 * @param event The `UIEvent` to serialise
 * @returns The event data
 */
function serialiseUIEvent<T extends string = string>(
  event: UIEvent,
): UIEventData<T> {
  const { detail, which } = event;
  return { ...serialiseBaseEvent<T>(event), detail, which };
}
