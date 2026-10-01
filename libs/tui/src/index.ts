import { createElement } from "react";
import type { StepApplication } from "@next-step/application";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Tui } from "./tui";

export interface TuiHandle {
  readonly exited: Promise<void>;
  destroy(): void;
  waitForIdle(): Promise<void>;
}

export async function launchTui(application: StepApplication): Promise<TuiHandle> {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  const root = createRoot(renderer);
  const pending = new Set<Promise<unknown>>();
  const exit = Promise.withResolvers<void>();
  const track = (promise: Promise<unknown>) => {
    pending.add(promise);
    void promise.finally(() => pending.delete(promise));
  };
  root.render(createElement(Tui, { application, track }));
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    root.unmount();
    renderer.destroy();
  };
  async function waitForIdle() {
    while (pending.size) await Promise.allSettled(pending);
  }
  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "c" && key.ctrl) {
      void waitForIdle().then(() => {
        destroy();
        exit.resolve();
      });
    }
  });
  return { destroy, waitForIdle, exited: exit.promise };
}
