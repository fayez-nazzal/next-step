import { useEffect, useRef, useState } from "react";
import { useBlur, useFocus, useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { InputRenderable, KeyEvent, TextareaRenderable } from "@opentui/core";
import type { Step } from "@next-step/domain";
import type { StepApplication } from "@next-step/application";
import { selectBanner } from "./banner";

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

  const activeStep = steps[0];
  // Account for the outer padding, scrollbox padding, header inset, and scrollbar.
  const banner = activeStep ? selectBanner(activeStep.title, terminalWidth - 9) : null;

  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center" padding={1}>
      <scrollbox width="100%" height="100%" padding={1} scrollY>
        <box
          flexDirection="column"
          width="100%"
          flexShrink={0}
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
            flexShrink={0}
            gap={1}
          >
            <box
              width="100%"
              height={banner?.height ?? "auto"}
              minHeight={1}
              flexShrink={0}
              alignItems="center"
              justifyContent="center"
            >
              {activeStep && banner ? (
                <ascii-font
                  text={activeStep.title}
                  font={banner.font}
                  color="#75d5c3"
                  maxWidth="100%"
                />
              ) : (
                <text width="100%" textAlign="center" wrapMode="word" fg="#75d5c3">
                  <strong>{activeStep?.title ?? "Nothing queued."}</strong>
                </text>
              )}
            </box>
            {activeStep?.description && (
              <text width="100%" textAlign="center" wrapMode="word" fg="#8b929c">
                {activeStep.description}
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
