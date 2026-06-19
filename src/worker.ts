import { loadPyodide, type PyodideAPI } from "pyodide";
import type { IncomingWorkerMessage, OutgoingWorkerMessage } from "./workerApi";

let pyodide: PyodideAPI | null = null;
const decoder: TextDecoder = new TextDecoder();
const dimensions: [number, number] = [640, 480];

const pyodideReady = loadPyodide({
  indexURL: `${import.meta.env.BASE_URL}assets/pyodide`,
  packageBaseUrl: `${self.location.protocol}//${self.location.host}/assets/wheels/`,
});

pyodideReady.then(() => {
  post({ _type: "ready" });
});

const sendStderr = (buffer: Uint8Array): number => {
  post({ _type: "stderr", text: decoder.decode(buffer) });
  return buffer.length;
};

const sendStdout = (buffer: Uint8Array): number => {
  post({ _type: "stdout", text: decoder.decode(buffer) });
  return buffer.length;
};

/**
 * Internal helper for sending worker messages with typing
 * @param message The message to send to the main thread
 */
function post(message: OutgoingWorkerMessage): void {
  postMessage(message);
}

self.onmessage = async (event): Promise<void> => {
  if (!pyodide) {
    pyodide = await pyodideReady;
    await pyodide.loadPackage(["pygame-ce"]);

    // Workaround for https://github.com/pyodide/pyodide/issues/3697
    (pyodide as any)._api._skip_unwind_fatal_error = true;

    // Transmit stdout/stderr
    pyodide.setStderr({ write: sendStderr });
    pyodide.setStdout({ write: sendStdout });
  }

  if (!event.data || typeof event.data._type !== "string") {
    return;
  }

  const message = event.data as IncomingWorkerMessage;

  switch (message._type) {
    case "run": {
      await pyodide.runPythonAsync(message.code);
      break;
    }

    case "setCanvas": {
      const canvas = message.canvas as any;

      // Shims to trick pyodide into accepting the OffscreenCanvas
      // https://github.com/pyodide/pyodide/issues/3728
      canvas.getBoundingClientRect = () => new DOMRect(0, 0, ...dimensions);
      canvas.id = "canvas";
      canvas.style = {};

      (globalThis.document as any) = {
        // This may prevent pointer locking from working
        addEventListener(type: string, listener: Function, options: unknown) {
          console.debug(
            `Stubbed call to addEventListener("${type}", ${listener}, ${options})`,
          );
        },

        // Pyodide shouldn't need any elements other than the canvas
        querySelector(selector: string) {
          console.debug(
            `Stubbed call to querySelector(${selector}) to offscreen canvas`,
          );
          return canvas;
        },
      };

      (globalThis.screen as any) = {
        height: dimensions[1],
        width: dimensions[0],
      };

      pyodide.canvas.setCanvas2D(canvas);
      break;
    }
  }
};
