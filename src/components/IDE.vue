<script setup lang="ts">
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { interrupt, pyodideLoaded, runProgram } from "../runtime.ts";
import Console from "./Console.vue";
import Editor from "./Editor.vue";
import FileBrowser from "./FileBrowser.vue";
import Window from "./Window.vue";
</script>

<template>
  <Splitter id="ide">
    <SplitterPanel :size="70" :min-size="50">
      <Splitter>
        <SplitterPanel :size="25" :min-size="15">
          <FileBrowser></FileBrowser>
        </SplitterPanel>
        <SplitterPanel :size="75" :min-size="60">
          <Splitter layout="vertical">
            <SplitterPanel :size="75" :min-size="30">
              <Editor></Editor>
            </SplitterPanel>
            <SplitterPanel :size="25" :min-size="20">
              <Console></Console>
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
    <SplitterPanel :size="30" :min-size="20">
      <div>
        <div class="control-buttons">
          <Button :disabled="!pyodideLoaded" @click="runProgram">
            {{ pyodideLoaded ? "Run it!" : "Loading Python..." }}
          </Button>
          <Button
            severity="secondary"
            :disabled="!pyodideLoaded"
            @click="interrupt"
            >Stop</Button
          >
        </div>
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

  & .control-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    padding: 0.5rem;
  }
}
</style>
