import { ref, type Ref } from "vue";

const programRef = ref(`print("Hello, world!")`);

export function useProgram(): Ref<string> {
  return programRef;
}
