import { runFFprobe, runFFmpeg } from "../src/utils/ffmpeg";
import { spawn } from "child_process";

jest.mock("child_process");

function mockSpawn() {
  let onClose: ((code: number) => void) | null;
  let onError: ((err: any) => void) | null;

  const stdoutHandlers: ((chunk: string) => void)[] = [];
  const stderrHandlers: ((chunk: string) => void)[] = [];

  const fakeProcess = {
    stdout: {
      on: (_event: string, fn: any) => stdoutHandlers.push(fn),
    },
    stderr: {
      on: (_event: string, fn: any) => stderrHandlers.push(fn),
    },
    on: (event: string, fn: any) => {
      if (event === "close") onClose = fn;
      if (event === "error") onError = fn;
    },
  };

  return {
    fakeProcess,

    emitStdout(chunk: string) {
      stdoutHandlers.forEach((fn) => fn(chunk));
    },

    emitStderr(chunk: string) {
      stderrHandlers.forEach((fn) => fn(chunk));
    },

    close(code: number) {
      if (!onClose) throw new Error("close handler was never registered");
      onClose(code);
    },

    error(err: any) {
      if (!onError) throw new Error("error handler was never registered");
      onError(err);
    },
  };
}

describe("runFFprobe", () => {
  test("resolves with stdout when ffprobe exits with code 0", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFprobe(["-v", "quiet"]);

    // ffprobe writing stdout
    mock.emitStdout("hello world\n");

    // successful exit
    mock.close(0);

    await expect(promise).resolves.toBe("hello world\n");
  });

  test("rejects when ffprobe exits with non-zero code", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFprobe(["-broken"]);

    mock.emitStderr("error: invalid input\n");
    mock.close(1);

    await expect(promise).rejects.toThrow(
      "ffprobe failed: error: invalid input\n"
    );
  });

  test("rejects when spawn throws error", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFprobe([]);

    mock.error(new Error("spawn EPERM"));

    await expect(promise).rejects.toThrow(
      "Failed to spawn ffprobe: spawn EPERM"
    );
  });
});

describe("runFFmpeg", () => {
  test("resolves when ffmpeg exits with code 0", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFmpeg(["-version"]);

    mock.close(0);

    await expect(promise).resolves.toBeUndefined();
  });

  test("rejects when ffmpeg exits with non-zero code", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFmpeg(["-broken"]);

    mock.emitStderr("ffmpeg error\n");
    mock.close(1);

    await expect(promise).rejects.toThrow("ffmpeg failed: ffmpeg error\n");
  });

  test("rejects when spawn fails", async () => {
    const mock = mockSpawn();

    (spawn as jest.Mock).mockReturnValue(mock.fakeProcess);

    const promise = runFFmpeg([]);

    mock.error(new Error("spawn ENOENT"));

    await expect(promise).rejects.toThrow(
      "Failed to spawn ffmpeg: spawn ENOENT"
    );
  });
});
