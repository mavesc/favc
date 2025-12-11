import * as fs from 'fs';
import { VideoClipper } from '../core/clipper';
import { ThumbnailOptions } from '@/types';
import { Logger, LogLevel } from '@/utils/logger';

const c = new Logger("Thumbnailer");

export async function thumbnailCommand(options: ThumbnailOptions) {
    try {
        if (!fs.existsSync(options.input)) {
            c.log(`Input file ${options.input} does not exist`, LogLevel.ERROR);
            process.exit(1);
        }

        console.log(`\n•• FAVC - Thumbnail Extractor ••\n`);
        await VideoClipper.extractThumbnail(options.input, options.time, options.output);
        console.log(`\n✓ Thumbnail saved to ${options.output}`);
    } catch (error: any) {
        c.log(error.message, LogLevel.ERROR);
        process.exit(1);
    }
}