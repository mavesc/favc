import * as fs from "fs";
import { VideoClipper } from "../core/clipper";
import { ThumbnailOptions } from "@/types";
import { Logger, LogLevel } from "@/utils/logger";

export async function thumbnailCommand(options: ThumbnailOptions) {
  const c = new Logger("Thumbnailer");
  try {
    if (!fs.existsSync(options.input)) {
      c.log(`Input file ${options.input} does not exist`, LogLevel.ERROR);
      process.exit(1);
    }

    console.log(`\n•• FAVC - Thumbnail Extractor ••\n`);
    await VideoClipper.extractThumbnail(
      options.input,
      options.time,
      options.output
    );
    console.log(`\n✓ Thumbnail saved to ${options.output}`);
  } catch (error: any) {
    c.log(error.message, LogLevel.ERROR);
    process.exit(1);
  }
}
