<script setup lang="ts">
import { focusedEditor, focusEditor } from "@/editors";
import { pyodideLoaded, readFile } from "@/runtime";
import { joinPath, PROJECT_ROOT } from "@/workerApi";
import { EditorView } from "@codemirror/view";
import { onMounted, ref, useTemplateRef, watch } from "vue";

const containerRef = useTemplateRef("editor");
const mountedRef = ref<boolean>(false);

let view: EditorView | null = null;

watch(focusedEditor, (state) => {
  if (state && view && state !== view.state) {
    view.setState(state);
  }
});

watch([mountedRef, pyodideLoaded], async () => {
  if (!view && mountedRef.value && pyodideLoaded.value) {
    const mainPath = joinPath([PROJECT_ROOT, "main.py"]);
    const mainContents = await readFile(mainPath);
    focusEditor(mainPath, mainContents);

    view = new EditorView({
      state: focusedEditor.value!,
      parent: containerRef.value!,
    });
  }
});

onMounted(() => {
  mountedRef.value = true;
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
    color: initial;
    height: 100%;

    & .cm-scroller {
      overflow: auto;
    }
  }
}
</style>
