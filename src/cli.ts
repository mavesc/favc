#!/usr/bin/env node
import { Command } from "commander";
import { extractCommand } from "./commands/extract";
import { thumbnailCommand } from "./commands/thumbnail";

const program = new Command();

program
  .name("favc")
  .description("Frame-Accurate Video Clipper - Extract clips with precision")
  .version("1.0.0");

program
  .command("extract")
  .description("Extract one or more clips from a video")
  .requiredOption("-i, --input <file>", "Input video file")
  .option("-s, --start <time>", "Start time (HH:MM:SS.mmm, seconds, or frames)")
  .option("-e, --end <time>", "End time")
  .option("-o, --output <file>", "Output file")
  .option("--clips <json>", "Path to clips JSON file (for batch extraction)")
  .option(
    "--strategy <type>",
    "Extraction strategy: keyframe-only, smart-copy, re-encode",
    "smart-copy"
  )
  .option("--report <file>", "Save report to JSON file")
  .action(extractCommand);

program
  .command("thumbnail")
  .description("Extract a single frame as thumbnail")
  .requiredOption("-i, --input <file>", "Input video file")
  .requiredOption(
    "-t, --time <time>",
    "Timestamp (HH:MM:SS.mmm, seconds, or frames)"
  )
  .requiredOption("-o, --output <file>", "Output image file")
  .action(thumbnailCommand);

program.parse();
