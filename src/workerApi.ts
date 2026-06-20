// --- Incoming Messages ---

import type { TypedArray } from "pyodide/ffi";

export interface RunMessage {
  _type: "run";
  /** The text of the program to run */
  code: string;
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
  | RunMessage
  | SetCanvasMessage
  | SetInterruptMessage
  | StopMessage;

// --- Outgoing Messages ---

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
  | ReadyMessage
  | StderrMessage
  | StdoutMessage
  | TaskStartedMessage;
