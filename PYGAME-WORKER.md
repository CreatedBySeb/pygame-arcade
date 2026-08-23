# Pygame Worker Implementation Notes

The Pyodide documentation says that [Pyodide must be run in a web worker to support interrupts](https://pyodide.org/en/stable/usage/keyboard-interrupts.html#:~:text=must%20be%20using%20Pyodide%20in%20a%20webworker).
However, SDL (required for Pygame) support requires [setting a canvas](https://pyodide.org/en/stable/usage/keyboard-interrupts.html#:~:text=must%20be%20using%20Pyodide%20in%20a%20webworker),
which can not be done in a web worker except with an `OffscreenCanvas`, which will normally result
in errors.

Based on discussion in [pyodide/pyodide#3728](https://github.com/pyodide/pyodide/issues/3728),
Pygame Arcade has a functioning implementation of Pygame/SDL running in a web worker. This has been
achieved by using stubs for `document` and `screen` within the worker's `globalThis` context, and
stubbing missing attributes or methods from `HTMLCanvasElement` on the `OffscreenCanvas` object. The
minimum possible functionality has been stubbed in order to get input fully working.

In order for the event listeners to work as expected, equivalent listeners need to be set up in the
main thread and the events need to be passed to the worker using `postMessage`, which then calls the
registered handlers with the events.

The stubs for `document`, `window` and `screen` need to be set up before Pyodide is loaded since
Emscripten will check for them when initialising and pass bad `querySelector` selectors if they are
not present. See [`libhtml5.js` in Emscripten](https://github.com/emscripten-core/emscripten/blob/2f3d9cc68dde05c86b0efb91f96446bad8789314/src/lib/libhtml5.js#L335).

## Implementation

The various stubs that are set up in the worker take over event listening by saving the event
listeners in an object keyed by the event being listened to. Even though the events come from
different sources, there are no duplicate events being listened to, so the source does not need to
be considered, only the event type.

The runtime then sends two messages to the worker that help with Pygame/SDL compatibility:

- `RelayEventMessage` for passing DOM events from the main thread to the worker
- `SetCanvasMessage` for transferring the `OffscreenCanvas` object to the worker

`runtime.ts` sets up listeners for the same events Pygame/SDL requires when it is imported, then
posts a `RelayEventMessage` with the event every time it is emitted. Event objects cannot be
transferred or cloned via the structured clone algorithm, so we pass their properties instead and
recreate minimal proxies. These are processed in `worker.ts` and passed to the registered event
listener.

`runtime.ts` also exposes a function used by the Vue UI components for setting the canvas element to
use with Pyodide. Once set, it posts a `SetCanvasMessage` which transfers the `OffscreenCanvas`
object to the worker, and it adds the stubs for the `HTMLCanvasElement` functionality that is
missing but required for Pygame/SDL.

## Required Stubs

The following methods/attributes need to be emulated for Pygame/SDL to work:

- `canvas`
  - `addEventListener`
  - `getBoundingClientRect` (return value updated via event when resized)
  - `id` (always return `"canvas"`)
  - `style` (always empty object)
- `body`
  - `requestPointerLock` (passed to main thread)
- `document`
  - `addEventListener`
  - `body` (see above)
  - `getElementById` (only works for canvas)
  - `fullscreenEnabled` (always `false`)
  - `fullscreenElement` (always `null`)
  - `hidden` (always `false`)
  - `querySelector` (only works for canvas)
  - `visibilityState` (always `"visible"`)
  - `webkitFullscreenEnabled` (always `undefined`)
- `screen`
  - `height` (copied from main thread)
  - `width`(copied from main thread)
- `window`
  - `addEventListener`

## Handled Events

The following event handlers are set up when Pygame/SDL is initialised, so we proxy them through:

- `canvas`
  - `mousedown` (`MouseEvent`)
  - `mouseenter` (`MouseEvent`)
  - `mouseleave` (`MouseEvent`)
  - `mousemove` (`MouseEvent`)
  - `touchcancel` (`TouchEvent`)
  - `touchend` (`TouchEvent`)
  - `touchmove` (`TouchEvent`)
  - `touchstart` (`TouchEvent`)
- `document`
  - `keydown` (`KeyboardEvent`)
  - `keypress` (`KeyboardEvent`)
  - `keyup` (`KeyboardEvent`)
  - `mouseup` (`MouseEvent`)
  - `pointerlockchange` (`Event`)
  - `visibilitychange` (`Event`)
- `window`
  - `blur` (`FocusEvent`)
  - `focus` (`FocusEvent`)
  - `resize` (`Event`)

The following properties are proxied for the event types:

- `Event`: `target` (see `EventTarget` note), `timestamp`, `type`
- `FocusEvent` (complete, inherits `UIEvent`): `relatedTarget` (see `EventTarget` note)
- `KeyboardEvent` (complete, inherits `UIEvent`): `altKey`, `char` (legacy, explicit `undefined`),
  `charCode`, `code`, `ctrlKey`, `isComposing`, `key`, `keyCode`, `locale` (legacy, explicit
  `undefined`), `location`, `metaKey`, `repeat`, `shiftKey`
- `MouseEvent` (complete, inherits `UIEvent`): `altKey`, `button`, `buttons`, `clientX`, `clientY`,
  `ctrlKey`, `layerX`, `layerY`, `metaKey`, `movementX`, `movementY`, `offsetX`, `offsetY`, `pageX`,
  `pageY`, `relatedTarget` (see `EventTarget` note), `screenX`, `screenY`, `shiftKey`, `x`, `y`
- `TouchEvent` (complete, inherits `UIEvent`): `altKey`, `changedTouches`, `ctrlKey`, `metaKey`,
  `shiftKey`, `targetTouches`, `touches`
- `UIEvent` (inherits `Event`): `detail`, `which`

In the list above, complete refers to the class' own standard properties, not methods or inherited
properties. For `EventTarget` objects, we serialise only the `id` and `nodeName` as those are all
that seem to be used. For any `TouchList` properties, these are instead sent as an `Array` of
`TouchData` objects, which hold a complete set of properties from `Touch`, with special handling in
the worker to replicate the `item` method of `TouchList` on the copied `Array`.

## Audio

Audio handling is a bit more complex, and is more closely tailored to the specific needs of Pygame
than the more general event handling support that has been implemented. SDL will initialise an
`AudioContext`, which is replaced with a stub that implements the necessary functionality from
`AudioContext` and its superclass `BaseAudioContext`. SDL does not pass options to `AudioContext`,
so they are discarded and a bare `AudioContext` is initialised when the project is run. The default
parameters are then passed to the worker thread for use in the stub.

### Implemented Stubs

- `AudioBuffer`
  - `numberOfChannels` (based on constructor)
- `AudioContext` (inherits from `BaseAudioContext`)
  - `(constructor)` (ignores options)
  - `baseLatency` (copied from main thread)
  - `close` (stubbed)
  - `createScriptProcessor` (instantiates `ScriptProcessorNode` and saves arguments)
  - `destination` (initialised to `AudioDestinationNode` on construction)
  - `resume` (stubbed)
- `AudioDestinationNode` (inherits from `AudioNode`)
- `AudioNode`
  - `connect` (stubbed, equivalent behaviour implemented on main thread)
  - `disconnect` (stubbed)
- `BaseAudioContext`
  - `createBuffer` (stubbed)
  - `sampleRate` (copied from main thread)
  - `state` (copied from main thread)
- `ScriptProcessorNode` (inherits from `AudioNode`)
  - `bufferSize` (based on constructor)

Some additional stubs are required if `BaseAudioContext#state` begins as `"suspended"`, but with the
way `AudioContext` is initialised in the main thread, this should not occur.
