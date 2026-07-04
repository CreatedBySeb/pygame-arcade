<script lang="ts" setup>
import Button from "primevue/button";
import Tree, { type TreeSelectionKeys } from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import { computed, onMounted, ref } from "vue";
import {
  fileSystem,
  loadingPaths,
  refreshContents,
  type DirectoryContents,
  type FSItem,
} from "../runtime";
import { getBaseName, PROJECT_ROOT } from "../workerApi";

function convertContentsToNodes(contents: DirectoryContents): TreeNode[] {
  return Object.values(contents)
    .sort(sortItems)
    .map((item) => {
      return {
        children:
          item.type === "directory"
            ? convertContentsToNodes(item.children)
            : undefined,
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

const loading = computed<boolean>(() => {
  return Object.values(fileSystem.value).length == 0;
});

const items = computed<TreeNode[]>(() => {
  return convertContentsToNodes(fileSystem.value);
});

const selectedItems = ref<TreeSelectionKeys>({});

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
      <Button @click="refresh">Refresh</Button>
    </div>
    <Tree
      :loading="loading"
      v-model:selection-keys="selectedItems"
      selection-mode="single"
      :value="items"
      @node-expand="loadNode"
    />
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
