<script setup lang="ts">
import { createDir } from "@/runtime";
import type { MessageProps } from "primevue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { computed, ref } from "vue";

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

const newFolderName = ref<string>("");

const isValid = computed<boolean>(() => {
  const value = newFolderName.value;

  if (value.length < 1 || value.includes(" ") || value.endsWith(".py")) {
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

  createDir(newFolderName.value);
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
      <div class="form-field">
        <label for="name">Name</label>
        <InputText
          id="name"
          placeholder="dir"
          v-model="newFolderName"
          :invalid="newFolderName !== '' && !isValid"
        />
      </div>
      <Message size="small" :severity="hintSeverity" variant="simple">
        Folder names must not contain spaces or end with <code>.py</code>.
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
