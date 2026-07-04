<script setup lang="ts">
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { nextTick, useTemplateRef, watch, type Ref } from "vue";
import { useOutput } from "../runtime";

const stderrEl = useTemplateRef("stderr");
const stdoutEl = useTemplateRef("stdout");
const [stdoutRef, stderrRef] = useOutput();

async function scrollToBottom(ref: Ref<Element | null>) {
  const el = ref.value;
  if (!el) return;

  await nextTick(); // Needed to allow heights to update first
  el.scroll({ top: el.scrollHeight, behavior: "instant" });
}

watch(stdoutRef, async () => {
  scrollToBottom(stdoutEl);
});

watch(stderrRef, async () => {
  scrollToBottom(stderrEl);
});
</script>

<template>
  <Tabs id="console" value="0">
    <TabList>
      <Tab value="0">Output</Tab>
      <Tab value="1">Errors</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="0">
        <pre ref="stdout">{{ stdoutRef }}</pre>
      </TabPanel>
      <TabPanel value="1">
        <pre ref="stderr">{{ stderrRef }}</pre>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<style>
#console {
  height: 100%;
  width: 100%;

  & pre {
    height: 100%;
    overflow: scroll;
    margin: 0;
    padding: 1em;
    width: 100%;
  }
}
</style>
