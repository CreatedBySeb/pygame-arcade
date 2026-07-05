// --- Incoming Messages ---

import type { TypedArray } from "pyodide/ffi";

export interface CreateDirMessage {
  _type: "createDir";
  /** The directory path to create */
  path: string;
}

export interface CreateFileMessage {
  _type: "createFile";
  /** The contents of the created file */
  contents: string;
  /** The file path to create */
  path: string;
}

export interface ListContentsMessage {
  _type: "listContents";
  /** The directory path to list contents for */
  path: string;
}

export interface ReadFileMessage {
  _type: "readFile";
  /** The file path to read from */
  path: string;
}

export interface RunMessage {
  _type: "run";
}

export interface SetCanvasMessage {
  _type: "setCanvas";
  /** The offscreen canvas controlling the HTML canvas */
  canvas: OffscreenCanvas;
}

export interface SetInterruptMessage {
  _type: "setInterrupt";
  /** The buffer used to signal the interrupt */
  buffer: TypedArray;
}

export interface StopMessage {
  _type: "stop";
}

export type IncomingWorkerMessage =
  | CreateDirMessage
  | CreateFileMessage
  | ListContentsMessage
  | ReadFileMessage
  | RunMessage
  | SetCanvasMessage
  | SetInterruptMessage
  | StopMessage;

// --- Outgoing Messages ---

export interface ContentsListMessage {
  _type: "contentsList";
  /** The names of the child directories in the directory */
  directories: string[];
  /** The names of the files in the directory  */
  files: string[];
  /** The path to the directory the contents are listed for */
  path: string;
}

export interface FileContentsMessage {
  _type: "fileContents";
  /** The path of the file that was read */
  path: string;
  /** The contents read from the specified path */
  contents: string;
}

export interface ReadyMessage {
  _type: "ready";
}

export interface StderrMessage {
  _type: "stderr";
  /** The UTF-8 decoded text from the stderr */
  text: string;
}

export interface StdoutMessage {
  _type: "stdout";
  /** The UTF-8 decoded text from the stdout */
  text: string;
}

export interface TaskStartedMessage {
  _type: "taskStarted";
}

export type OutgoingWorkerMessage =
  | ContentsListMessage
  | FileContentsMessage
  | ReadyMessage
  | StderrMessage
  | StdoutMessage
  | TaskStartedMessage;

// --- Helpers ---

/** The root directory in the filesystem where project files are stored */
export const PROJECT_ROOT = "/project";

/**
 * A helper to ensure switch statements handle all cases
 * @param x The variable that should have all cases handled
 */
export function assertNever(x: never): void {
  throw new Error(`Case not handled: ${x}`);
}

/**
 * Gets the basename (final part) of a path
 * @param path The path to get the basename of
 */
export function getBaseName(path: string): string {
  const base = splitPath(path).at(-1);

  if (base === undefined) {
    throw new Error(`Path '${path}' has no parts`);
  }

  return base;
}

/**
 * Joins multiple paths or parts of paths together into one string
 * @param parts The path parts to join together
 * @returns The joined path as a single string
 */
export function joinPath(parts: string[]): string {
  return parts.join("/");
}

/**
 * Splits a path into an array of components in the same order
 * @param path The path to split into components
 * @returns An array of path components
 */
export function splitPath(path: string): string[] {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }

  // The root should just be an empty path, not a single empty value
  if (!path.length) {
    return [];
  }

  return path.split("/");
}
