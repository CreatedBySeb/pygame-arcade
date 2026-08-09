<script setup lang="ts">
import { useStrippedPath } from "@/composables";
import { uploadFiles } from "@/runtime";
import { TEXT_EXTS } from "@/worker/api";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import FileUpload, { type FileUploadSelectEvent } from "primevue/fileupload";
import Message from "primevue/message";

const props = defineProps<{
  basePath: string;
}>();

const ALLOWED_FILES = [
  "image/*",
  "audio/*",
  ...TEXT_EXTS.map((ext) => "." + ext),
].join(",");

const SIZE_LIMIT = 5_000_000;

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});

const friendlyPath = useStrippedPath(() => props.basePath);

function uploadHandler(event: FileUploadSelectEvent) {
  // Create a new unproxied array to pass
  uploadFiles(props.basePath, [...event.files]);
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
    <Message
      class="margin-b"
      size="small"
      variant="simple"
      severity="secondary"
    >
      Files will be uploaded to <code>{{ friendlyPath }}</code>
    </Message>
    <div class="spaced-buttons">
      <FileUpload
        mode="basic"
        :accept="ALLOWED_FILES"
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
