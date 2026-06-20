import PrimeVue from "primevue/config";
import { createApp } from "vue";
import App from "./App.vue";
import "./pyodide.ts"; // Start worker thread early
import "./style.css";

const app = createApp(App);

app.use(PrimeVue);

app.mount("#app");
