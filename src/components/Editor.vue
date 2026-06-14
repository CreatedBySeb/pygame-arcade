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

let view: EditorView | null = null;

const decoder = new TextDecoder();

const containerRef = useTemplateRef("editor-container");
const stdoutRef = useTemplateRef("console-stdout");

onMounted(() => {
  console.log(`Mounting editor on ${containerRef.value}`);

  view = new EditorView({
    state: startState,
    parent: containerRef.value!,
  });
});

function updateStdout(buffer: Uint8Array): number {
  const stdout = stdoutRef.value;

  if (stdout) {
    const str = decoder.decode(buffer);
    stdout.innerText += str;
    stdout.parentElement!.scrollTo({
      top: stdout.scrollHeight,
      behavior: "instant",
    });
  }

  return buffer.length;
}

async function run() {
  stdoutRef.value!.innerText = "";

  const pyodide = await usePyodide();
  pyodide.setStdout({
    write: updateStdout,
  });

  try {
    await pyodide.runPythonAsync(view!.state.doc.toString());
  } catch (e) {
    if (e instanceof pyodide.ffi.PythonError) {
      alert("Failed to run due to the following error:\n" + e.message);
    }
  }
}
</script>

<template>
  <div id="editor">
    <button @click="run">Run it!</button>
    <div id="editor-container" ref="editor-container"></div>
    <div id="editor-console">
      <pre id="console-stdout" ref="console-stdout"></pre>
    </div>
  </div>
</template>

<style>
#editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

#editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  > div {
    flex: 1 1 100%;
  }
}

#editor-console {
  box-sizing: border-box;
  height: 20em;
  overflow: scroll;
  padding: 0.5em 1em;
  width: 100%;
}
</style>
