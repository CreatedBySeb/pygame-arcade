import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import type { AuraBaseDesignTokens } from "@primeuix/themes/aura/base";
import type { Preset } from "@primeuix/themes/types";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import App from "./App.vue";
import "./runtime.ts"; // Start worker thread early
import "./style.css";

const app = createApp(App);

const customPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "{green.50}",
      100: "{green.100}",
      200: "{green.200}",
      300: "{green.300}",
      400: "{green.400}",
      500: "{green.500}",
      600: "{green.600}",
      700: "{green.700}",
      800: "{green.800}",
      900: "{green.900}",
      950: "{green.950}",
    },
    formField: {
      paddingX: "0.5rem",
      paddingY: "0.375rem",
    },
    colorScheme: {
      light: {
        surface: {
          50: "{purple.50}",
          100: "{purple.100}",
          200: "{purple.200}",
          300: "{purple.300}",
          400: "{purple.400}",
          500: "{purple.500}",
          600: "{purple.600}",
          700: "{purple.700}",
          800: "{purple.800}",
          900: "{purple.900}",
          950: "{purple.950}",
        },
      },
    },
  },
  components: {
    tabs: {
      tab: {
        padding: "0.5rem 0.75rem",
      },
    },
    tree: {
      node: {
        borderRadius: "0",
      },
      root: {
        gap: "0",
        padding: "0",
      },
    },
  },
} satisfies Preset<AuraBaseDesignTokens>);

app.use(PrimeVue, {
  theme: {
    preset: customPreset,
    options: {
      darkModeSelector: false,
    },
  },
});

app.mount("#app");
