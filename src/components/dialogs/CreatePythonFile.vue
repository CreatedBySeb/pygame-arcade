<script setup lang="ts">
import type { MessageProps } from "primevue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { computed, ref } from "vue";
import { createFile } from "../../runtime";

const INITIAL_CONTENTS: string = `\
def my_func() -> None:
  # Do something
`;

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

const newFileName = ref<string>("");

const isValid = computed<boolean>(() => {
  const value = newFileName.value;

  if (value.length < 1 || value.includes(" ") || !value.endsWith(".py")) {
    return false;
  }

  return true;
});

const hintSeverity = computed<MessageProps["severity"]>(() => {
  if (!newFileName.value || isValid.value) {
    return "secondary";
  } else {
    return "error";
  }
});

function createPythonFile(_: SubmitEvent): void {
  if (!isValid.value) {
    return;
  }

  createFile(newFileName.value, INITIAL_CONTENTS);
  newFileName.value = "";
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    header="Create Python File"
  >
    <form @submit.prevent="createPythonFile">
      <div class="form-field">
        <label for="name">Name</label>
        <InputText
          id="name"
          placeholder="file.py"
          v-model="newFileName"
          :invalid="newFileName !== '' && !isValid"
        />
      </div>
      <Message size="small" :severity="hintSeverity" variant="simple">
        File names must not contain spaces and must end with <code>.py</code>.
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
