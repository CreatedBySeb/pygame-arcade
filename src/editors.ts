import { createFile } from "@/runtime";
import { getExtension, PROJECT_ROOT } from "@/workerApi";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  indentUnit,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { searchKeymap } from "@codemirror/search";
import { EditorState, Text, type Extension } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { computed, readonly, ref, shallowReactive } from "vue";

const EXTENSION_LANG: Record<
  string,
  () => LanguageSupport | StreamLanguage<unknown>
> = {
  json: json,
  py: python,
  toml: () => StreamLanguage.define(toml),
  yml: yaml,
  yaml: yaml,
};

const editorsRef = shallowReactive<Record<string, EditorState>>({});
const focusedPathRef = ref<string | null>(null);

/**
 * Creates an update listener to handle Vue reactivity for an editor
 * @param path The path key for the editor's file
 * @returns The update listener as an Extension
 */
function updateListener(path: string): Extension {
  return EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    editorsRef[path] = update.view.state;
    createFile(
      path.slice(PROJECT_ROOT.length + 1),
      update.view.state.doc.toString(),
    );
  });
}

/** The path currently being edited */
export const editedPath = readonly(focusedPathRef);

/** The currently focused editor state */
export const focusedEditor = computed(() => {
  const path = focusedPathRef.value;

  if (!path || !(path in editorsRef)) {
    return null;
  }

  return editorsRef[path];
});

/** A map of paths to editor state */
export const editors = readonly(editorsRef);

/**
 * Creates a new editor for a given path and file contents
 * @param path The path to the opened file
 * @param contents The contents of the opened file
 */
function createEditor(path: string, contents: string): void {
  const fileExtension = getExtension(path) ?? "";
  const languageExtension =
    fileExtension in EXTENSION_LANG ? [EXTENSION_LANG[fileExtension]()] : [];

  const state = EditorState.create({
    doc: Text.of(contents.split("\n")),
    extensions: [
      lineNumbers(),
      history(),
      indentOnInput(),
      indentUnit.of("    "),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]),
      ...languageExtension,
      updateListener(path),
    ],
  });

  editorsRef[path] = state;

  if (!focusedPathRef.value) {
    focusedPathRef.value = path;
  }
}

/**
 * Focuses an editor, creating it if it didn't exist already
 * @param path The path to the opened file
 * @param contents The contents of the opened file
 */
export function focusEditor(path: string, contents: string): void {
  if (!(path in editorsRef)) {
    createEditor(path, contents);
  }

  focusedPathRef.value = path;
}
