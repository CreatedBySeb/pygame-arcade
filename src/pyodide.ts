import { computed, ref, type ComputedRef } from "vue";
import { useProgram } from "./program";
import type { IncomingWorkerMessage, OutgoingWorkerMessage } from "./workerApi";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const readyRef = ref<boolean>(false);
const stderrRef = ref("");
const stdoutRef = ref("");

// Launch Pyodide in a worker for execution control and performance
const pyodideWorker = new Worker(new URL("./worker.ts", import.meta.url), {
  name: "pyodideWorker",
  type: "module",
});

// Handle messages sent by the worker
pyodideWorker.onmessage = async (event): Promise<void> => {
  if (!event.data || typeof event.data._type !== "string") {
    return;
  }

  const message = event.data as OutgoingWorkerMessage;

  switch (message._type) {
    case "ready": {
      readyRef.value = true;

      if (canvasRef.value) {
        transferCanvasControl(canvasRef.value);
      }
      break;
    }

    case "stderr": {
      stderrRef.value += message.text;
      break;
    }

    case "stdout": {
      stdoutRef.value += message.text;
      break;
    }
  }
};

/**
 * Reset the stdout and stderr buffers
 */
export function clearOutput(): void {
  stderrRef.value = "";
  stdoutRef.value = "";
}

/**
 * Computed ref that indicates whether Pyodide and Pygame have finished loading
 * in the worker
 */
export const pyodideLoaded = computed((): boolean => {
  return readyRef.value;
});

/**
 * Transfers control of the specified canvas element to the Pyodide worker and
 * sets it up for use with Pygame
 *
 * @param canvas The canvas element to use
 */
export function setCanvas(canvas: HTMLCanvasElement): void {
  if (pyodideLoaded.value) {
    transferCanvasControl(canvas);
  }

  canvasRef.value = canvas;
}

/**
 * Request the Pyodide worker to execute the currently written program
 */
export async function runProgram(): Promise<void> {
  clearOutput();
  const programRef = useProgram();
  pyodideWorker.postMessage({ _type: "run", code: programRef.value });
}

/**
 * Get the output buffers as computed refs for display
 * @returns A tuple of computed refs for the stdout and stderr buffers
 */
export function useOutput(): [ComputedRef<string>, ComputedRef<string>] {
  return [computed(() => stdoutRef.value), computed(() => stderrRef.value)];
}

/**
 * Internal helper for sending worker messages with typing
 * @param message The message to send to the worker
 * @param transfer Any objects to transfer ownership of to the worker
 */
function postMessage(
  message: IncomingWorkerMessage,
  transfer: Transferable[] = [],
): void {
  pyodideWorker.postMessage(message, transfer);
}

/**
 * Internal helper for transferring canvas control, extracted so it can be
 * deferred if the worker is not ready yet
 *
 * @param canvas The canvas element to transfer control over
 */
function transferCanvasControl(canvas: HTMLCanvasElement): void {
  const offscreen = canvas.transferControlToOffscreen();
  postMessage({ _type: "setCanvas", canvas: offscreen }, [offscreen]);
}
