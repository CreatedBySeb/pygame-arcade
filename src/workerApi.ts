// --- Incoming Messages ---

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

export type IncomingWorkerMessage = RunMessage | SetCanvasMessage;

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

export type OutgoingWorkerMessage =
  | ReadyMessage
  | StderrMessage
  | StdoutMessage;
