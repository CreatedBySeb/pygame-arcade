<script lang="ts" setup>
import CreateFile from "@/components/dialogs/CreateFile.vue";
import CreateFolder from "@/components/dialogs/CreateFolder.vue";
import Rename from "@/components/dialogs/Rename.vue";
import UploadFile from "@/components/dialogs/UploadFile.vue";
import { closeEditor, editedPath, focusEditor } from "@/editors";
import {
  deletePath,
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
  joinPath,
  PROJECT_ROOT,
  splitPath,
  TEXT_EXTS,
} from "@/worker/api";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import Tree, {
  type TreeExpandedKeys,
  type TreeSelectionKeys,
} from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import { useConfirm } from "primevue/useconfirm";
import { computed, ref, watch } from "vue";

const confirm = useConfirm();

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
const renameDialogVisible = ref<boolean>(false);
const uploadDialogVisible = ref<boolean>(false);

const loading = computed<boolean>(() => {
  return Object.values(fileSystem.value).length == 0;
});

const items = computed<TreeNode[]>(() => {
  return convertContentsToNodes(fileSystem.value);
});

const expandedKeys = ref<TreeExpandedKeys>({});
const selectedItems = ref<TreeSelectionKeys>({});

const selectedPath = computed<string | undefined>({
  get: () => Object.keys(selectedItems.value).pop(),
  set(value) {
    const current = selectedPath.value;

    if (current) {
      delete selectedItems.value[current];
    }

    if (value) {
      selectedItems.value[value] = true;
    }
  },
});

// Either the selected directory or the parent of the selected file
const selectedDir = computed<string>(() => {
  const selectedItem = Object.keys(selectedItems.value).pop();
  if (!selectedItem) {
    // If there's no selection, use the project root
    return PROJECT_ROOT;
  }

  const ext = getExtension(selectedItem);
  if (ext) {
    // If it has an extension, we assume its a file and get the parent directory
    return "/" + splitPath(selectedItem).slice(0, -1).join("/");
  }

  // Otherwise, it's a directory and we return as is
  return selectedItem;
});

function toggleDir(path: string): void {
  const wasToggled = expandedKeys.value[path] ?? false;
  expandedKeys.value[path] = !wasToggled;

  // Load the contents of an expanded directory
  if (!wasToggled) {
    refreshContents(path);
  }
}

function deleteSelected(): void {
  const path = selectedPath.value;
  if (!path) return;

  confirm.require({
    accept: () => {
      deletePath(path);
      closeEditor(path);
      invalidateExpansions(path);
    },
    acceptProps: {
      label: "Confirm Delete",
      severity: "danger",
    },
    blockScroll: true,
    header: "Confirm Delete",
    icon: "pi pi-exclamation-triangle",
    message: `Are you sure you want to delete '${path}'?`,
    rejectProps: {
      label: "Cancel",
      severity: "secondary",
    },
  });
}

function emptyClick(): void {
  selectedPath.value = undefined;
}

function onDeselect(node: TreeNode): void {
  // We don't actually deselect here to align with common IDE behaviour

  if (!node.leaf) {
    // Toggle a dir on 'deselect' (click when already selected)
    toggleDir(node.key);
  }
}

function invalidateExpansions(path: string): void {
  // Remove any expanded keys under a path (e.g. for rename or delete)
  for (const key of Object.keys(expandedKeys.value)) {
    if (key.startsWith(path)) {
      delete expandedKeys.value[key];
    }
  }
}

async function onSelect(node: TreeNode): Promise<void> {
  const path = node.key;

  // Select new item
  selectedPath.value = path;

  // If there is no selected path or it is already being edited
  if (!path || editedPath.value === path) {
    return;
  }

  const extension = getExtension(path);

  if (!node.leaf) {
    // Toggle a dir when selected
    toggleDir(path);
  } else if (TEXT_EXTS.includes(extension ?? "")) {
    // Focus the editor when a text file is selected
    const contents = await readFile(path);
    focusEditor(path, contents);
  }
}

function renameSelected(): void {
  const path = selectedPath.value;

  if (path) {
    renameDialogVisible.value = true;
  }
}

// If the edited path changes outside of selection, update selection
watch(editedPath, (path) => {
  // If there is no edited path or it is already selected
  if (!path || selectedItems.value[path]) return;

  // Ensure all intermediate directories are expanded
  const parts = splitPath(path);
  parts.slice(1, -1).forEach((_, i, array) => {
    const dirPath = joinPath([PROJECT_ROOT, ...array.slice(0, i + 1)]);
    expandedKeys.value[dirPath] = true;
  });

  // Set the selection
  selectedPath.value = path;
});

function loadNode(node: TreeNode) {
  refreshContents(node.key);
}

function refresh() {
  refreshContents(PROJECT_ROOT);

  for (const key of Object.keys(expandedKeys.value)) {
    refreshContents(key);
  }
}
</script>

<template>
  <div id="file-browser">
    <div id="file-browser-controls">
      <ButtonGroup>
        <Button
          :disabled="loading"
          icon="pi pi-upload"
          aria-label="Upload File"
          title="Upload File"
          size="small"
          @click="uploadDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-file-plus"
          aria-label="Create Text File"
          title="Create Text File"
          size="small"
          @click="fileDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-folder-plus"
          aria-label="Create Folder"
          title="Create Folder"
          size="small"
          @click="folderDialogVisible = true"
        />
        <Button
          :disabled="loading"
          icon="pi pi-sync"
          aria-label="Refresh Files"
          title="Refresh Files"
          size="small"
          @click="refresh"
        />
      </ButtonGroup>
      <ButtonGroup>
        <Button
          :disabled="loading || !selectedPath"
          icon="pi pi-pencil"
          aria-label="Rename File/Folder"
          title="Rename File/Folder"
          size="small"
          @click="renameSelected"
        />
        <Button
          :disabled="loading || !selectedPath"
          icon="pi pi-trash"
          aria-label="Delete File/Folder"
          title="Delete File/Folder"
          size="small"
          severity="danger"
          @click="deleteSelected"
        />
      </ButtonGroup>
    </div>
    <div class="tree-scroller" @click="emptyClick">
      <Tree
        :loading="loading"
        v-model:expanded-keys="expandedKeys"
        :selection-keys="selectedItems"
        selection-mode="single"
        :value="items"
        @click.stop
        @node-expand="loadNode"
        @node-select="onSelect"
        @node-unselect="onDeselect"
      />
    </div>

    <CreateFile v-model:visible="fileDialogVisible" :base-path="selectedDir" />
    <CreateFolder
      v-model:visible="folderDialogVisible"
      :base-path="selectedDir"
    />
    <UploadFile
      v-model:visible="uploadDialogVisible"
      :base-path="selectedDir"
    />
    <Rename
      v-model:visible="renameDialogVisible"
      :original-path="selectedPath!"
      :directory="selectedPath == selectedDir"
      @confirmed="invalidateExpansions"
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
    gap: 0.5rem;
    justify-content: center;
    padding: 0.5rem;
    text-align: center;
  }

  & .tree-scroller {
    flex: 1 1;
    overflow-y: scroll;

    & > .p-tree {
      margin-bottom: 2rem;
    }
  }
}
</style>
