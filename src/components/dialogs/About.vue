<script setup lang="ts">
import Dialog from "primevue/dialog";
import { version as pyodideVersion } from "pyodide";
import pyodideLock from "pyodide/pyodide-lock.json";

const commit = __GIT_COMMIT__;
const commitUrl =
  "https://github.com/CreatedBySeb/pygame-arcade/commit/" + commit;

const pyodideUrl =
  "https://github.com/pyodide/pyodide/releases/tag/" + pyodideVersion;

const pygameVersion = pyodideLock.packages["pygame-ce"].version;
const pygameUrl =
  "https://github.com/pygame-community/pygame-ce/releases/tag/" + pygameVersion;

const visible = defineModel<boolean>("visible", {
  required: true,
  default: false,
});
</script>

<template>
  <Dialog
    class="about-dialog"
    v-model:visible="visible"
    dismissable-mask
    modal
    :draggable="false"
    header="About Pygame Arcade"
  >
    <p>Pygame Arcade is a web-based development environment for Pygame</p>
    <p>
      Built from commit:
      <a :href="commitUrl" target="_blank">
        <code>{{ commit }}</code>
      </a>
    </p>
    <p>
      Pyodide version:
      <a :href="pyodideUrl" target="_blank">
        <code>{{ pyodideVersion }}</code>
      </a>
    </p>
    <p>
      Python version: <code>{{ pyodideLock.info.python }}</code>
    </p>
    <p>
      Pygame Community Edition version:
      <a :href="pygameUrl" target="_blank">
        <code>{{ pygameVersion }}</code>
      </a>
    </p>
  </Dialog>
</template>

<style>
.about-dialog {
  & p:not(:first-child) {
    margin: 0.5rem 0;
  }
}
</style>
