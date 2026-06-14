import { loadPyodide, type PyodideAPI } from "pyodide";
import { computed, ref, type Ref } from "vue";

const pyodideRef = ref<PyodideAPI | null>(null);
const stdoutRef = ref("");
const utf8Decoder = new TextDecoder();

export function clearOutput() {
  stdoutRef.value = "";
}

export const pyodideLoaded = computed(() => {
  return pyodideRef.value != null;
});

export async function usePyodide(): Promise<PyodideAPI> {
  if (!pyodideRef.value) {
    pyodideRef.value = await loadPyodide();
    pyodideRef.value.setStdout({ write: updateStdout });
  }

  return pyodideRef.value;
}

export function useStdout(): Ref<string> {
  return stdoutRef;
}

function updateStdout(buffer: Uint8Array): number {
  const str = utf8Decoder.decode(buffer);
  stdoutRef.value = stdoutRef.value + str;
  return buffer.length;
}
