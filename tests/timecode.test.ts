import { TimecodeParser } from "../src/core/timecode";

describe("TimecodeParser", () => {

    // -----------------------------
    // PARSE()
    // -----------------------------

    describe("parse() - frames", () => {
        test.each([
            ["0f", 24, 0],
            ["24f", 24, 1],
            ["48f", 24, 2],
            ["100f", 25, 4],
            ["300f", 30, 10],
        ])("parses %s at %d fps → %d seconds", (input, framerate, expected) => {
            expect(TimecodeParser.parse(input, framerate)).toBeCloseTo(expected);
        });

        test("throws on invalid frame numbers", () => {
            expect(() => TimecodeParser.parse("abcdf", 24)).toThrow();
        });
    });

    describe("parse() - HH:MM:SS.mmm", () => {
        test.each([
            ["00:00:00.000", 0],
            ["00:00:01.000", 1],
            ["00:01:00.000", 60],
            ["01:00:00.000", 3600],
            ["01:23:45.500", 1 * 3600 + 23 * 60 + 45.5],
        ])("parses timecode %s → %d seconds", (input, expected) => {
            expect(TimecodeParser.parse(input, 24)).toBeCloseTo(expected);
        });

        test("throws on wrong number of segments", () => {
            expect(() => TimecodeParser.parse("10:00", 24)).toThrow();
            expect(() => TimecodeParser.parse("10:00:00:00", 24)).toThrow();
        });

        test("throws on NaN parts", () => {
            expect(() => TimecodeParser.parse("aa:10:00", 24)).toThrow();
            expect(() => TimecodeParser.parse("10:aa:00", 24)).toThrow();
            expect(() => TimecodeParser.parse("10:10:aa", 24)).toThrow();
        });
    });

    describe("parse() - seconds-only", () => {
        test.each([
            ["0", 0],
            ["1", 1],
            ["2.5", 2.5],
            ["120.750", 120.75],
        ])("parses seconds %s → %d", (input, expected) => {
            expect(TimecodeParser.parse(input, 30)).toBeCloseTo(expected);
        });

        test("throws on invalid seconds format", () => {
            expect(() => TimecodeParser.parse("yo no soy tiempo", 24)).toThrow();
        });
    });

    // -----------------------------
    // FORMAT()
    // -----------------------------

    describe("format()", () => {
        test.each([
            [0, "00:00:00.000"],
            [1, "00:00:01.000"],
            [60, "00:01:00.000"],
            [3600, "01:00:00.000"],
            [3661.789, "01:01:01.789"],
        ])("formats %d seconds → %s", (input, expected) => {
            expect(TimecodeParser.format(input)).toBe(expected);
        });
    });

    // -----------------------------
    // secondsToFrameNumber()
    // -----------------------------

    describe("secondsToFrameNumber()", () => {
        test.each([
            [1, 24, 24],
            [1, 30, 30],
            [2.5, 24, 60],
            [10, 60, 600],
            [0.0416667, 24, 1], // ~1 frame
        ])("converts %d seconds at %d fps → %d frames", (seconds, framerate, expected) => {
            expect(TimecodeParser.secondsToFrameNumber(seconds, framerate)).toBeCloseTo(expected);
        });
    });

    describe("parse() - NTSC 29.97 fps", () => {
        const NTSC = 30000 / 1001; // ≈29.97002997

        test.each([
            ["0f", 0],
            ["1f", 1 / NTSC],
            ["30f", 30 / NTSC],   // ~1 second
            ["300f", 300 / NTSC], // ~10 seconds
            ["2997f", 2997 / NTSC], // ~100 seconds
        ])("parses %s → ~%d seconds", (input, expected) => {
            expect(TimecodeParser.parse(input, NTSC)).toBeCloseTo(expected);
        });
    });

    describe("secondsToFrameNumber() - NTSC 29.97", () => {
        const NTSC = 30000 / 1001;

        test.each([
            [1, 29],     // 1 sec ≈ 29.97 → floor = 29
            [10, 299],   // 10 sec → 299.7 → floor = 299
            [100, 2997], // 100 sec → 2997 frames
        ])("converts %d seconds → %d frames", (seconds, expected) => {
            expect(TimecodeParser.secondsToFrameNumber(seconds, NTSC)).toBe(expected);
        });
    });


});
