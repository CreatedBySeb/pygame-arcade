import deleteProject from "@/scripts/delete_project.py?raw";
import exportProject from "@/scripts/export_project.py?raw";
import importProject from "@/scripts/import_project.py?raw";
import invalidateImports from "@/scripts/invalidate_imports.py?raw";
import mainTemplate from "@/templates/main.py?raw";
import {
  assertNever,
  joinPath,
  PROJECT_ROOT,
  splitPath,
  type IncomingWorkerMessage,
  type OutgoingWorkerMessage,
} from "@/workerApi";
import { loadPyodide, type PyodideAPI } from "pyodide";
import type { PyProxy } from "pyodide/ffi";

interface TaskLike {
  add_done_callback(callback: (future: PyProxy) => void): void;
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
  // Start loading pygame while doing other setup
  const pygamePromise = pyo.loadPackage(["pygame-ce"]);

  // Workaround for https://github.com/pyodide/pyodide/issues/3697
  (pyo as any)._api._skip_unwind_fatal_error = true;

  // Mount project directory
  pyo.FS.mkdir(PROJECT_ROOT);
  // @ts-expect-error -- Pyodide filesystems are not included in type currently
  pyo.FS.mount(pyo.FS.filesystems.IDBFS, { autoPersist: true }, PROJECT_ROOT);
  await syncFS(pyo, true).catch(console.error); // Ensure data is read in before changes
  pyo.FS.chdir(PROJECT_ROOT);

  // Bootstrap the project
  await bootstrapProject(pyo);

  // Wait for pygame to finish loading
  await pygamePromise;

  // Transmit stdout/stderr
  pyo.setStderr({ write: sendStderr });
  pyo.setStdout({ write: sendStdout });

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
 * Bootstraps a new project by creating the directory and main.py
 * @param pyo The loaded Pyodide instance
 */
async function bootstrapProject(pyo: PyodideAPI): Promise<void> {
  const mainPath = joinPath([PROJECT_ROOT, "main.py"]);
  const { exists } = pyo.FS.analyzePath(mainPath);

  // Avoid bootstrapping if the file already exists
  if (exists) {
    return;
  }

  // Initialise project files
  pyo.FS.writeFile(mainPath, mainTemplate);

  // Ensure bootstrapped project is persisted
  await syncFS(pyo, false).catch(console.error);
}

/**
 * Erases all files in the project
 * @param pyo The loaded Pyodide instance
 */
function eraseProject(pyo: PyodideAPI): void {
  pyo.runPython(deleteProject);
}

/**
 * Internal helper for sending worker messages with typing
 * @param message The message to send to the main thread
 */
function post(message: OutgoingWorkerMessage): void {
  postMessage(message);
}

/**
 * Internal callback for when the main task completes
 * @param future The future that completed
 */
function handleCompletion(future: PyProxy): void {
  const exception: PyProxy | null = future.cancelled()
    ? null
    : (future.exception() as PyProxy);

  if (exception) {
    reportException(exception);
  } else {
    post({ _type: "finished" });
  }
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

/**
 * Internal helper to retrieve the traceback of an exception and report it to
 * the runtime. This function takes ownership of the exception and destroys it.
 * @param exception The exception to report
 */
function reportException(exception?: PyProxy): void {
  const traceback = pyodide!.pyimport("traceback");

  if (!exception) {
    const sys = pyodide!.pyimport("sys");
    exception = sys.last_exc.copy() as PyProxy;
    sys.destroy();
  }

  post({
    _type: "errored",
    error: traceback.format_exception(exception).join(""),
  });

  traceback.destroy();
  exception.destroy();
}

/**
 * A promise-based version of the syncfs function in Emscripten FS
 * @param pyo The loaded Pyodide instance
 * @param populate The `populate` value to pass through to syncfs
 * @returns A promise which resolves on completion or rejects with the error
 */
function syncFS(pyo: PyodideAPI, populate: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    pyo.FS.syncfs(populate, (e) => (e !== null ? reject(e) : resolve()));
  });
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

    case "eraseProject": {
      eraseProject(pyodide);
      await bootstrapProject(pyodide);

      post({ _type: "ready" });
      break;
    }

    case "exportProject": {
      const zipData = pyodide.runPython(exportProject).toJs();
      const zipFile = new File([zipData], "project.zip", {
        type: "application/zip",
      });

      post({
        _type: "exportedProject",
        file: zipFile,
      });

      break;
    }

    case "importProject": {
      eraseProject(pyodide);
      const importFunc = pyodide.runPython(importProject);
      importFunc(pyodide.toPy(await message.file.bytes()));
      await syncFS(pyodide, false).catch(console.error);

      post({ _type: "ready" });
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

      pyodide.runPython(invalidateImports);
      let maybeCoroutine: PyProxy;

      try {
        maybeCoroutine = pyodide.runPython(mainContents);
      } catch (e) {
        if (e instanceof pyodide.ffi.PythonError) {
          reportException();
        } else {
          console.error(e);
          post({
            _type: "errored",
            error:
              "SystemError: Internal Pygame Arcade exception, check browser console for details",
          });
        }

        return;
      }

      if (maybeCoroutine && maybeCoroutine.type === "coroutine") {
        const webloop = pyodide.runPython(
          "import asyncio\nasyncio.get_running_loop()",
        );

        task = webloop.create_task(maybeCoroutine) as TaskLike;
        task.add_done_callback(handleCompletion);
        post({ _type: "taskStarted" });
      } else {
        post({ _type: "finished" });
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

    case "uploadFiles": {
      const pyo = pyodide;

      await Promise.all(
        message.files.map(async (file) => {
          pyo.FS.writeFile(
            joinPath([message.basePath, file.name]),
            await file.bytes(),
          );
        }),
      );

      listDir(pyo, message.basePath);

      break;
    }

    default: {
      assertNever(message);
    }
  }
};
