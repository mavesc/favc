import * as fs from 'fs';
import { VideoClipper } from '../core/clipper';
import { ClipRequest, ExtractionStrategy, ExtractOptions } from '../types';
import { Logger, LogLevel } from '@/utils/logger';

const c = new Logger("Extractor");

export async function extractCommand(options: ExtractOptions) {
    try {
        if (!fs.existsSync(options.input)) {
            c.log(`Input file ${options.input} does not exist`, LogLevel.ERROR);
            process.exit(1);
        }

        let clipRequests: ClipRequest[] = [];

        if (options.clips) {
            if (!fs.existsSync(options.clips)) {
                c.log(`Clips file ${options.clips} does not exist`, LogLevel.ERROR);
                process.exit(1);
            }

            const clipsData = JSON.parse(fs.readFileSync(options.clips, 'utf-8'));
            clipRequests = clipsData;

        } else {
            if (!options.start || !options.end || !options.output) {
                c.log(`Missing required options for single clip extraction: --start, --end, --output`, LogLevel.ERROR);
                c.log(`Or use --clips <json> for batch extraction`, LogLevel.ERROR);
                process.exit(1);
            }

            clipRequests = [{
                start: options.start,
                end: options.end,
                output: options.output,
                strategy: options.strategy as ExtractionStrategy
            }]
        }

        console.log(`\n•• FAVC - Frame-Accurate Video Clipper ••\n`)
        const report = await VideoClipper.extractClips(
            options.input,
            clipRequests,
            options.strategy as ExtractionStrategy
        );

        if (options.report) {
            fs.writeFileSync(options.report, JSON.stringify(report, null, 2));
            console.log(`\n✓ Report saved to ${options.report}`);
        }

        console.log(`\n✅ Done! Processed ${report.clips.length} clip(s) in ${(report.total_processing_time_ms / 1000).toFixed(1)}s`);
    } catch (error: any) {
        c.log(error.message, LogLevel.ERROR);
        process.exit(1);
    }
}