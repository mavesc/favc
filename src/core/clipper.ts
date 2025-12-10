import { VideoAnalyzer } from "./analyzer";
import { ExtractionStrategies } from "./strategies";
import { TimecodeParser } from "./timecode";
import { match } from "matchixir";
import {
    ClipRequest,
    ClipResult,
    ExtractionReport,
    ExtractionStrategy,
    NonEmptyArray,
    StrategyContext,
} from "@/types";
import { runFFmpeg } from "@/utils/ffmpeg";

export class VideoClipper {
    static validateTimeRange(
        clip: ClipRequest,
        startSeconds: number,
        endSeconds: number,
        duration: number
    ) {
        if (startSeconds >= endSeconds) {
            throw new Error(
                `Invalid clip range: start (${clip.start}) must be before end (${clip.end})`
            );
        }
        if (startSeconds < 0 || endSeconds > duration) {
            throw new Error(`Clip range out of bounds: ${clip.start} to ${clip.end}, with duration ${duration}s`);
        }
    }
    /**
     * Extract clips from video
     */
    static async extractClips(
        inputFile: string,
        clips: ClipRequest[],
        defaultStrategy: ExtractionStrategy = "smart-copy"
    ): Promise<ExtractionReport> {
        const startTime = Date.now();

        console.log("Analyzing video...");
        const videoInfo = await VideoAnalyzer.analyze(inputFile);
        console.log(
            `Video: ${videoInfo.width}x${videoInfo.height} @ ${videoInfo.framerate.toFixed(2)}fps, ${videoInfo.duration.toFixed(2)}s`
        );

        const needsKeyframes = clips.some(
            (clip) => (clip.strategy || defaultStrategy) !== "re-encode"
        );

        let keyframes: NonEmptyArray<number>;
        if (needsKeyframes) {
            console.log("Extracting keyframe positions (this may take a while)...");
            keyframes = await VideoAnalyzer.getKeyframes(inputFile);
            console.log(`Found ${keyframes.length} keyframes`);

            videoInfo.keyframeInterval =
                VideoAnalyzer.estimateKeyframeInterval(keyframes);
            console.log(
                `Average keyframe interval: ${videoInfo.keyframeInterval.toFixed(2)}s`
            );
        }

        const results: ClipResult[] = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i]!;
            const strategy = clip.strategy || defaultStrategy;

            console.log(
                `\nProcessing clip ${i + 1}/${clips.length} (${strategy})...`
            );

            const clipStart = Date.now();

            const startSeconds = TimecodeParser.parse(
                clip.start,
                videoInfo.framerate
            );
            const endSeconds = TimecodeParser.parse(clip.end, videoInfo.framerate);

            this.validateTimeRange(
                clip,
                startSeconds,
                endSeconds,
                videoInfo.duration
            );

            const ctx: StrategyContext = {
                videoInfo,
                startSeconds,
                endSeconds,
                outputPath: clip.output,
            };
            if (needsKeyframes) {
                ctx.keyframes = keyframes!;
            }

            match(strategy)
                .with(
                    "keyframe-only",
                    async () => await ExtractionStrategies.keyframeOnly(ctx)
                )
                .with(
                    "smart-copy",
                    async () => await ExtractionStrategies.smartCopy(ctx)
                )
                .with("re-encode", async () => await ExtractionStrategies.reEncode(ctx))
                .none(() => {
                    throw new Error(`Unknown extraction strategy: ${strategy}`);
                });

            const clipDuration = Date.now() - clipStart;
            type timeSpan = [number, number];

            let [actualStart, actualEnd] = match(strategy)
                .with("keyframe-only", (): timeSpan => {
                    return [
                        ExtractionStrategies.findNearestKeyframe(startSeconds, keyframes),
                        ExtractionStrategies.findNearestKeyframe(endSeconds, keyframes),
                    ];
                })
                .with("smart-copy", (): timeSpan => {
                    return [
                        ExtractionStrategies.findPreviousKeyframe(startSeconds, keyframes),
                        endSeconds,
                    ];
                })
                .none((): timeSpan => {
                    return [startSeconds, endSeconds];
                });

            const framesIncluded = Math.round(
                (actualEnd - actualStart) * videoInfo.framerate
            );

            const result: ClipResult = {
                requested_start: clip.start,
                requested_end: clip.end,
                actual_start: TimecodeParser.format(actualStart),
                actual_end: TimecodeParser.format(actualEnd),
                strategy,
                frames_included: framesIncluded,
                is_re_encoded: strategy === "re-encode",
                processing_time_ms: clipDuration,
                output: clip.output,
            };

            results.push(result);
            console.log(
                `✓ Created ${clip.output} in ${(clipDuration / 1000).toFixed(1)}s`
            );
        }

        const totalTime = Date.now() - startTime;

        return {
            source: videoInfo,
            clips: results,
            total_processing_time_ms: totalTime,
        };
    }

    /**
     * Extract single frame as thumbnail
     */
    static async extractThumbnail(
        inputFile: string,
        timestamp: string,
        outputPath: string
    ): Promise<void> {
        const videoInfo = await VideoAnalyzer.analyze(inputFile);
        const seconds = TimecodeParser.parse(timestamp, videoInfo.framerate);

        if (seconds < 0 || seconds > videoInfo.duration) {
            throw new Error(`Timestamp ${timestamp} out of bounds`);
        }
        // prettier-ignore
        const args = [
            '-ss', seconds.toString(),
            '-i', inputFile,
            '-vframes', '1',
            '-q:v', '2', // High quality JPEG
            '-y',
            outputPath
        ];

        await runFFmpeg(args);
        console.log(`✓ Thumbnail saved to ${outputPath}`);
    }
}
