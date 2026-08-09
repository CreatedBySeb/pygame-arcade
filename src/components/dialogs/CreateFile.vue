<script setup lang="ts">
import { useStrippedPath } from "@/composables";
import { focusEditor } from "@/editors";
import { createFile } from "@/runtime";
import newPythonTemplate from "@/templates/file.py?raw";
import { getExtension, joinPath, PROJECT_ROOT, TEXT_EXTS } from "@/worker/api";
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

const newFileName = ref<string>("");
const friendlyPath = useStrippedPath(() => props.basePath);

const friendlyExtensions = TEXT_EXTS.map(
  (ext) => `<code>.${ext}</code>`,
).reduce((prev, curr, i) => {
  if (i == 0) return curr;

  const connector = i < TEXT_EXTS.length - 1 ? ", " : " or ";
  return prev + connector + curr;
});

const isValid = computed<boolean>(() => {
  const value = newFileName.value;

  if (
    value.length < 1 ||
    value.includes(" ") ||
    !TEXT_EXTS.includes(getExtension(value) ?? "")
  ) {
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

function createTextFile(_: SubmitEvent): void {
  if (!isValid.value) {
    return;
  }

  const template = newFileName.value.endsWith(".py") ? newPythonTemplate : "";

  createFile(props.basePath, newFileName.value, template);
  focusEditor(joinPath([PROJECT_ROOT, newFileName.value]), template);
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
    header="Create Text File"
  >
    <form @submit.prevent="createTextFile">
      <Message size="small" variant="simple" severity="secondary">
        File will be created in <code>{{ friendlyPath }}</code>
      </Message>
      <div class="form-field">
        <label for="name">Name</label>
        <InputText
          id="name"
          placeholder="file.py"
          v-model="newFileName"
          autofocus
          :invalid="newFileName !== '' && !isValid"
        />
      </div>
      <Message size="small" :severity="hintSeverity" variant="simple">
        File names must not contain spaces and must end with
        <span v-html="friendlyExtensions"></span>.
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
