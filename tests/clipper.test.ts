import { VideoClipper } from "../src/core/clipper";
import { VideoAnalyzer } from "../src/core/analyzer";
import { ExtractionStrategies } from "../src/core/strategies";
import { TimecodeParser } from "../src/core/timecode";
import { runFFmpeg } from "../src/utils/ffmpeg";
import { VideoInfo } from "../src/types";

// -------------------------
//       MOCKS
// -------------------------
jest.mock("../src/core/analyzer");
jest.mock("../src/core/strategies");
jest.mock("../src/core/timecode");
jest.mock("../src/utils/ffmpeg", () => ({
    runFFmpeg: jest.fn(),
}));

const mockAnalyze = VideoAnalyzer.analyze as jest.Mock;
const mockGetKeyframes = VideoAnalyzer.getKeyframes as jest.Mock;
const mockEstimate = VideoAnalyzer.estimateKeyframeInterval as jest.Mock;

const mockKFOnly = ExtractionStrategies.keyframeOnly as jest.Mock;
const mockSmart = ExtractionStrategies.smartCopy as jest.Mock;
const mockReEncode = ExtractionStrategies.reEncode as jest.Mock;
const mockFindNearest = ExtractionStrategies.findNearestKeyframe as jest.Mock;
const mockFindPrevious = ExtractionStrategies.findPreviousKeyframe as jest.Mock;

const mockParse = TimecodeParser.parse as jest.Mock;
const mockFormat = TimecodeParser.format as jest.Mock;

// const mockFF = runFFmpeg as jest.Mock;

const fakeVideoInfo: VideoInfo = {
    file: "video.mp4",
    duration: 20,
    framerate: 30,
    width: 1920,
    height: 1080,
    codec: "h264",
}

beforeEach(() => {
    jest.clearAllMocks();
});

// -------------------------------------------
// validateTimeRange
// -------------------------------------------
describe("VideoClipper.validateTimeRange", () => {
    test("throws if start >= end", () => {
        expect(() =>
            VideoClipper.validateTimeRange(
                { start: "5s", end: "5s", output: "x.mp4" },
                5,
                5,
                100
            )
        ).toThrow();
    });

    test("throws if out of bounds", () => {
        expect(() =>
            VideoClipper.validateTimeRange(
                { start: "0s", end: "200s", output: "x.mp4" },
                0,
                200,
                100
            )
        ).toThrow();
    });

    test("does not throw for valid ranges", () => {
        expect(() =>
            VideoClipper.validateTimeRange(
                { start: "0s", end: "10s", output: "x.mp4" },
                0,
                10,
                100
            )
        ).not.toThrow();
    });
});

// -------------------------------------------
// extractClips
// -------------------------------------------
describe("VideoClipper.extractClips", () => {

    beforeEach(() => {
        mockAnalyze.mockResolvedValue(fakeVideoInfo);
        mockFormat.mockImplementation((n: any) => {
            if (typeof n !== "number") {
                console.warn("⚠ mockFormat called with non-number:", n);
                return "0.00s";
            }
            return `${n.toFixed(2)}s`;
        });
    });

    test("uses smart-copy by default", async () => {
        mockParse.mockReturnValueOnce(2).mockReturnValueOnce(5);
        mockGetKeyframes.mockResolvedValue([0, 1, 2, 4]);
        mockEstimate.mockReturnValue(2);
        mockSmart.mockResolvedValue(undefined);

        const report = await VideoClipper.extractClips(
            "video.mp4",
            [{ start: "2s", end: "5s", output: "out.mp4" }],
        );

        expect(mockSmart).toHaveBeenCalledTimes(1);
        expect(report.clips[0]!.strategy).toBe("smart-copy");
    });

    test("routes to keyframe-only", async () => {
        mockParse.mockReturnValueOnce(3).mockReturnValueOnce(8);
        mockGetKeyframes.mockResolvedValue([0, 3, 6, 9]);
        mockEstimate.mockReturnValue(2);
        mockKFOnly.mockResolvedValue(undefined);

        await VideoClipper.extractClips("video.mp4", [
            { start: "3s", end: "8s", output: "clip.mp4", strategy: "keyframe-only" },
        ]);

        expect(mockKFOnly).toHaveBeenCalled();
    });

    test("routes to re-encode", async () => {
        mockParse.mockReturnValueOnce(1).mockReturnValueOnce(4);
        mockReEncode.mockResolvedValue(undefined);

        // re-encode DOES NOT require keyframes
        await VideoClipper.extractClips("video.mp4", [
            { start: "1s", end: "4s", output: "clip.mp4", strategy: "re-encode" },
        ]);

        expect(mockGetKeyframes).not.toHaveBeenCalled();
        expect(mockReEncode).toHaveBeenCalled();
    });

    test("creates correct ClipResult fields", async () => {
        mockParse.mockReturnValueOnce(10).mockReturnValueOnce(20);
        mockGetKeyframes.mockResolvedValue([0, 10, 20]);
        mockEstimate.mockReturnValue(10);
        mockSmart.mockResolvedValue(undefined);
        mockFindNearest.mockReturnValue(10);
        mockFindPrevious.mockReturnValue(10);
        mockAnalyze.mockResolvedValue(fakeVideoInfo);

        const report = await VideoClipper.extractClips("video.mp4", [
            { start: "10s", end: "20s", output: "c.mp4" },
        ]);

        const r = report.clips[0]!;

        expect(r.requested_start).toBe("10s");
        expect(r.actual_start).toBe("10.00s");
        expect(r.frames_included).toBe(30 * 10); // 10 seconds * 30fps
        expect(r.output).toBe("c.mp4");
    });
});

// -------------------------------------------
// extractThumbnail
// -------------------------------------------
describe("VideoClipper.extractThumbnail", () => {
    test("throws if timestamp out of bounds", async () => {
        mockAnalyze.mockResolvedValue({ ...fakeVideoInfo, duration: 10 });
        mockParse.mockReturnValue(20);

        await expect(
            VideoClipper.extractThumbnail("video.mp4", "20s", "thumb.jpg")
        ).rejects.toThrow();
    });

    test("calls ffmpeg with correct args", async () => {
        mockAnalyze.mockResolvedValue({ ...fakeVideoInfo, duration: 60 });
        mockParse.mockReturnValue(12);

        await VideoClipper.extractThumbnail("video.mp4", "12s", "thumb.jpg");

        expect(runFFmpeg).toHaveBeenCalledWith([
            "-ss",
            "12",
            "-i",
            "video.mp4",
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-y",
            "thumb.jpg",
        ]);
    });
});
