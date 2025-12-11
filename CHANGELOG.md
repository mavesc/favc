# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-12-11

### Added

- Initial release of FAVC (Frame-Accurate Video Clipper)
- Three extraction strategies: `keyframe-only`, `smart-copy`, and `re-encode`
- `VideoClipper` core class with `extractClips()` method
- `VideoAnalyzer` for video metadata extraction and keyframe detection
- `TimecodeParser` supporting multiple timecode formats:
  - Decimal seconds (e.g., `125.5`)
  - HH:MM:SS.mmm format (e.g., `01:23:45.500`)
  - Frame numbers with `f` suffix (e.g., `1234f`)
- CLI commands:
  - `favc extract` - Extract one or multiple clips
  - `favc thumbnail` - Extract single frame as image
- Batch extraction from JSON clips file
- Structured JSON report output with:
  - Actual extracted timecode ranges
  - Frame counts and processing times
  - Source video metadata (resolution, framerate, codec)
  - Keyframe interval statistics
- FFmpeg/FFprobe integration via Node.js child processes
- Support for variable and fractional framerates (29.97, 23.976, etc.)
- TypeScript types exported for library usage
- Dual-mode package design (CLI + importable library)
- Input validation for video files and timecode ranges
- Error handling for common failure scenarios
- MIT license

### Technical Implementation

- Keyframe position detection via FFprobe frame analysis
- Smart FFmpeg command generation based on strategy selection
- PTS/DTS timestamp handling for accurate extraction
- GOP (Group of Pictures) structure analysis
- Optimized seeking strategies (pre-input vs. post-input `-ss` positioning)

### Notes

- This initial release establishes the foundation for frame-accurate video extraction
- The tool is designed for both standalone CLI usage and programmatic integration
- Keyframe extraction for long videos (2+ hours) may take 30-60 seconds due to full frame analysis
- Future versions may include optimizations for keyframe detection caching
- Planned features for future releases:
  - Subtitle track preservation during extraction
  - Audio-only extraction mode
  - Multi-clip concatenation
  - Preview mode with thumbnail grid generation
  - Caching layer for video metadata and keyframe positions

---
