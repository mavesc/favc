export class TimecodeParser {
    /**
     * Parses various timecode formats to seconds
     * Supports:
     * 1. Frames: "1234f" (requires framerate)
     * 2. HH:MM:SS.mmm: "01:23:45.500"
     * 3. Seconds: "125.5"
     */
    static parse(input: string, framerate: number): number {
        input = input.trim();

        // 1.
        if (input.endsWith('f')) {
            const frameNum = parseInt(input.slice(0, -1));
            if (isNaN(frameNum)) throw new Error(`Invalid frame number: ${input}`);
            return frameNum / framerate
        }

        // 2.
        if (input.includes(':')) {
            const parts = input.split(':');
            if (parts.length !== 3) {
                throw new Error(`Invalid timecode format: ${input}. Expected HH:MM:SS.mmm`);
            }

            const hours = parseInt(parts[0]!);
            const minutes = parseInt(parts[1]!);
            const seconds = parseFloat(parts[2]!);

            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
                throw new Error(`Invalid timecode values: ${input}`);
            }

            return hours * 3600 + minutes * 60 + seconds;
        }

        // 3.
        const seconds = parseFloat(input);

        if (isNaN(seconds)) {
            throw new Error(`Invalid time format: ${input}`);
        }

        return seconds;
    }

    static format(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = (seconds % 60).toFixed(3);

        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${secs.padStart(6, '0')}`;
    }

    static secondsToFrameNumber(seconds: number, framerate: number): number {
        return Math.floor(framerate * seconds);
    }
}