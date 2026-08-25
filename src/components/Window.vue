<script setup lang="ts">
import { setCanvas } from "@/runtime";
import Button from "primevue/button";
import { onMounted, useTemplateRef } from "vue";

const canvasRef = useTemplateRef("canvas");
const fullscreen = defineModel<boolean>("fullscreen", {
  required: true,
  default: false,
});

onMounted(() => {
  setCanvas(canvasRef.value!);
});
</script>

<template>
  <div id="window" :class="{ fullscreen }">
    <div id="aspect-container">
      <canvas id="canvas" ref="canvas" height="640" width="480"></canvas>
    </div>
    <Button
      id="close-fullscreen"
      v-show="fullscreen"
      icon="pi pi-times"
      title="Close Fullscreen"
      aria-label="Close Fullscreen"
      severity="secondary"
      rounded
      @click="() => (fullscreen = false)"
    />
  </div>
</template>

<style>
#window {
  align-items: center;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;

  &.fullscreen {
    background-color: var(--p-surface-300);
    height: 100vh;
    left: 0;
    position: fixed;
    top: 0;
    width: 100vw;
  }

  & #aspect-container {
    aspect-ratio: 4 / 3;
    line-height: 0;
    max-height: 100vh;
    width: 100%;
    text-align: center;
  }

  & #close-fullscreen {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
  }

  & canvas {
    aspect-ratio: 4 / 3;
    background-color: white;
    height: 100%;
    max-width: 100vw;
  }
}
</style>
