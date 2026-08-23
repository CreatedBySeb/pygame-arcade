<script setup lang="ts">
import { focusedEditor, focusEditor } from "@/editors";
import { pyodideLoaded, readFile } from "@/runtime";
import { joinPath, PROJECT_ROOT } from "@/worker/api";
import { EditorView } from "@codemirror/view";
import { onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

const containerRef = useTemplateRef("editor");
const mountedRef = ref<boolean>(false);
const viewRef = shallowRef<EditorView | null>(null);

watch(focusedEditor, (state) => {
  if (state === null) {
    viewRef.value?.destroy();
    viewRef.value = null;
  } else if (!pyodideLoaded.value) {
    // Don't allow new views without Pyodide loaded but do allow closing
    return;
  } else if (!viewRef.value) {
    viewRef.value = new EditorView({
      state,
      parent: containerRef.value!,
    });
  } else if (state !== viewRef.value.state) {
    viewRef.value.setState(state);
  }
});

watch([mountedRef, pyodideLoaded], async () => {
  if (!viewRef.value && mountedRef.value && pyodideLoaded.value) {
    const mainPath = joinPath([PROJECT_ROOT, "main.py"]);
    const mainContents = await readFile(mainPath);
    focusEditor(mainPath, mainContents);

    viewRef.value = new EditorView({
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
  <div id="editor" ref="editor">
    <div v-if="!viewRef" class="no-editor">
      <span>No file open</span>
      <span>Select or create a file from the panel on the left</span>
    </div>
  </div>
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

  & .no-editor {
    align-items: center;
    color: var(--p-button-secondary-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    line-height: 100%;
    text-align: center;

    > span:first-child {
      font-size: 2rem;
    }
  }
}
</style>
