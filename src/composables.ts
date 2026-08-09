import { stripPath } from "@/worker/api";
import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";

/**
 * A helper to create a computed ref for a stripped path
 * @param path A ref containing a path string
 * @returns A computed ref returning the stripped value
 */
export function useStrippedPath(
  path: MaybeRefOrGetter<string>,
): ComputedRef<string> {
  return computed<string>(() => {
    return stripPath(toValue(path));
  });
}
