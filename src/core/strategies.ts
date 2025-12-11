import { runFFmpeg } from "@/utils/ffmpeg";
import { NonEmptyArray, StrategyContext } from "@/types";
import { Logger, LogLevel } from "@/utils/logger";

const section = "Strategies";

export class ExtractionStrategies {
  static findNearestKeyframe(
    timestamp: number,
    keyframes: NonEmptyArray<number>
  ): number {
    let nearest = keyframes[0];
    let minDiff = Math.abs(keyframes[0] - timestamp);

    for (const k of keyframes) {
      const diff = Math.abs(k - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = k;
      }
    }

    return nearest;
  }

  static findPreviousKeyframe(
    timestamp: number,
    keyframes: NonEmptyArray<number>
  ): number {
    return [...keyframes].reverse().find((e) => e <= timestamp) ?? 0;
  }

  private static checkKeyframeExistence(
    keyframes: number[] | undefined | null,
    strategy: string
  ): asserts keyframes is NonEmptyArray<number> {
    if (!keyframes || keyframes.length === 0) {
      throw new Error(`Keyframe data required for ${strategy} strategy`);
    }
  }

  /**
   * KEYFRAME-ONLY: Fast, no re-encode, snaps to keyframes
   */
  static async keyframeOnly(
    ctx: StrategyContext,
    loglevel?: string
  ): Promise<void> {
    const c = new Logger(section, loglevel);
    this.checkKeyframeExistence(ctx.keyframes, "keyframe-only");

    const { startSeconds, endSeconds, outputPath } = ctx;

    const actualStart = this.findNearestKeyframe(startSeconds, ctx.keyframes);
    const actualEnd = this.findNearestKeyframe(endSeconds, ctx.keyframes);

    const duration = actualEnd - actualStart;
    c.log(
      `Clip duration: ${duration}s. Actual start: ${actualStart}s, actual end: ${actualEnd}s `,
      LogLevel.DEBUG
    );
    // prettier-ignore
    const args = [
            '-ss', actualStart.toString(),
            '-i', ctx.videoInfo.file,
            '-t', duration.toString(),
            '-c', 'copy',
            '-avoid_negative_ts', '1',
            '-y',
            outputPath
        ];

    await runFFmpeg(args);
  }

  /**
   * SMART-COPY: Seeks to previous keyframe, copies until end
   */
  static async smartCopy(
    ctx: StrategyContext,
    loglevel?: string
  ): Promise<void> {
    const c = new Logger(section, loglevel);
    this.checkKeyframeExistence(ctx.keyframes, "smart-copy");

    const { startSeconds, endSeconds, outputPath, videoInfo } = ctx;

    const seekStart = this.findPreviousKeyframe(startSeconds, ctx.keyframes);
    const duration = endSeconds - seekStart;
    c.log(
      `Clip duration: ${duration}s. Seek start: ${seekStart}s`,
      LogLevel.DEBUG
    );
    // prettier-ignore
    const args = [
            '-ss', seekStart.toString(),
            '-i', videoInfo.file,
            '-t', duration.toString(),
            '-c', 'copy',
            '-avoid_negative_ts', '1',
            '-y',
            outputPath
        ];

    await runFFmpeg(args);
  }

  /**
   * RE-ENCODE: Frame-accurate, but slow
   */
  static async reEncode(
    ctx: StrategyContext,
    loglevel?: string
  ): Promise<void> {
    const c = new Logger(section, loglevel);
    const { startSeconds, endSeconds, outputPath, videoInfo } = ctx;
    const duration = endSeconds - startSeconds;
    c.log(`Clip duration: ${duration}`, LogLevel.DEBUG);

    const keyframes = ctx.keyframes || [];
    const seekStart =
      keyframes.length > 0
        ? this.findPreviousKeyframe(
            startSeconds,
            keyframes as NonEmptyArray<number>
          )
        : Math.max(0, startSeconds - 5); // seek 5s before as fallback
    // prettier-ignore
    const args = [
            '-ss', seekStart.toString(),
            '-i', videoInfo.file,
            '-ss', (startSeconds - seekStart).toString(), // Precise trim after decode
            '-t', duration.toString(),
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            '-y',
            outputPath
        ];

    await runFFmpeg(args);
  }
}
