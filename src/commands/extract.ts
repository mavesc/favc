import * as fs from "fs";
import { VideoClipper } from "../core/clipper";
import { ClipRequest, ExtractionStrategy, ExtractOptions } from "../types";
import { Logger, LogLevel } from "@/utils/logger";
import { validateVideoFile } from "@/utils/validator";
import ora from "ora";

export async function extractCommand(options: ExtractOptions) {
  const c = new Logger("Extractor", options.logLevel);
  try {
    validateVideoFile(options.input);

    let clipRequests: ClipRequest[] = [];

    if (options.clips) {
      if (!fs.existsSync(options.clips)) {
        c.log(`Clips file ${options.clips} does not exist`, LogLevel.ERROR);
        process.exit(1);
      }

      const clipsData = JSON.parse(fs.readFileSync(options.clips, "utf-8"));
      clipRequests = clipsData;
    } else {
      if (!options.start || !options.end || !options.output) {
        c.log(
          `Missing required options for single clip extraction: --start, --end, --output`,
          LogLevel.ERROR
        );
        c.log(`Or use --clips <json> for batch extraction`, LogLevel.ERROR);
        process.exit(1);
      }

      clipRequests = [
        {
          start: options.start,
          end: options.end,
          output: options.output,
          strategy: options.strategy as ExtractionStrategy,
        },
      ];
    }

    console.log(`\n•• FAVC - Frame-Accurate Video Clipper ••\n`);
    const spinner = ora("Extracting clip(s)...").start();
    c.log(
      `Clip requests: ${JSON.stringify(clipRequests, null, 2)}`,
      LogLevel.DEBUG
    );
    const report = await VideoClipper.extractClips(
      options.input,
      clipRequests,
      options.strategy as ExtractionStrategy,
      options.logLevel
    );

    if (options.report) {
      fs.writeFileSync(options.report, JSON.stringify(report, null, 2));
      console.log(`\n✓ Report saved to ${options.report}`);
    }
    spinner.succeed("Clips extracted!");
    console.log(
      `\n✓ Done! Processed ${report.clips.length} clip(s) in ${(report.total_processing_time_ms / 1000).toFixed(1)}s`
    );
  } catch (error: any) {
    c.log(error.message, LogLevel.ERROR);
    process.exit(1);
  }
}
