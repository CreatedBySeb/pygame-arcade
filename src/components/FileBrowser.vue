<script lang="ts" setup>
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Tree, { type TreeSelectionKeys } from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import { computed, onMounted, ref } from "vue";
import {
  createDir,
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

const dialogVisible = ref<boolean>(false);
const newFolderName = ref<string>("");

const loading = computed<boolean>(() => {
  return Object.values(fileSystem.value).length == 0;
});

const items = computed<TreeNode[]>(() => {
  return convertContentsToNodes(fileSystem.value);
});

const selectedItems = ref<TreeSelectionKeys>({});

function createFolder(_: SubmitEvent) {
  createDir(newFolderName.value);
  newFolderName.value = "";
  dialogVisible.value = false;
}

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
        <Button :disabled="loading" @click="dialogVisible = true">
          New Folder
        </Button>
        <Button :disabled="loading" @click="refresh">Refresh</Button>
      </div>
    </div>
    <Tree
      :loading="loading"
      v-model:selection-keys="selectedItems"
      selection-mode="single"
      :value="items"
      @node-expand="loadNode"
    />

    <Dialog
      v-model:visible="dialogVisible"
      dismissable-mask
      modal
      :draggable="false"
      header="Create Folder"
    >
      <form @submit.prevent="createFolder">
        <div class="form-field">
          <label for="name">Name</label>
          <InputText id="name" placeholder="dir" v-model="newFolderName" />
        </div>
        <div class="spaced-buttons">
          <Button
            severity="secondary"
            variant="outlined"
            @click="dialogVisible = false"
          >
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Dialog>
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
