<script setup lang="ts">
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { onMounted, useTemplateRef } from "vue";

let startState = EditorState.create({
  doc: "Hello World",
  extensions: [keymap.of(defaultKeymap), python()],
});

const containerRef = useTemplateRef("editor-container");

onMounted(() => {
  console.log(`Mounting editor on ${containerRef.value}`);

  let view = new EditorView({
    state: startState,
    parent: containerRef.value!,
  });
});
</script>

<template>
  <div id="editor-container" ref="editor-container"></div>
</template>

<style>
#editor-container {
  display: flex;
  height: 100%;
  width: 100%;

  > div {
    flex: 1 0 100%;
  }
}
</style>
