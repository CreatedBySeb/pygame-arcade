<script setup lang="ts">
import { useStrippedPath } from "@/composables";
import { createDir } from "@/runtime";
import { getExtension, TEXT_EXTS } from "@/workerApi";
import type { MessageProps } from "primevue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { computed, ref } from "vue";

const props = defineProps<{
  basePath: string;
}>();

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

const newFolderName = ref<string>("");
const friendlyPath = useStrippedPath(() => props.basePath);

const isValid = computed<boolean>(() => {
  const value = newFolderName.value;

  if (
    value.length < 1 ||
    value.includes(" ") ||
    TEXT_EXTS.includes(getExtension(value) ?? "")
  ) {
    return false;
  }

  return true;
});

const hintSeverity = computed<MessageProps["severity"]>(() => {
  if (!newFolderName.value || isValid.value) {
    return "secondary";
  } else {
    return "error";
  }
});

function createFolder(_: SubmitEvent): void {
  if (!isValid.value) {
    return;
  }

  createDir(props.basePath, newFolderName.value);
  newFolderName.value = "";
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    header="Create Folder"
  >
    <form @submit.prevent="createFolder">
      <Message size="small" variant="simple" severity="secondary">
        Folder will be created in <code>{{ friendlyPath }}</code>
      </Message>
      <div class="form-field">
        <label for="name">Name</label>
        <InputText
          id="name"
          placeholder="dir"
          v-model="newFolderName"
          autofocus
          :invalid="newFolderName !== '' && !isValid"
        />
      </div>
      <Message size="small" :severity="hintSeverity" variant="simple">
        Folder names must not contain spaces or end with a file extension.
      </Message>
      <div class="spaced-buttons">
        <Button
          severity="secondary"
          variant="outlined"
          @click="visible = false"
        >
          Cancel
        </Button>
        <Button type="submit" :disabled="!isValid">Create</Button>
      </div>
    </form>
  </Dialog>
</template>
