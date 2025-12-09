import { runFFprobe } from "@/utils/ffmpeg";
import { NonEmptyArray, VideoInfo } from "@/types";

export class VideoAnalyzer {
  /**
   * Get comprehensive video information using ffprobe
   */
  static async analyze(filePath: string): Promise<VideoInfo> {
    const streamArgs = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,codec_name,r_frame_rate,duration,nb_frames",
      "-of",
      "json",
      filePath,
    ];

    const streamOutput = await runFFprobe(streamArgs);
    const streamData = JSON.parse(streamOutput);
    const stream = streamData.streams[0];

    if (!stream) {
      throw new Error(`No video stream found in ${filePath}`);
    }

    const [num, den] = stream.r_frame_rate.split("/").map(Number);
    const framerate = num / (den || 1);

    // getting format info (for duration if not in stream)
    const formatArgs = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ];

    const formatOutput = await runFFprobe(formatArgs);
    const formatData = JSON.parse(formatOutput);

    const duration = parseFloat(stream.duration || formatData.format.duration);

    const info: VideoInfo = {
      file: filePath,
      duration,
      framerate,
      width: stream.width,
      height: stream.height,
      codec: stream.codec_name,
    };

    return info;
  }

  /**
   * Extract keyframe positions (timestamps in seconds)
   * THIS IS EXPENSIVE - only call when needed
   */

  static async getKeyframes(filePath: string): Promise<number[]> {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "frame=pkt_pts_time,key_frame",
      "-of",
      "json",
      filePath,
    ];

    const output = await runFFprobe(args);
    const data = JSON.parse(output);

    type Frame = (typeof data.frames)[0];
    const frames = (data.frames || []) as Frame[];
    const keyframes = frames
      .filter((f) => f.key_frame === 1)
      .map((f) => parseFloat(f.pkt_pts_time));

    return keyframes.sort((a, b) => a - b);
  }

  /**
   * Find nearest keyframe before given timestamp, else returns the start of video
   */
  static findPreviousKeyframe(
    timestamp: number,
    keyframes: NonEmptyArray<number>
  ): number {
    return [...keyframes].reverse().find((k) => k <= timestamp) || 0;
  }

  /**
   * Estimate keyframe interval (for faster strategies)
   */
  static estimateKeyframeInterval(keyframes: NonEmptyArray<number>): number {
    if (keyframes.length < 2) return 2.0; // default guess

    const intervals = keyframes
      .slice(0, Math.min(keyframes.length, 20))
      .slice(1)
      .map((curr, i) => curr - keyframes[i]!);
    intervals.sort((a, b) => a - b);
    return intervals[Math.floor(intervals.length / 2)]!;
  }
}
