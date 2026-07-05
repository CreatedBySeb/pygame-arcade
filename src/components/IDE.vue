<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";
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
        <div id="control-buttons" class="spaced-buttons">
          <Button
            :disabled="!pyodideLoaded"
            icon="pi pi-play"
            label="Run it!"
            @click="runProgram"
          />
          <Button
            severity="secondary"
            :disabled="!pyodideLoaded"
            icon="pi pi-stop"
            label="Stop"
            @click="interrupt"
          />
        </div>
        <Message v-show="!pyodideLoaded" severity="secondary">
          Loading Python...
        </Message>
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

  & #control-buttons {
    padding: 0.5rem;
  }

  & .p-message {
    margin: 0.5rem;
  }
}
</style>
