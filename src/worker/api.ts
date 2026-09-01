// --- Incoming Messages ---

import type { SomeEventData } from "@/worker/events";
import type { TypedArray } from "pyodide/ffi";

export interface CanvasResizeMessage {
  _type: "canvasResize";
  /** The bounding client rect of the canvas */
  boundingRect: DOMRect;
}

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

export interface DeleteMessage {
  _type: "delete";
  /** The path to the file or directory to delete */
  path: string;
}

export interface EraseProjectMessage {
  _type: "eraseProject";
}

export interface ExportProjectMessage {
  _type: "exportProject";
}

export interface ImportProjectMessage {
  _type: "importProject";
  /** The zip file to import */
  file: File;
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

export interface RelayEventMessage {
  _type: "relayEvent";
  /** The event object that was relayed */
  event: SomeEventData;
}

export interface RenameMessage {
  _type: "rename";
  /** The new name */
  name: string;
  /** The path to the file or directory to rename */
  path: string;
}

export interface RunMessage {
  _type: "run";
  /** The `state` of the associated `AudioContext` */
  audioState: AudioContextState;
  /** The `baseLatency` of the associated `AudioContext` */
  baseLatency: number;
  /** The `sampleRate` of the associated `AudioContext` */
  sampleRate: number;
  /** A shared buffer for signalling between audio and worker threads */
  signalBuffer: Int32Array;
}

export interface SetCanvasMessage {
  _type: "setCanvas";
  /** The bounding client rect of the canvas */
  boundingRect: DOMRect;
  /** The offscreen canvas controlling the HTML canvas */
  canvas: OffscreenCanvas;
  /** The size of the screen */
  screenSize: [number, number];
}

export interface SetInterruptMessage {
  _type: "setInterrupt";
  /** The buffer used to signal the interrupt */
  buffer: TypedArray;
}

export interface StopMessage {
  _type: "stop";
}

export interface UploadFilesMessage {
  _type: "uploadFiles";
  /** The path the files should be uploaded to */
  basePath: string;
  /** The files that should be uploaded */
  files: File[];
}

export type IncomingWorkerMessage =
  | CanvasResizeMessage
  | CreateDirMessage
  | CreateFileMessage
  | DeleteMessage
  | EraseProjectMessage
  | ExportProjectMessage
  | ImportProjectMessage
  | ListContentsMessage
  | ReadFileMessage
  | RelayEventMessage
  | RenameMessage
  | RunMessage
  | SetCanvasMessage
  | SetInterruptMessage
  | StopMessage
  | UploadFilesMessage;

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

export interface ErroredMessage {
  _type: "errored";
  /** Information about the error that occurred */
  error: string;
}

export interface ExportedProjectMessage {
  _type: "exportedProject";
  /** The generated zip file containing the project */
  file: File;
}

export interface FileContentsMessage {
  _type: "fileContents";
  /** The path of the file that was read */
  path: string;
  /** The contents read from the specified path */
  contents: string;
}

export interface FinishedMessage {
  _type: "finished";
}

export interface ReadyMessage {
  _type: "ready";
}

export interface RequestPointerLockMessage {
  _type: "requestPointerLock";
  /** The options to pass to the `requestPointerLock` call */
  options: PointerLockOptions;
}

export interface StartAudioMessage {
  _type: "startAudio";
  /** The audio data buffers to use */
  buffers: Float32Array[];
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
  | ErroredMessage
  | ExportedProjectMessage
  | FileContentsMessage
  | FinishedMessage
  | ReadyMessage
  | RequestPointerLockMessage
  | StartAudioMessage
  | StderrMessage
  | StdoutMessage
  | TaskStartedMessage;

// --- Helpers ---

/** The file extensions for editable text files */
export const TEXT_EXTS = [
  "py",
  "txt",
  "ini",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "toml",
];

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

/**
 * Strips PROJECT_ROOT from the front of the path if present, "/" will be
 * returned for the PROJECT_ROOT
 *
 * @param path The path to strip the leading project root from
 * @returns The stripped path
 */
export function stripPath(path: string): string {
  return path.replace(PROJECT_ROOT, "") || "/";
}

/**
 * Get the extension of a file from its path
 * @param path A path to a file
 * @returns The extension if one was found, otherwise null
 */
export function getExtension(path: string): string | null {
  const separated = path.split(".");

  // No extension
  if (separated.length < 2) {
    return null;
  }

  return separated[separated.length - 1];
}
