<script setup lang="ts">
import { pyodideLoaded, runProgram } from "../pyodide.ts";
import Console from "./Console.vue";
import Editor from "./Editor.vue";
import Window from "./Window.vue";
</script>

<template>
  <div id="ide">
    <div id="main-area">
      <Editor></Editor>
      <Console></Console>
    </div>
    <div id="game-area">
      <button :disabled="!pyodideLoaded" @click="runProgram">
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
