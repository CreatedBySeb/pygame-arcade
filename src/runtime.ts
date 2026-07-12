import {
  assertNever,
  joinPath,
  PROJECT_ROOT,
  splitPath,
  type IncomingWorkerMessage,
  type OutgoingWorkerMessage,
} from "@/workerApi";
import { computed, reactive, readonly, ref, type ComputedRef } from "vue";

const INTERRUPT_CLEAR: number = 0;
const INTERRUPT_SET: number = 2;
const READ_TIMEOUT: number = 5000;

export type DirectoryContents = Record<string, FSItem>;

export interface Directory {
  children: DirectoryContents;
  path: string;
  type: "directory";
}

export interface ProjectFile {
  path: string;
  type: "file";
}

export type FSItem = Directory | ProjectFile;

type PromiseFunctions<T> = [(value: T) => void, (reason: Error) => void];

const interruptBuf = new Uint8Array(new SharedArrayBuffer(1));
const pendingReads: Record<string, PromiseFunctions<string>> = {};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileStructureRef = ref<DirectoryContents>({});
const loadingPathsRef = ref<string[]>([]);
const readyRef = ref<boolean>(false);
const startedRef = ref<boolean>(false);
const stderrRef = ref<string>("");
const stdoutRef = ref<string>("");
const taskRunningRef = ref<boolean>(false);

// Launch Pyodide in a worker for execution control and performance
const pyodideWorker = new Worker(new URL("@/worker.ts", import.meta.url), {
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
    case "contentsList": {
      // if (!message.path.startsWith("/") || message.path.length < 2) {
      //   console.error(`Malformed message: ${message}`);
      //   return;
      // }

      const dir = walkPath(message.path);

      for (const name of message.files) {
        dir.children[name] = reactive({
          type: "file",
          path: joinPath([message.path, name]),
        });
      }

      for (const name of message.directories) {
        const existing = dir.children[name];
        const children =
          existing?.type === "directory" ? existing.children : {};

        dir.children[name] = reactive({
          type: "directory",
          path: joinPath([message.path, name]),
          children,
        });
      }

      loadingPathsRef.value = loadingPathsRef.value.filter(
        (value) => value != message.path,
      );

      break;
    }

    case "fileContents": {
      const handlers = pendingReads[message.path];

      if (handlers) {
        handlers[0](message.contents);
      }

      break;
    }

    case "finished": {
      startedRef.value = false;
      break;
    }

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
 * Creates a directory in the file system, automatically creating parents
 * @param path The path to create the directory at
 */
export function createDir(basePath: string, path: string): void {
  postMessage({ _type: "createDir", path: joinPath([basePath, path]) });
}

/**
 * Creates a file in the file system, automatically creating parent directories
 * @param path The path to create the file at
 * @param contents The initial contents of the file
 */
export function createFile(
  basePath: string,
  path: string,
  contents: string,
): void {
  postMessage({
    _type: "createFile",
    path: joinPath([basePath, path]),
    contents,
  });
}

/**
 * A read-only representation of the file system structure
 */
export const fileSystem = readonly(fileStructureRef);

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

/** The paths currently having their contents refreshed */
export const loadingPaths = readonly(loadingPathsRef);

/**
 * Computed ref that indicates whether Pyodide and Pygame have finished loading
 * in the worker
 */
export const pyodideLoaded = computed((): boolean => {
  return readyRef.value;
});

/**
 * Reads the contents of a file from the provided path asynchronously
 * @param path The path to read from
 * @returns A promise with the contents of the file
 */
export function readFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    pendingReads[path] = [resolve, reject];
    setTimeout(reject, READ_TIMEOUT);
    postMessage({ _type: "readFile", path });
  });
}

/** Asynchronously updates file system data to display the contents of the provided path */
export function refreshContents(path: string) {
  loadingPathsRef.value.push(path);
  postMessage({ _type: "listContents", path });
}

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
  startedRef.value = true;
  postMessage({ _type: "run" });
}

/**
 * Add user-provided files to the file system
 * @param files The uploaded files to add to the file system
 */
export function uploadFiles(basePath: string, files: File[]) {
  postMessage({ _type: "uploadFiles", basePath, files });
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

/**
 * Get a reference to the directory at the given path by walking the structure
 * @param path The path to traverse to
 */
function walkPath(path: string): Directory {
  if (!path.startsWith(PROJECT_ROOT)) {
    throw new Error(`Unexpected path '${path}'`);
  }

  path = path.slice(PROJECT_ROOT.length);

  if (path.endsWith("/")) {
    path.slice(0, -1);
  }

  const parts = splitPath(path);

  let dir: Directory = {
    type: "directory",
    path: PROJECT_ROOT,
    children: fileStructureRef.value,
  };

  parts.forEach((part, i) => {
    if (!Object.hasOwn(dir.children, part)) {
      // If a part doesn't exist, create it as a directory
      const fullPath = joinPath([PROJECT_ROOT, ...parts.slice(0, i + 1)]);
      const directory: Directory = reactive({
        type: "directory",
        path: fullPath,
        children: {},
      });
      dir.children[part] = directory;
      dir = directory;
    } else {
      const maybeDir = dir.children[part];

      if (maybeDir.type !== "directory") {
        throw new Error(`Part '${part}' in path '${path}' is not a directory`);
      }

      dir = maybeDir;
    }
  });

  return dir;
}
