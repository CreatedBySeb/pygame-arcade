<script lang="ts" setup>
import CreateFile from "@/components/dialogs/CreateFile.vue";
import CreateFolder from "@/components/dialogs/CreateFolder.vue";
import UploadFile from "@/components/dialogs/UploadFile.vue";
import { editedPath, focusEditor } from "@/editors";
import {
  fileSystem,
  loadingPaths,
  readFile,
  refreshContents,
  type DirectoryContents,
  type FSItem,
} from "@/runtime";
import {
  getBaseName,
  getExtension,
  PROJECT_ROOT,
  TEXT_EXTS,
} from "@/workerApi";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import { computed, onMounted, ref, watch } from "vue";

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
const uploadDialogVisible = ref<boolean>(false);

const loading = computed<boolean>(() => {
  return Object.values(fileSystem.value).length == 0;
});

const items = computed<TreeNode[]>(() => {
  return convertContentsToNodes(fileSystem.value);
});

const selectedItems = ref<Record<string, boolean>>({});

// Focus the editor when the selection changes
watch(selectedItems, async (selected) => {
  // We only allow 1 selection, so this is always the selected key
  const path = Object.keys(selected).pop();

  // If there is no selected path or it is already being edited
  if (!path || editedPath.value === path) {
    return;
  }

  const extension = getExtension(path);

  if (TEXT_EXTS.includes(extension ?? "")) {
    const contents = await readFile(path);
    focusEditor(path, contents);
  }
});

// If the edited path changes outside of selection, update selection
watch([editedPath, items], ([path, nodes]) => {
  // If there is no edited path or it is already selected
  if (!path || selectedItems.value[path]) return;

  // Get the node from the tree
  const node = nodes.find((item) => item.key === path);
  if (!node) return;

  const selection = Object.keys(selectedItems.value).pop();
  if (selection) {
    delete selectedItems.value[selection];
  }

  selectedItems.value[path] = true;
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
      <ButtonGroup>
        <Button
          :disabled="loading"
          icon="pi pi-upload"
          aria-label="Upload File"
          title="Upload File"
          @click="uploadDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-file-plus"
          aria-label="Create Text File"
          title="Create Text File"
          @click="fileDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-folder-plus"
          aria-label="Create Folder"
          title="Create Folder"
          @click="folderDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-sync"
          aria-label="Refresh Files"
          title="Refresh Files"
          @click="refresh"
        />
      </ButtonGroup>
    </div>
    <Tree
      :loading="loading"
      v-model:selection-keys="selectedItems"
      selection-mode="single"
      :value="items"
      @node-expand="loadNode"
    />

    <CreateFile v-model:visible="fileDialogVisible" />
    <CreateFolder v-model:visible="folderDialogVisible" />
    <UploadFile v-model:visible="uploadDialogVisible" />
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
