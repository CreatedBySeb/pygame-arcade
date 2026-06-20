<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
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
    history(),
    indentOnInput(),
    indentUnit.of("    "),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]),
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
  height: 100%;
  flex-direction: column;
  width: 100%;

  & > div {
    flex: 1 0 100%;
  }

  & .cm-editor {
    height: 100%;

    & .cm-scroller {
      overflow: auto;
    }
  }
}
</style>
