import { randomUUID } from "node:crypto";
import { createApplication } from "@next-step/application";
import { createFileRepository } from "@next-step/persistence";
import { launchTui } from "@next-step/tui";

const application = createApplication(createFileRepository(process.cwd()), randomUUID);
const tui = await launchTui(application);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await tui.waitForIdle();
  tui.destroy();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
void tui.exited.then(shutdown);
