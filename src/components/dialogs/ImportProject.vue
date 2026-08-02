<script setup lang="ts">
import { closeAllEditors } from "@/editors";
import { importProject } from "@/runtime";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import FileUpload, { type FileUploadSelectEvent } from "primevue/fileupload";
import Message from "primevue/message";

const ALLOWED_FILES = ["application/zip", "application/x-zip-compressed"].join(
  ",",
);

const SIZE_LIMIT = 10_000_000;

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

function importHandler(event: FileUploadSelectEvent) {
  if (event.files.length) {
    closeAllEditors();
    importProject(event.files[0]);
  }

  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    header="Import Project"
  >
    <Message
      class="margin-b"
      icon="pi pi-exclamation-triangle"
      size="small"
      variant="simple"
      severity="warn"
    >
      All files and data in your project will be replaced with the provided
      project
    </Message>
    <div class="spaced-buttons">
      <FileUpload
        mode="basic"
        :accept="ALLOWED_FILES"
        :max-file-size="SIZE_LIMIT"
        auto
        choose-icon="pi pi-search"
        choose-label="Select Zip File"
        custom-upload
        @select="importHandler"
      />
      <Button severity="secondary" variant="outlined" @click="visible = false">
        Cancel
      </Button>
    </div>
  </Dialog>
</template>
