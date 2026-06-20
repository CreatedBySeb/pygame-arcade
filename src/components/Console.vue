<script setup lang="ts">
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { nextTick, useTemplateRef, watch, type Ref } from "vue";
import { useOutput } from "../pyodide";

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
  border: var(--default-border);
  flex: 0 0 20em;
  height: 20em;

  & pre {
    height: 100%;
    overflow: scroll;
    margin: 0;
    padding: 1em;
    width: 100%;
  }

  & .p-tablist {
    color: var(--accent-color);
    flex: 0 0 min-content;

    & .p-tablist-tab-list {
      border: none;
      border-bottom: var(--default-border);

      & button {
        border: none;
        border-right: var(--default-border);
        padding: 0.25em 0.5em;

        &.p-tab-active {
          background-color: var(--accent-color);
          color: white;
        }
      }
    }
  }

  & .p-tabpanels {
    flex: 1 0 1rem;
    height: 1rem;

    & .p-tabpanel {
      height: 100%;
      width: 100%;
    }
  }
}
</style>
