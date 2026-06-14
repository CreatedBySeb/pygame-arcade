import { loadPyodide, type PyodideAPI } from "pyodide";
import { computed, ref, type Ref } from "vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const pyodideRef = ref<PyodideAPI | null>(null);
const stdoutRef = ref("");
const utf8Decoder = new TextDecoder();

export function clearOutput() {
  stdoutRef.value = "";
}

export const pyodideLoaded = computed(() => {
  return pyodideRef.value != null;
});

export function setCanvas(canvas: HTMLCanvasElement): void {
  if (pyodideRef.value) {
    pyodideRef.value.canvas.setCanvas2D(canvas);
    fixSDL(pyodideRef.value);
  }

  canvasRef.value = canvas;
}

export async function usePyodide(): Promise<PyodideAPI> {
  if (!pyodideRef.value) {
    const pyodide = await loadPyodide({
      indexURL: `${import.meta.env.BASE_URL}assets/pyodide`,
      packageBaseUrl: `${window.location.protocol}//${window.location.host}/assets/wheels/`,
    });
    await pyodide.loadPackage(["pygame-ce"]);
    pyodide.setStdout({ write: updateStdout });

    if (canvasRef.value) {
      pyodide.canvas.setCanvas2D(canvasRef.value);
      fixSDL(pyodide);
    }

    pyodideRef.value = pyodide;
  }

  return pyodideRef.value;
}

export function useStdout(): Ref<string> {
  return stdoutRef;
}

function fixSDL(pyodide: PyodideAPI): void {
  (pyodide as any)._api._skip_unwind_fatal_error = true;
}

function updateStdout(buffer: Uint8Array): number {
  const str = utf8Decoder.decode(buffer);
  stdoutRef.value = stdoutRef.value + str;
  return buffer.length;
}
