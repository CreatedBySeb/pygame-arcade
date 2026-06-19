<script setup lang="ts">
import { useTemplateRef, watch } from "vue";
import { useOutput } from "../pyodide";

const consoleRef = useTemplateRef("console");
const [stdoutRef] = useOutput();

watch(stdoutRef, async () => {
  const el = consoleRef.value;
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
  }
});
</script>

<template>
  <div id="console" ref="console">
    <pre>{{ stdoutRef }}</pre>
  </div>
</template>

<style>
#console {
  height: 20em;
  overflow: scroll;
  padding: 0.5em 1em;
  width: 100%;
}
</style>
