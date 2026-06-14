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
import { useProgram } from "../program";

const containerRef = useTemplateRef("editor");
const programRef = useProgram();

const updateListener = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return;
  programRef.value = update.view.state.doc.toString();
});

let startState = EditorState.create({
  doc: Text.of(programRef.value.split("\n")),
  extensions: [
    lineNumbers(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of(defaultKeymap),
    python(),
    updateListener,
  ],
});

onMounted(() => {
  new EditorView({
    state: startState,
    parent: containerRef.value!,
  });
});
</script>

<template>
  <div id="editor" ref="editor"></div>
</template>

<style>
#editor {
  display: flex;
  flex: 1 1 100%;
  flex-direction: column;

  & > div {
    flex: 1 0 100%;
  }
}
</style>
