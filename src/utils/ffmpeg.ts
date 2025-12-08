import { spawn } from "child_process";

export async function runFFprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const process = spawn("ffprobe", args);

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code != 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to spawn ffprobe: ${error.message}`));
    });
  });
}

export async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = "";

    const process = spawn("ffmpeg", args);

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code != 0) {
        reject(new Error(`ffmpeg failed: ${stderr}`));
      } else {
        resolve();
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to spawn ffmpeg: ${error.message}`));
    });
  });
}
