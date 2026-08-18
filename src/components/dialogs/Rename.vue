<script setup lang="ts">
import { useStrippedPath } from "@/composables";
import { closeEditor, editedPath, focusEditor } from "@/editors";
import { readFile, renamePath } from "@/runtime";
import { joinPath, splitPath } from "@/worker/api";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { computed, ref } from "vue";

const props = defineProps<{
  directory: boolean;
  originalPath?: string;
}>();

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

const newName = ref<string>("");
const friendlyPath = useStrippedPath(() => props.originalPath ?? "");

const targetNoun = computed<string>(() => {
  return props.directory ? "Folder" : "File";
});

const isValid = computed<boolean>(() => {
  const value = newName.value;

  if (value.length < 1 || value.includes(" ")) {
    return false;
  }

  return true;
});

async function rename(_: SubmitEvent): Promise<void> {
  if (!props.originalPath || !isValid.value) {
    return;
  }

  const newPath =
    "/" +
    joinPath([...splitPath(props.originalPath).slice(0, -1), newName.value]);

  if (!props.directory) {
    const contents = await readFile(props.originalPath);
    focusEditor(newPath, contents);
    closeEditor(props.originalPath);
  } else if (editedPath.value?.includes(props.originalPath)) {
    const contents = await readFile(editedPath.value);
    const relativePath = splitPath(
      editedPath.value.replace(props.originalPath, ""),
    );

    closeEditor(editedPath.value);
    focusEditor(joinPath([newPath, ...relativePath]), contents);
  }

  renamePath(props.originalPath, newName.value);

  newName.value = "";
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    :header="`Rename ${targetNoun}`"
  >
    <form @submit.prevent="rename">
      <Message size="small" variant="simple" severity="secondary">
        {{ targetNoun }} will be renamed from <code>{{ friendlyPath }}</code>
      </Message>
      <div class="form-field">
        <label for="name">Name</label>
        <InputText
          id="name"
          :placeholder="directory ? 'folder' : 'file.py'"
          v-model="newName"
          autofocus
          :invalid="newName !== '' && !isValid"
        />
      </div>
      <div class="spaced-buttons">
        <Button
          severity="secondary"
          variant="outlined"
          @click="visible = false"
        >
          Cancel
        </Button>
        <Button type="submit" :disabled="!originalPath || !isValid">
          Rename
        </Button>
      </div>
    </form>
  </Dialog>
</template>
