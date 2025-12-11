![npm](https://img.shields.io/npm/v/favc)
![downloads](https://img.shields.io/npm/dm/favc)
![license](https://img.shields.io/badge/license-MIT-blue.svg)
![ts](https://img.shields.io/badge/TypeScript-declarations-blue)

# FAVC

> Extract video clips with precision control over speed vs. accuracy trade-offs

FAVC (Frame-Accurate Video Clipper) is a powerful yet simple tool for extracting temporal segments from video files. Whether you need lightning-fast rough cuts or frame-perfect precision, FAVC gives you control over the speed-accuracy trade-off through three distinct extraction strategies.

## Why FAVC?

Video clipping seems simple until you need it to be **fast** _and_ **accurate**. Most tools force you to choose:

- **FFmpeg with `-c copy`** → Fast but imprecise (snaps to keyframes)
- **FFmpeg with re-encoding** → Accurate but painfully slow
- **Video editors** → Manual, not scriptable, heavyweight

**FAVC gives you both**: choose your strategy based on your needs, use it from the command line or integrate it into your code, and get structured reports for every operation.

## Index

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Example](#example-report-output)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Features

**Three Extraction Strategies**

- `keyframe-only` - Maximum speed, keyframe-aligned boundaries
- `smart-copy` - Balanced approach, exact end point, no re-encoding
- `re-encode` - Frame-perfect accuracy at both boundaries

**Flexible Timecode Formats**

- Decimal seconds: `125.5`
- HH:MM:SS with milliseconds: `01:23:45.500`
- Frame numbers: `1234f` (requires framerate)

**Dual-Mode Design**

- **CLI** for terminal use, scripts, and manual operations
- **Library** for programmatic use in Node.js/TypeScript applications

**Structured Outputs**

- JSON reports with actual extracted ranges
- Processing time metrics
- Video metadata (resolution, framerate, codec, keyframe intervals)

**Thumbnail Extraction**

- Frame-accurate thumbnail generation at any timestamp

## Quick Start

### Extract a single clip

```bash
favc extract -i input.mp4 -s 00:01:23.500 -e 00:01:45.200 -o clip.mp4
```

### Extract with different strategy

```bash
# Fast, keyframe-accurate (may shift by ~2 seconds)
favc extract -i input.mp4 -s 60 -e 90 -o clip.mp4 --strategy keyframe-only

# Frame-accurate but slow (re-encodes)
favc extract -i input.mp4 -s 60 -e 90 -o clip.mp4 --strategy re-encode
```

### Extract multiple clips

Create `clips.json`:

```json
[
  { "start": "00:01:00", "end": "00:01:30", "output": "intro.mp4" },
  { "start": "00:05:00", "end": "00:05:45", "output": "highlight.mp4" }
]
```

Run:

```bash
favc extract -i input.mp4 --clips clips.json --report report.json
```

### Extract thumbnail

```bash
favc thumbnail -i input.mp4 -t 00:05:23.120 -o thumb.jpg
```

### Library Usage

```typescript
import { VideoClipper } from 'favc';

const report = await VideoClipper.extractClips('input.mp4', [
  {
    start: '00:01:00',
    end: '00:02:00',
    output: 'clip1.mp4',
    strategy: 'smart-copy'
  }
]);

console.log(\`Extracted \${report.clips[0].frames_included} frames\`);
console.log(\`Processing time: \${report.total_processing_time_ms}ms\`);
```

---
## Strategy Comparison

| Strategy | Per-Clip Speed | Upfront Cost | Best For |
|----------|----------------|--------------|----------|
| `keyframe-only` | Fastest | Full keyframe scan | Many clips from same video |
| `smart-copy` | Fast | Full keyframe scan | Batch extraction (5+ clips) |
| `re-encode` | Slow | None | Single/few clips, frame-perfect |

[!TIP] Rule of thumb: Use `smart-copy` (default) unless you need frame-perfect accuracy (`re-encode`) or maximum speed (`keyframe-only`).

### When Each Strategy is Fastest

**Use `re-encode` when:**
- Extracting 1-3 clips from a single video
- Source video is very long (keyframe scan would be expensive)
- You need frame-perfect accuracy anyway

**Use `smart-copy` when:**
- Extracting 5+ clips from the same video (amortizes keyframe scan cost)
- Processing multiple videos in a pipeline
- Clip accuracy of ±GOP length is acceptable

**Use `keyframe-only` when:**
- You need maximum per-clip speed and have many clips
- Rough cuts are sufficient (±2 second variance is acceptable)

## Installation

### From NPM

```bash
npm install -g favc
```

### From source

```bash
git clone https://github.com/mavesc/favc.git
cd favc
npm install
npm run build
npm link
```

### Prerequisites

- Node.js 18+
- FFmpeg 4.4+ with libx264 support

Check FFmpeg:

```bash
ffmpeg -version
```

## Example Report Output

```json
{
  "source": {
    "file": "input.mp4",
    "duration": 3600.5,
    "framerate": 29.97,
    "width": 1920,
    "height": 1080,
    "codec": "h264",
    "keyframeInterval": 2.0
  },
  "clips": [
    {
      "requested_start": "00:01:23.500",
      "requested_end": "00:01:45.200",
      "actual_start": "00:01:22.022",
      "actual_end": "00:01:45.212",
      "strategy": "smart-copy",
      "frames_included": 697,
      "re_encoded": false,
      "processing_time_ms": 1243,
      "output": "clip1.mp4"
    }
  ],
  "total_processing_time_ms": 12450
}
```

---

## Testing

Use video/test_video.mp4 or generate it yourself leveraging ffmpeg:

```bash
ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 \
  -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='%{pts\:hms}':x=(w-tw)/2:y=h-th-10:fontsize=48:fontcolor=white" \
  -c:v libx264 -preset fast -crf 23 test_video.mp4
```

---

## Troubleshooting

### "ffprobe: command not found"

Install FFmpeg:

- **macOS**: `brew install ffmpeg`
- **Ubuntu**: `sudo apt install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Keyframe extraction is slow

This is normal for long videos. The tool needs to read all frames to find keyframes. For 2-hour videos, expect 30-60 seconds.

**Optimization**: Use `re-encode` strategy if you don't need keyframe data.

### Audio/video out of sync in output

This can happen with variable framerate (VFR) sources. Try:

```bash
favc extract -i input.mp4 -s START -e END -o out.mp4 --strategy re-encode
```

### Clip is slightly longer than requested

With `smart-copy` and `keyframe-only`, the tool includes extra frames to avoid re-encoding. Use `re-encode` for exact duration.
