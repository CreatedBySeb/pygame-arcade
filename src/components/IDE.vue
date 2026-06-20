<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { pyodideLoaded, runProgram } from "../pyodide.ts";
import Console from "./Console.vue";
import Editor from "./Editor.vue";
import Window from "./Window.vue";
</script>

<template>
  <Splitter id="ide">
    <SplitterPanel :size="70" :min-size="50">
      <Splitter id="main-area" layout="vertical">
        <SplitterPanel :size="75" :min-size="30">
          <Editor></Editor>
        </SplitterPanel>
        <SplitterPanel :size="25" :min-size="20">
          <Console></Console
        ></SplitterPanel>
      </Splitter>
    </SplitterPanel>
    <SplitterPanel :size="30" :min-size="25">
      <div id="game-area">
        <button :disabled="!pyodideLoaded" @click="runProgram">
          {{ pyodideLoaded ? "Run it!" : "Loading Python..." }}
        </button>
        <Window></Window>
      </div>
    </SplitterPanel>
  </Splitter>
</template>

<style>
#ide {
  display: flex;
  height: 100%;
  width: 100%;

  & .p-splitter-gutter {
    background-color: var(--accent-color);
  }
}
</style>
