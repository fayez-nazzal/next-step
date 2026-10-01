import { useEffect, useRef, useState } from "react";
import { useBlur, useFocus, useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { InputRenderable, KeyEvent, TextareaRenderable } from "@opentui/core";
import type { Step } from "@next-step/domain";
import type { StepApplication } from "@next-step/application";

const ACTIVE_STEP_FONT_SIZE = 5;

const BIG_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ["01110", "10001", "10001", "11111", "10001"],
  B: ["11110", "10001", "11110", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  F: ["11111", "10000", "11110", "10000", "10000"],
  G: ["01111", "10000", "10111", "10001", "01111"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  I: ["111", "010", "010", "010", "111"],
  J: ["00111", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "11100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  Q: ["01110", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "11110", "10010", "10001"],
  S: ["01111", "10000", "01110", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["10001", "01010", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  Z: ["11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10011", "10101", "11001", "01110"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["11110", "00001", "01110", "10000", "11111"],
  "3": ["11110", "00001", "01110", "00001", "11110"],
  "4": ["10010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "11110"],
  "6": ["01111", "10000", "11110", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "00100"],
  "8": ["01110", "10001", "01110", "10001", "01110"],
  "9": ["01110", "10001", "01111", "00001", "11110"],
  "!": ["1", "1", "1", "0", "1"],
  '"': ["101", "101", "000", "000", "000"],
  "#": ["01010", "11111", "01010", "11111", "01010"],
  $: ["01111", "10100", "01110", "00101", "11110"],
  "%": ["11001", "11010", "00100", "01011", "10011"],
  "&": ["01100", "10010", "01100", "10010", "01101"],
  "'": ["1", "1", "0", "0", "0"],
  "(": ["001", "010", "010", "010", "001"],
  ")": ["100", "010", "010", "010", "100"],
  "*": ["000", "101", "010", "101", "000"],
  "+": ["000", "010", "111", "010", "000"],
  ",": ["0", "0", "0", "1", "1"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["0", "0", "0", "0", "1"],
  "/": ["001", "001", "010", "100", "100"],
  ":": ["0", "1", "0", "1", "0"],
  ";": ["0", "1", "0", "1", "1"],
  "<": ["001", "010", "100", "010", "001"],
  "=": ["000", "111", "000", "111", "000"],
  ">": ["100", "010", "001", "010", "100"],
  "?": ["11110", "00001", "00110", "00000", "00100"],
  "@": ["01110", "10001", "10111", "10000", "01110"],
  "[": ["11", "10", "10", "10", "11"],
  "\\": ["100", "100", "010", "001", "001"],
  "]": ["11", "01", "01", "01", "11"],
  "^": ["010", "101", "000", "000", "000"],
  _: ["00000", "00000", "00000", "00000", "11111"],
  "`": ["10", "01", "00", "00", "00"],
  "{": ["001", "010", "110", "010", "001"],
  "|": ["1", "1", "1", "1", "1"],
  "}": ["100", "010", "011", "010", "100"],
  "~": ["000", "010", "101", "000", "000"],
  " ": ["0", "0", "0", "0", "0"],
};
function renderActiveStep(title: string, terminalWidth: number) {
  const characters = [...title.toLocaleUpperCase()];
  const maxCharacters = Math.max(1, Math.floor((terminalWidth + 1) / 6));
  const lines: string[] = [];

  for (let offset = 0; offset < characters.length; offset += maxCharacters) {
    const chunk = characters.slice(offset, offset + maxCharacters);
    const rowCount = Math.max(
      ACTIVE_STEP_FONT_SIZE,
      ...chunk.map((char) => BIG_GLYPHS[char]?.[0]?.length ?? ACTIVE_STEP_FONT_SIZE),
    );
    for (let row = 0; row < ACTIVE_STEP_FONT_SIZE; row++) {
      lines.push(
        chunk
          .map((char) => {
            const glyph = BIG_GLYPHS[char] ?? BIG_GLYPHS[" "]!;
            const pixel = /^[A-Z0-9]$/.test(char) ? "█" : "#";
            const rowText = (glyph[row] ?? "0").replaceAll("1", pixel).replaceAll("0", " ");
            return " ".repeat(Math.max(0, rowCount - rowText.length)) + rowText;
          })
          .join(" "),
      );
    }
  }

  return lines.join("\n");
}

interface Props {
  application: StepApplication;
  track(promise: Promise<unknown>): void;
}

type Editor = { kind: "add" | "update" | "describe"; value: string; id?: string } | null;

export function Tui({ application, track }: Props) {
  const { width: terminalWidth } = useTerminalDimensions();
  const [steps, setSteps] = useState<readonly Step[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState("");
  const [terminalFocused, setTerminalFocused] = useState(true);
  const titleEditor = useRef<InputRenderable>(null);
  const descriptionEditor = useRef<TextareaRenderable>(null);

  useFocus(() => setTerminalFocused(true));
  useBlur(() => setTerminalFocused(false));
  useEffect(() => {
    track(
      application
        .load()
        .then((loaded) => {
          setSteps(loaded);
          setSelected(loaded[0]?.id ?? null);
        })
        .catch(showError),
    );
  }, [application]);

  function showError(reason: unknown) {
    setError(reason instanceof Error ? reason.message : String(reason));
  }

  function mutate(operation: () => Promise<readonly Step[]>) {
    setError("");
    track(
      operation()
        .then((next) => {
          setSteps(next);
          setSelected((current) =>
            current && next.some((step) => step.id === current) ? current : (next[0]?.id ?? null),
          );
        })
        .catch(showError),
    );
  }

  function submit(value: string) {
    if (!editor) return;
    const active = editor;
    if ((active.kind === "add" || active.kind === "update") && value.trim().length === 0) {
      setEditor(null);
      setError("");
      return;
    }
    setEditor(null);
    if (active.kind === "add") mutate(() => application.add(value));
    else if (active.kind === "update" && active.id) {
      const id = active.id;
      mutate(() => application.update(id, value));
    } else if (active.kind === "describe" && active.id) {
      const id = active.id;
      mutate(() => application.describe(id, value));
    }
  }

  useKeyboard((key: KeyEvent) => {
    if (key.eventType !== "press") return;
    if (editor) {
      if (key.name === "escape") {
        setEditor(null);
        setError("");
      } else if (key.name === "return" && editor.kind !== "describe") {
        submit(titleEditor.current?.value ?? "");
      } else if (key.name === "return" && editor.kind === "describe" && !key.shift) {
        submit(descriptionEditor.current?.plainText ?? "");
      }
      return;
    }
    // Chords such as Ctrl+C belong to the terminal and the quit handler, not to step shortcuts.
    if (key.ctrl || key.meta || key.option || key.super || key.hyper) return;
    const selectedStep = steps.find((step) => step.id === selected);
    if (key.name === "escape") {
      setSelected(null);
      setError("");
      return;
    }
    if (key.name === "j" || key.name === "down") {
      const index = steps.findIndex((step) => step.id === selected);
      if (steps.length > 0)
        setSelected(
          index < 0 ? steps[0]!.id : (steps[Math.min(index + 1, steps.length - 1)]?.id ?? null),
        );
    } else if (key.name === "k" || key.name === "up") {
      const index = steps.findIndex((step) => step.id === selected);
      if (steps.length > 0)
        setSelected(
          index < 0 ? steps[steps.length - 1]!.id : (steps[Math.max(index - 1, 0)]?.id ?? null),
        );
    } else if (key.name === "a") setEditor({ kind: "add", value: "" });
    else if (selectedStep && key.name === "u")
      setEditor({ kind: "update", id: selectedStep.id, value: selectedStep.title });
    else if (selectedStep && key.name === "d")
      setEditor({ kind: "describe", id: selectedStep.id, value: selectedStep.description ?? "" });
    else if (selectedStep && key.name === "c") mutate(() => application.complete(selectedStep.id));
    else if (selectedStep && key.name === "x") mutate(() => application.remove(selectedStep.id));
    else if (key.name === "space") {
      if (selectedStep)
        setEditor({ kind: "update", id: selectedStep.id, value: selectedStep.title });
      else setEditor({ kind: "add", value: "" });
    }
  });

  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center" padding={1}>
      <scrollbox
        width="100%"
        height="100%"
        flexDirection="column"
        alignItems="center"
        padding={1}
        scrollY
      >
        <box
          flexDirection="column"
          width="100%"
          gap={1}
          alignItems="center"
          justifyContent="center"
        >
          <box
            width="100%"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            padding={2}
            gap={1}
          >
            <text width="100%" textAlign="center" fg="#75d5c3">
              <strong>
                {steps[0] ? renderActiveStep(steps[0].title, terminalWidth - 4) : "Nothing queued."}
              </strong>
            </text>
            {steps[0]?.description && (
              <text width="100%" textAlign="center" fg="#8b929c">
                {steps[0].description}
              </text>
            )}
          </box>
          {steps.length > 1 && (
            <box flexDirection="column" gap={1} paddingLeft={2} alignSelf="flex-start">
              {steps.slice(1).map((step) => (
                <box key={step.id} flexDirection="column">
                  <text fg={terminalFocused && step.id === selected ? "#d5d8dc" : "#8b929c"}>
                    {terminalFocused && step.id === selected ? "› " : ""}
                    {step.title}
                  </text>
                  {step.description && <text fg="#707781">{step.description}</text>}
                </box>
              ))}
            </box>
          )}
          {editor && (
            <box flexDirection="column" gap={1}>
              <text fg="#75d5c3">
                <strong>
                  {editor.kind === "add"
                    ? "New step"
                    : editor.kind === "update"
                      ? "Edit title"
                      : "Description"}
                </strong>
              </text>
              {editor.kind === "describe" ? (
                <textarea
                  ref={descriptionEditor}
                  initialValue={editor.value}
                  focused
                  onKeyDown={(event) => {
                    if (event.name === "return" && !event.shift) event.preventDefault();
                  }}
                />
              ) : (
                <input
                  ref={titleEditor}
                  value={editor.value}
                  focused
                  onInput={(value) => setEditor({ ...editor, value })}
                />
              )}
              <text fg="#8b929c">
                {editor.kind === "describe"
                  ? "Enter save · Shift+Enter new line · Escape cancel"
                  : "Enter save · Escape cancel"}
              </text>
            </box>
          )}
          {error && <text fg="#ff7979">{error}</text>}
        </box>
      </scrollbox>
    </box>
  );
}
