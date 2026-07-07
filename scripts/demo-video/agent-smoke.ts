// Headless verification: real MCP round-trip against the baked project.
import { connectAgent } from "./agent.ts";
import { AGENT_OPS, AGENT_COMMIT_LABEL, PAGE } from "./story.ts";
const projectDir = new URL("./project", import.meta.url).pathname;
const agent = await connectAgent({ projectDir, bridgePort: 4401 });
console.log("APPLY:", await agent.apply(PAGE, AGENT_OPS as unknown as unknown[]));
console.log("COMMIT:", await agent.commit(PAGE, AGENT_COMMIT_LABEL));
await agent.close();
process.exit(0);
