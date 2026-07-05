import { loadPyodide, type PyodideAPI } from "pyodide";
import mainTemplate from "./templates/main.py?raw";
import {
  assertNever,
  joinPath,
  PROJECT_ROOT,
  splitPath,
  type IncomingWorkerMessage,
  type OutgoingWorkerMessage,
} from "./workerApi";

interface TaskLike {
  cancel(msg?: string): void;
}

let pyodide: PyodideAPI | null = null;
let task: TaskLike | null = null;
const decoder: TextDecoder = new TextDecoder();
const dimensions: [number, number] = [640, 480];

const pyodideReady = loadPyodide({
  indexURL: `${import.meta.env.BASE_URL}assets/pyodide`,
  packageBaseUrl: `${self.location.protocol}//${self.location.host}/assets/wheels/`,
}).then(async (pyo) => {
  await pyo.loadPackage(["pygame-ce"]);

  // Workaround for https://github.com/pyodide/pyodide/issues/3697
  (pyo as any)._api._skip_unwind_fatal_error = true;

  // Transmit stdout/stderr
  pyo.setStderr({ write: sendStderr });
  pyo.setStdout({ write: sendStdout });

  // Create 'project' directory
  pyo.FS.mkdir(PROJECT_ROOT);
  pyo.FS.writeFile(joinPath([PROJECT_ROOT, "main.py"]), mainTemplate);

  // Alert main thread we are ready to run
  post({ _type: "ready" });

  return pyo;
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

function listDir(pyodide: PyodideAPI, root: string): void {
  const children = pyodide.FS.readdir(root);
  const directories: string[] = [];
  const files: string[] = [];

  for (const name of children) {
    if (name === "." || name === "..") {
      continue;
    }

    const path = joinPath([root, name]);
    const { node } = pyodide.FS.lookupPath(path, {});

    if (node.isFolder) {
      directories.push(name);
    } else {
      files.push(name);
    }
  }

  post({ _type: "contentsList", path: root, directories, files });
}

self.onmessage = async (event): Promise<void> => {
  if (!pyodide) {
    pyodide = await pyodideReady;
  }

  if (!event.data || typeof event.data._type !== "string") {
    return;
  }

  const message = event.data as IncomingWorkerMessage;

  switch (message._type) {
    case "createDir": {
      pyodide.FS.mkdirTree(message.path);
      listDir(pyodide, message.path);
      break;
    }

    case "createFile": {
      const parts = splitPath(message.path);
      const parent = "/" + joinPath(parts.slice(0, -1));

      pyodide.FS.mkdirTree(parent);
      pyodide.FS.writeFile(message.path, message.contents);
      listDir(pyodide, parent);
      break;
    }

    case "listContents": {
      listDir(pyodide, message.path);
      break;
    }

    case "readFile": {
      const contents = pyodide.FS.readFile(message.path, { encoding: "utf8" });
      post({ _type: "fileContents", path: message.path, contents });
      break;
    }

    case "run": {
      // FIXME: Handle indirectly started tasks?
      const mainContents = pyodide.FS.readFile(
        joinPath([PROJECT_ROOT, "main.py"]),
        { encoding: "utf8" },
      );

      const maybeCoroutine = pyodide.runPython(mainContents);

      if (maybeCoroutine && maybeCoroutine.type === "coroutine") {
        const webloop = pyodide.runPython(
          "import asyncio\nasyncio.get_running_loop()",
        );

        task = webloop.create_task(maybeCoroutine);
        post({ _type: "taskStarted" });
      }

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

    case "setInterrupt": {
      pyodide.setInterruptBuffer(message.buffer);
      break;
    }

    case "stop": {
      if (task) {
        task.cancel();
        task = null;
      }

      break;
    }

    default: {
      assertNever(message);
    }
  }
};
