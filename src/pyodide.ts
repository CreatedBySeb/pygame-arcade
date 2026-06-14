import { loadPyodide, type PyodideAPI } from "pyodide";

let pyodide: PyodideAPI | null = null;

export async function usePyodide(): Promise<PyodideAPI> {
  if (!pyodide) {
    pyodide = await loadPyodide();
  }

  return pyodide;
}
