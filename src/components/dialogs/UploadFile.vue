<script setup lang="ts">
import { uploadFiles } from "@/runtime";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import FileUpload, { type FileUploadSelectEvent } from "primevue/fileupload";

const SIZE_LIMIT = 5_000_000;

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

function uploadHandler(event: FileUploadSelectEvent) {
  // Create a new unproxied array to pass
  uploadFiles([...event.files]);
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    header="Upload Files"
  >
    <div class="spaced-buttons">
      <FileUpload
        mode="basic"
        accept="image/*"
        :max-file-size="SIZE_LIMIT"
        auto
        choose-icon="pi pi-search"
        choose-label="Browse"
        custom-upload
        multiple
        @select="uploadHandler"
      />
      <Button severity="secondary" variant="outlined" @click="visible = false">
        Cancel
      </Button>
    </div>
  </Dialog>
</template>
