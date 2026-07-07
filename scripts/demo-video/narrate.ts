// Synthesize per-beat narration with macOS `say`, measure durations, and
// write out/narration/durations.json so the drive script can pace each beat
// to its narration line.
//
// Usage: bun run scripts/demo-video/narrate.ts [voice]
import { mkdir } from "node:fs/promises";
import { BEATS } from "./story.ts";

const voice = process.argv[2] ?? "Samantha";
const outDir = new URL("./out/narration/", import.meta.url).pathname;
await mkdir(outDir, { recursive: true });

const run = async (cmd: string[]) => {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if (code !== 0) throw new Error(`${cmd.join(" ")} failed: ${stderr}`);
  return stdout;
};

const durationOf = async (file: string) =>
  Math.round(
    parseFloat(
      await run([
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
      ]),
    ) * 1000,
  );

const durations: Record<string, number> = {};
for (const beat of BEATS) {
  const aiff = `${outDir}${beat.id}.aiff`;
  const wav = `${outDir}${beat.id}.wav`;
  await run(["say", "-v", voice, "-r", "172", "-o", aiff, beat.line]);
  await run(["ffmpeg", "-y", "-v", "error", "-i", aiff, "-ar", "48000", wav]);
  durations[beat.id] = await durationOf(wav);
  console.log(`${beat.id}: ${durations[beat.id]}ms`);
}

await Bun.write(
  `${outDir}durations.json`,
  JSON.stringify({ voice, durations }, null, 2),
);
console.log(`Wrote ${outDir}durations.json`);
