import { VideoAnalyzer } from "../src/core/analyzer";
import { NonEmptyArray } from "../src/types";
import { runFFprobe } from "../src/utils/ffmpeg";

jest.mock("../src/utils/ffmpeg", () => ({
    runFFprobe: jest.fn(),
}));

const mockRunFFprobe = runFFprobe as jest.Mock;

const wrap = (obj: any) => JSON.stringify(obj);

describe("VideoAnalyzer.analyze", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("extracts full video info from ffprobe", async () => {
        mockRunFFprobe
            .mockResolvedValueOnce(
                wrap({
                    streams: [
                        {
                            width: 1920,
                            height: 1080,
                            codec_name: "h264",
                            r_frame_rate: "30000/1001",
                            duration: "10.5",
                            nb_frames: "315",
                        },
                    ],
                })
            )
            .mockResolvedValueOnce(
                wrap({
                    format: { duration: "10.5" },
                })
            );

        const info = await VideoAnalyzer.analyze("movie.mp4");

        expect(info).toEqual({
            file: "movie.mp4",
            duration: 10.5,
            framerate: 30000 / 1001,
            width: 1920,
            height: 1080,
            codec: "h264",
        });

        expect(mockRunFFprobe).toHaveBeenCalledTimes(2);
        expect(mockRunFFprobe.mock.calls[0][0]).toContain("-show_entries");
    });

    test("falls back to format.duration when stream.duration is missing", async () => {
        mockRunFFprobe
            .mockResolvedValueOnce(
                wrap({
                    streams: [
                        {
                            width: 1280,
                            height: 720,
                            codec_name: "vp9",
                            r_frame_rate: "24/1",
                            // duration missing
                        },
                    ],
                })
            )
            .mockResolvedValueOnce(
                wrap({
                    format: { duration: "42.123" },
                })
            );

        const info = await VideoAnalyzer.analyze("clip.webm");

        expect(info.duration).toBe(42.123);
    });

    test("throws when no video stream exists", async () => {
        mockRunFFprobe
            .mockResolvedValueOnce(wrap({ streams: [] }))
            .mockResolvedValueOnce(wrap({ format: { duration: "0" } }));

        await expect(VideoAnalyzer.analyze("badfile.mp4")).rejects.toThrow(
            "No video stream found in badfile.mp4"
        );
    });
});

describe("VideoAnalyzer.getKeyframes", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("extracts and sorts keyframes", async () => {
        mockRunFFprobe.mockResolvedValueOnce(
            wrap({
                frames: [
                    { key_frame: 1, pkt_pts_time: "5.0" },
                    { key_frame: 0, pkt_pts_time: "6.0" },
                    { key_frame: 1, pkt_pts_time: "1.5" },
                ],
            })
        );

        const result = await VideoAnalyzer.getKeyframes("video.mp4");
        expect(result).toEqual([1.5, 5.0]); // sorted, only keyframes
    });

    test("returns empty list if no frames", async () => {
        mockRunFFprobe.mockResolvedValueOnce(wrap({ frames: [] }));
        expect(await VideoAnalyzer.getKeyframes("x.mkv")).toEqual([]);
    });
});

describe("VideoAnalyzer.findPreviousKeyframe", () => {
    test("finds nearest keyframe before timestamp", () => {
        const kf = [0.5, 1.0, 2.5, 10.0] as NonEmptyArray<number>;
        expect(VideoAnalyzer.findPreviousKeyframe(2.0, kf)).toBe(1.0);
        expect(VideoAnalyzer.findPreviousKeyframe(10.0, kf)).toBe(10.0);
    });

    test("returns 0 if no keyframe is before timestamp", () => {
        const kf = [3.0, 4.0] as NonEmptyArray<number>;
        expect(VideoAnalyzer.findPreviousKeyframe(2.0, kf)).toBe(0);
    });
});

describe("VideoAnalyzer.estimateKeyframeInterval", () => {
    test("returns median interval from keyframes", () => {
        const kf = [0, 2, 4, 7] as NonEmptyArray<number>; // intervals: [2, 2, 3]
        expect(VideoAnalyzer.estimateKeyframeInterval(kf)).toBe(2);
    });

    test("uses default value when too few keyframes", () => {
        expect(VideoAnalyzer.estimateKeyframeInterval([1])).toBe(2.0);
        expect(VideoAnalyzer.estimateKeyframeInterval([0])).toBe(2.0);
    });
});
