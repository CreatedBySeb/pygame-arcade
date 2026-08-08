<script setup lang="ts">
import { useOutput } from "@/runtime";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { nextTick, ref, useTemplateRef, watch, type Ref } from "vue";

type TabValue = "stderr" | "stdout";

const activeTab = ref<TabValue>("stdout");
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

watch(stderrRef, async (value) => {
  if (activeTab.value === "stdout") {
    // Stderr being emitted should swap focus
    activeTab.value = "stderr";
  } else if (!value.length) {
    // If stderr is cleared we have reset, so put focus back
    activeTab.value = "stdout";
  }

  scrollToBottom(stderrEl);
});
</script>

<template>
  <Tabs id="console" v-model:value="activeTab">
    <TabList>
      <Tab value="stdout">Output</Tab>
      <Tab value="stderr">Errors</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="stdout">
        <pre ref="stdout">{{ stdoutRef }}</pre>
      </TabPanel>
      <TabPanel value="stderr">
        <pre ref="stderr">{{ stderrRef }}</pre>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<style>
#console {
  height: 100%;
  width: 100%;

  & .p-tablist {
    flex-shrink: 0;
  }

  & .p-tabpanels {
    flex: 1 1%;
    height: 1rem;
    padding: 0;
  }

  & .p-tabpanel {
    height: 100%;
  }

  & pre {
    height: 100%;
    overflow: scroll;
    margin: 0;
    padding: 1em;
    width: 100%;
  }
}
</style>
