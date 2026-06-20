import { computed, ref, type ComputedRef } from "vue";
import { useProgram } from "./program";
import {
  assertNever,
  type IncomingWorkerMessage,
  type OutgoingWorkerMessage,
} from "./workerApi";

const INTERRUPT_CLEAR: number = 0;
const INTERRUPT_SET: number = 2;

const interruptBuf = new Uint8Array(new SharedArrayBuffer(1));
const canvasRef = ref<HTMLCanvasElement | null>(null);
const readyRef = ref<boolean>(false);
const startedRef = ref<boolean>(false);
const stderrRef = ref<string>("");
const stdoutRef = ref<string>("");
const taskRunningRef = ref<boolean>(false);

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
      postMessage({ _type: "setInterrupt", buffer: interruptBuf });

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

    case "taskStarted": {
      taskRunningRef.value = true;
      break;
    }

    default: {
      assertNever(message);
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
 * Interrupt the current execution
 */
export async function interrupt(): Promise<void> {
  if (!startedRef.value) {
    return;
  }

  if (taskRunningRef.value) {
    // Task cancellation is cleanest option
    postMessage({ _type: "stop" });
    taskRunningRef.value = false;
  } else {
    // Fall back to interrupt
    interruptBuf[0] = INTERRUPT_SET;

    // Wait for the buffer to clear, polling every 0.5s
    while (interruptBuf[0] !== INTERRUPT_CLEAR) {
      await sleep(500);
    }
  }

  startedRef.value = false;
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
  await interrupt();
  clearOutput();
  interruptBuf[0] = INTERRUPT_CLEAR;
  const programRef = useProgram();
  startedRef.value = true;
  postMessage({ _type: "run", code: programRef.value });
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
 * Internal helper for asynchronously sleeping for a given number of
 * milliseconds using setTimeout
 *
 * @param duration The duration ot wait in ms
 * @returns A void Promise which resolves after the duration
 */
function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
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
