<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { setCanvas } from "../pyodide";

const canvasRef = useTemplateRef("canvas");

onMounted(() => {
  setCanvas(canvasRef.value!);
});
</script>

<template>
  <div id="window">
    <canvas id="canvas" ref="canvas" height="640" width="480"></canvas>
  </div>
</template>

<style>
#window {
  & > canvas {
    aspect-ratio: 4 / 3;
    width: 100%;
  }
}
</style>
