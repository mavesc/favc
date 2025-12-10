import { ExtractionStrategies } from "../src/core/strategies";
import { runFFmpeg } from "../src/utils/ffmpeg";
import { NonEmptyArray } from "../src/types";

jest.mock("../src/utils/ffmpeg", () => ({
    runFFmpeg: jest.fn(),
}));

const mockRunFFmpeg = runFFmpeg as jest.Mock;

const videoInfo = {
    file: "video.mp4",
    duration: 10,
    framerate: 30,
    width: 1920,
    height: 1080,
    codec: "h264",
};

describe("ExtractionStrategies", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    // ------------------------------------------------------------------
    // KEYFRAME-ONLY
    // ------------------------------------------------------------------
    describe("keyframeOnly", () => {
        test("throws if keyframes missing", async () => {
            await expect(
                ExtractionStrategies.keyframeOnly({
                    videoInfo,
                    startSeconds: 2,
                    endSeconds: 5,
                    outputPath: "out.mp4",
                })
            ).rejects.toThrow("Keyframe data required for keyframe-only strategy");
        });

        test("builds correct ffmpeg args using nearest keyframes", async () => {
            const ctx = {
                videoInfo,
                startSeconds: 2.1,
                endSeconds: 7.7,
                keyframes: [1.0, 3.0, 6.0, 8.0] as NonEmptyArray<number>,
                outputPath: "out.mp4",
            };

            await ExtractionStrategies.keyframeOnly(ctx);

            expect(mockRunFFmpeg).toHaveBeenCalledTimes(1);

            // nearest to 2.1 → 3.0
            // nearest to 7.7 → 8.0
            // duration = 8.0 - 3.0 = 5.0

            expect(mockRunFFmpeg).toHaveBeenCalledWith([
                "-ss",
                "3",
                "-i",
                "video.mp4",
                "-t",
                "5",
                "-c",
                "copy",
                "-avoid_negative_ts",
                "1",
                "-y",
                "out.mp4",
            ]);
        });
    });

    // ------------------------------------------------------------------
    // SMART COPY
    // ------------------------------------------------------------------
    describe("smartCopy", () => {
        test("throws if keyframes missing", async () => {
            await expect(
                ExtractionStrategies.smartCopy({
                    videoInfo,
                    startSeconds: 4,
                    endSeconds: 9,
                    outputPath: "out.mp4",
                })
            ).rejects.toThrow("Keyframe data required for smart-copy strategy");
        });

        test("seeks to previous keyframe and copies until end", async () => {
            const ctx = {
                videoInfo,
                startSeconds: 4.5,
                endSeconds: 9.0,
                keyframes: [1, 3, 4] as NonEmptyArray<number>,
                outputPath: "cut.mp4",
            };

            await ExtractionStrategies.smartCopy(ctx);

            expect(mockRunFFmpeg).toHaveBeenCalledTimes(1);

            // previous keyframe <= 4.5 → 4
            // duration = 9.0 - 4 = 5

            expect(mockRunFFmpeg).toHaveBeenCalledWith([
                "-ss",
                "4",
                "-i",
                "video.mp4",
                "-t",
                "5",
                "-c",
                "copy",
                "-avoid_negative_ts",
                "1",
                "-y",
                "cut.mp4",
            ]);
        });
    });

    // ------------------------------------------------------------------
    // RE-ENCODE
    // ------------------------------------------------------------------
    describe("reEncode", () => {
        test("uses previous keyframe when available", async () => {
            const ctx = {
                videoInfo,
                startSeconds: 6,
                endSeconds: 10,
                outputPath: "encoded.mp4",
                keyframes: [1, 3, 5] as NonEmptyArray<number>,
            };

            await ExtractionStrategies.reEncode(ctx);

            expect(mockRunFFmpeg).toHaveBeenCalledTimes(1);

            // previous keyframe <= 6 → 5
            // duration = 10 - 6 = 4
            // trim offset = 6 - 5 = 1

            expect(mockRunFFmpeg).toHaveBeenCalledWith([
                "-ss",
                "5",
                "-i",
                "video.mp4",
                "-ss",
                "1",
                "-t",
                "4",
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "copy",
                "-y",
                "encoded.mp4",
            ]);
        });

        test("falls back to startSeconds - 5 when no keyframes provided", async () => {
            const ctx = {
                videoInfo,
                startSeconds: 12,
                endSeconds: 20,
                outputPath: "encoded2.mp4",
            };

            await ExtractionStrategies.reEncode(ctx);

            // fallback seekStart = max(0, startSeconds - 5) → 7
            // trim offset = 12 - 7 = 5
            // duration = 20 - 12 = 8

            expect(mockRunFFmpeg).toHaveBeenCalledWith([
                "-ss",
                "7",
                "-i",
                "video.mp4",
                "-ss",
                "5",
                "-t",
                "8",
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "copy",
                "-y",
                "encoded2.mp4",
            ]);
        });
    });
});
