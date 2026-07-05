<script lang="ts" setup>
import Button from "primevue/button";
import Tree, { type TreeSelectionKeys } from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import { computed, onMounted, ref, watch } from "vue";
import { focusEditor } from "../editors.ts";
import {
  fileSystem,
  loadingPaths,
  readFile,
  refreshContents,
  type DirectoryContents,
  type FSItem,
} from "../runtime";
import { getBaseName, PROJECT_ROOT } from "../workerApi";
import CreateFolder from "./dialogs/CreateFolder.vue";
import CreatePythonFile from "./dialogs/CreatePythonFile.vue";

function convertContentsToNodes(contents: DirectoryContents): TreeNode[] {
  return Object.values(contents)
    .sort(sortItems)
    .map((item) => {
      return {
        children:
          item.type === "directory"
            ? convertContentsToNodes(item.children)
            : undefined,
        icon: item.type === "directory" ? "pi pi-folder" : "pi pi-file",
        key: item.path,
        label: getBaseName(item.path),
        leaf: item.type !== "directory",
        loading:
          item.type === "directory" && loadingPaths.value.includes(item.path),
      };
    });
}

function sortItems(a: FSItem, b: FSItem): number {
  if (a.type !== b.type) {
    return a.type === "directory" ? -1 : 1;
  } else {
    return a.path.localeCompare(b.path);
  }
}

const fileDialogVisible = ref<boolean>(false);
const folderDialogVisible = ref<boolean>(false);

const loading = computed<boolean>(() => {
  return Object.values(fileSystem.value).length == 0;
});

const items = computed<TreeNode[]>(() => {
  return convertContentsToNodes(fileSystem.value);
});

const selectedItems = ref<TreeSelectionKeys>({});

watch(selectedItems, async (keys) => {
  // We only allow 1 selection, so this is always the selected key
  const path = Object.keys(keys).pop();

  if (path) {
    const contents = await readFile(path);
    focusEditor(path, contents);
  }
});

function loadNode(node: TreeNode) {
  refreshContents(node.key);
}

function refresh() {
  refreshContents(PROJECT_ROOT);
}

onMounted(() => refresh());
</script>

<template>
  <div id="file-browser">
    <div id="file-browser-controls">
      <span>File Browser</span>
      <div class="spaced-buttons">
        <Button
          :disabled="loading"
          icon="pi pi-file-plus"
          aria-label="Create Python File"
          @click="fileDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-folder-plus"
          aria-label="Create Folder"
          @click="folderDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-sync"
          aria-label="Refresh Files"
          @click="refresh"
        />
      </div>
    </div>
    <Tree
      :loading="loading"
      v-model:selection-keys="selectedItems"
      selection-mode="single"
      :value="items"
      @node-expand="loadNode"
    />

    <CreatePythonFile v-model:visible="fileDialogVisible" />
    <CreateFolder v-model:visible="folderDialogVisible" />
  </div>
</template>

<style>
#file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;

  & #file-browser-controls {
    display: flex;
    flex: 0 0 1em;
    justify-content: space-between;
    padding: 0.5rem;
  }
}
</style>
