<script setup lang="ts">
import { onMounted } from "vue";
import { useProgram } from "../program.ts";
import { clearOutput, pyodideLoaded, usePyodide } from "../pyodide.ts";
import Console from "./Console.vue";
import Editor from "./Editor.vue";
import Window from "./Window.vue";

const programRef = useProgram();

async function run() {
  clearOutput();
  const pyodide = await usePyodide();

  try {
    await pyodide.runPythonAsync(programRef.value);
  } catch (e) {
    if (e instanceof pyodide.ffi.PythonError) {
      alert("Failed to run due to the following error:\n" + e.message);
    }
  }
}

onMounted(() => {
  usePyodide();
});
</script>

<template>
  <div id="ide">
    <div id="main-area">
      <Editor></Editor>
      <Console></Console>
    </div>
    <div id="game-area">
      <button :disabled="!pyodideLoaded" @click="run">
        {{ pyodideLoaded ? "Run it!" : "Loading Python..." }}
      </button>
      <Window></Window>
    </div>
  </div>
</template>

<style>
#ide {
  display: flex;
  height: 100%;
  width: 100%;

  & > div {
    display: flex;
    flex-direction: column;
  }
}

#main-area {
  width: 70%;
}

#game-area {
  width: 30%;
}
</style>
