<script setup lang="ts">
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, Text } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { onMounted, useTemplateRef } from "vue";
import { usePyodide } from "../pyodide";

let doc = Text.of([`print("Hello, world!")`]);

let startState = EditorState.create({
  doc,
  extensions: [
    lineNumbers(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of(defaultKeymap),
    python(),
  ],
});

const containerRef = useTemplateRef("editor-container");

onMounted(() => {
  console.log(`Mounting editor on ${containerRef.value}`);

  new EditorView({
    state: startState,
    parent: containerRef.value!,
  });
});

async function run() {
  const pyodide = await usePyodide();

  try {
    await pyodide.runPythonAsync(startState.doc.toString());
  } catch (e) {
    if (e instanceof pyodide.ffi.PythonError) {
      alert("Failed to run due to the following error:\n" + e.message);
    }
  }
}
</script>

<template>
  <div id="editor-container" ref="editor-container">
    <button @click="run">Run it!</button>
  </div>
</template>

<style>
#editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  > div {
    flex: 1 1 100%;
  }
}
</style>
