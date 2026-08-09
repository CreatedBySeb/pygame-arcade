<script setup lang="ts">
import Console from "@/components/Console.vue";
import Editor from "@/components/Editor.vue";
import FileBrowser from "@/components/FileBrowser.vue";
import Window from "@/components/Window.vue";
import ImportProject from "@/components/dialogs/ImportProject.vue";
import { closeAllEditors } from "@/editors";
import {
  downloadProject,
  eraseProject,
  interrupt,
  pyodideLoaded,
  runProgram,
} from "@/runtime.ts";
import Button from "primevue/button";
import Menu from "primevue/menu";
import type { MenuItem } from "primevue/menuitem";
import Message from "primevue/message";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { useConfirm } from "primevue/useconfirm";
import { ref, useTemplateRef, type Ref } from "vue";

const confirm = useConfirm();
const importVisible = ref(false);

function confirmErase() {
  confirm.require({
    accept: () => {
      closeAllEditors();
      eraseProject();
    },
    acceptProps: {
      label: "Confirm Erase",
      severity: "danger",
    },
    blockScroll: true,
    header: "Confirm Project Erase",
    icon: "pi pi-exclamation-triangle",
    message:
      "Are you sure you want to erase all files and data in your project?",
    rejectProps: {
      label: "Cancel",
      severity: "secondary",
    },
  });
}

const projectMenu = useTemplateRef("projectMenu");
const projectMenuItems: Ref<MenuItem[]> = ref([
  {
    label: "Download as Zip",
    icon: "pi pi-download",
    command: downloadProject,
  },
  {
    label: "Import from Zip",
    icon: "pi pi-upload",
    command: () => (importVisible.value = true),
  },
  {
    label: "Erase all Files",
    icon: "pi pi-eraser",
    class: "p-menu-item-danger",
    command: confirmErase,
  },
  {
    separator: true,
  },
  {
    label: "Provide Feedback",
    icon: "pi pi-comment",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScNm5_nLGwqfosjWbysuNAHcHriRjLXQlPIfa9xeaGTKCZnaQ/viewform?usp=publish-editor",
    target: "_blank",
  },
  {
    label: "View on GitHub",
    icon: "pi pi-github",
    url: "https://github.com/CreatedBySeb/pygame-arcade",
    target: "_blank",
  },
]);
</script>

<template>
  <Splitter id="ide">
    <SplitterPanel :size="70" :min-size="50">
      <Splitter>
        <SplitterPanel :size="25" :min-size="15">
          <FileBrowser></FileBrowser>
        </SplitterPanel>
        <SplitterPanel :size="75" :min-size="60">
          <Splitter layout="vertical">
            <SplitterPanel :size="75" :min-size="30">
              <Editor></Editor>
            </SplitterPanel>
            <SplitterPanel :size="25" :min-size="20">
              <Console></Console>
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </SplitterPanel>
    <SplitterPanel :size="30" :min-size="20">
      <div>
        <div id="control-buttons" class="spaced-buttons">
          <Button
            :disabled="!pyodideLoaded"
            icon="pi pi-play"
            label="Run it!"
            @click="runProgram"
          />
          <Button
            severity="secondary"
            :disabled="!pyodideLoaded"
            icon="pi pi-stop"
            label="Stop"
            @click="interrupt"
          />
          <Button
            severity="secondary"
            :disabled="!pyodideLoaded"
            icon="pi pi-chevron-down"
            icon-pos="right"
            label="Project"
            aria-haspopup
            aria-controls="project-menu"
            @click="projectMenu?.toggle"
          />
          <Menu
            id="project-menu"
            ref="projectMenu"
            :popup="true"
            :model="projectMenuItems"
          />
        </div>
        <Window></Window>
        <Message v-show="!pyodideLoaded" severity="secondary">
          Loading Python...
        </Message>
      </div>
    </SplitterPanel>
  </Splitter>
  <ImportProject v-model:visible="importVisible" />
</template>

<style>
#ide {
  display: flex;
  height: 100%;
  width: 100%;

  & #control-buttons {
    padding: 0.5rem;
  }

  & .p-message {
    margin: 0.5rem;
  }
}
</style>
