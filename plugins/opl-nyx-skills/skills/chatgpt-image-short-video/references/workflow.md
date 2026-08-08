# ChatGPT Image Short Video Workflow

This reference describes a generalized method for creating a vertical short video from ChatGPT-generated still imagery, local narration, burned subtitles, cover exports, and a final manifest. It intentionally avoids content-specific examples, platform accounts, fixed-tab URLs, private service names, local paths, and handles.

## 1. Inputs and Parameters

Collect these inputs before generation:

- `content_id`: portable slug for the item.
- `title`: short on-video title, usually one or two lines.
- `subtitle` or `hook`: optional second line for cover and opening title.
- `spoken_script`: narration text exactly as the audience should hear it.
- `visual_brief`: subject, mood, scene, palette, realism/stylization, camera/composition, and exclusions.
- `beats`: optional list of 1-5 visual beats when the video needs multiple images.
- `language`: language code for TTS and subtitle splitting.
- `tts_voice` and `tts_rate`: local TTS voice name and speaking-rate adjustment.
- `output_dir`: item-local artifact directory.
- `platform_metadata`: caption, hashtags/topics, publish mode, variant info, and target platform fields if needed.

Recommended defaults:

- Canvas: `1080x1920`.
- FPS: `24` for mostly-static image shorts; `30` if the account's renderer standard is already 30.
- Title safe area: keep primary title between y=560 and y=900, away from top profile overlays and bottom action buttons.
- Subtitle safe area: place captions above the bottom UI zone, typically y=1500 to y=1660 for a 1080x1920 frame.
- Opening title: visible for the first 4-6 seconds, then reduced opacity or retained as a subtle center title.
- Motion: one slow push-in or pan per still image. Avoid scene cuts that outpace narration.

## 2. Fixed Browser Tab Method

Use a pinned or fixed browser tab for ChatGPT image generation. The operator should provide this access out of band, for example through an existing browser-driver tool, pinned tab selector, or manually opened browser profile.

Why fixed tab:

- It preserves the authenticated session and image-generation capability.
- It avoids accidentally using an unrelated reasoning or research conversation.
- It keeps style context stable across image retries for one production batch.
- It makes failure diagnosis clearer: if image generation reports no image tool, first verify the selected fixed tab and image mode before switching tools.

Rules:

- Do not embed the real tab URL in prompts, manifests, skill files, logs intended for sharing, or public artifacts.
- Do not silently downgrade to local placeholder image generation if the fixed tab fails. Report the failure and ask the operator whether to repair the tab, replace it, or use another image provider.
- Keep each video item in its own image-generation exchange or clearly separated prompt block so prompts and outputs remain auditable.
- Record only generic provenance in the manifest, such as `image_provider: chatgpt-fixed-tab`, not private tab identifiers.

## 3. Visual Prompt Pattern

Write prompts as production directions, not as vague style requests. Each prompt should be self-contained because image chat state may still drift.

Template:

```text
Create a vertical 9:16 image for a short video.

Subject:
[one sentence describing the central object/person/place/abstract scene]

Narrative beat:
[what this image must communicate in the video]

Composition:
- 1080x1920 vertical framing.
- Main subject centered or slightly above center.
- Leave clean space in the middle for title text and lower third for subtitles.
- Avoid tiny text, logos, watermarks, UI elements, captions, labels, and unreadable diagrams.

Visual style:
- [realistic / cinematic / editorial / illustrated / product-like / documentary]
- [lighting, color palette, texture, camera/lens, depth]
- [mood and pace]

Constraints:
- No visible text.
- No platform UI.
- No brand marks unless explicitly supplied and licensed.
- No private names, handles, local paths, or account identifiers.
```

For per-beat generation, vary only the beat and composition anchor while keeping style constraints consistent. Example beat roles:

- `opening`: immediate hook, strong readable silhouette, enough negative space for title.
- `explanation`: visual metaphor or scene detail that supports the middle of the script.
- `turn`: contrast, reveal, or changed viewpoint.
- `close`: strong final image suitable for cover reuse.

For a one-image short, generate one high-quality primary image and use motion, overlays, and subtitle timing to carry the video. This is often more coherent than switching images mid-video.

## 4. Fetching and Storing Images

Use the browser-driver tool or manual browser export to download the generated image at the best available resolution. Store it as an item-local source asset, for example:

```text
media/source_image_primary.png
media/source_image_beat_01.png
media/source_image_beat_02.png
```

For each saved image, record:

- prompt text or prompt file path;
- image role, such as `primary`, `opening`, `middle`, `closing`;
- image dimensions;
- generation timestamp;
- retry number if applicable;
- selection note explaining why this image was chosen.

Quality gate before rendering:

- The subject is recognizable at mobile size.
- There is enough uncluttered safe area for title and subtitles.
- There is no generated text, watermark, accidental logo, private handle, or platform UI.
- Hands, faces, diagrams, and focal objects are acceptable for the target style.

## 5. Local TTS and Timing

Generate narration locally so audio timing is deterministic and portable. A typical implementation uses `edge-tts`, but the method works with any local or scripted TTS that can write audio and optionally a subtitle sidecar.

Implementation pattern:

```text
write spoken_script to media/script_for_tts.txt
run TTS:
  input: script_for_tts.txt
  voice: tts_voice
  rate: tts_rate
  output audio: media/narration.mp3 or media/narration.wav
  output subtitles: media/narration.vtt if supported
measure audio seconds with ffprobe
```

Timing rules:

- Use measured audio duration as the video authority.
- Render `ceil((audio_seconds + 0.2) * fps)` frames so the video does not clip the final syllable.
- Encode with `-shortest` when muxing, but do not depend on `-shortest` to hide bad frame counts.
- Keep TTS rate conservative. Over-fast narration creates subtitle drift and weak retention.
- If TTS sidecar timing is rough, use local speech alignment. Preserve the script text as authoritative and use the aligner only for intervals.

Subtitle alignment strategy:

- Split script into caption chunks by punctuation and length.
- Use speech intervals from VTT or aligner output.
- Distribute chunk durations by character weight across speech intervals.
- Merge tiny gaps below roughly 0.35 seconds to avoid flicker.
- Keep true pauses when the aligner shows meaningful silence.

## 6. Subtitle Burn-In

Burn subtitles into frames with PIL, canvas, ASS, or another deterministic renderer. The source scripts used PIL frame rendering; the method is renderer-agnostic.

Caption design:

- Max 1-2 lines.
- Keep each block short enough to read on mobile, often 14-22 CJK characters or 32-48 Latin characters depending on language.
- Use high-contrast text with a shadow or translucent backing.
- Place subtitles above platform controls, not at the bottom edge.
- Do not let subtitles cover the main subject's face or critical object.

For PIL-style rendering:

- Load fonts with a reliable fallback.
- Wrap text by measured pixel width, not only character count.
- Draw a translucent rounded rectangle or shadow behind subtitles.
- Render title and subtitles in a consistent visual hierarchy.

## 7. Frame Rendering and Safe Areas

Prepare the source image:

- Crop to 1080x1920 using a controlled x/y bias so the main subject stays visible.
- Apply mild sharpness and contrast only if needed.
- Add subtle dark overlays or vertical gradients for text readability.
- Avoid aggressive blur or darkening that hides the generated image.

Motion:

- For one-image videos, use a slow push-in, for example 1.0 to 1.035 zoom over the audio duration.
- Keep crop movement minimal; subtitles should feel stable.
- If using multiple beats, cut on sentence boundaries and avoid cuts shorter than 2 seconds unless the platform style demands it.

Opening title:

- Show title and subtitle strongly during the first 4-6 seconds.
- After the opening, either keep a reduced-opacity title or remove it if it competes with subtitles.
- Keep title text in the visual center, not at the extreme top.

Export frames only if your renderer needs them:

```text
media/frames/frame_00000.jpg
media/frames/frame_00001.jpg
...
```

Frame QA:

- Sample frames near 1.2s, 35%, 68%, and final two seconds.
- Confirm the frame is not blank, title/subtitle fit, no text overlaps, and the subject remains in frame.

## 8. Encoding

Typical `ffmpeg` assembly:

```text
ffmpeg -y \
  -framerate FPS \
  -i media/frames/frame_%05d.jpg \
  -i media/narration.mp3 \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -r FPS \
  -c:a aac \
  -b:a 160k \
  -shortest \
  -movflags +faststart \
  media/final.mp4
```

If rendering directly from filters or a canvas, keep the same output contract: H.264, yuv420p, AAC, correct FPS, and faststart.

After encoding:

- Probe duration and dimensions.
- Confirm video is 1080x1920.
- Confirm audio exists and is not silent.
- Open or sample frames from the final MP4, not only pre-encoded frames.

## 9. Covers

Create covers from the primary image or a strong rendered frame. Export both:

```text
covers/cover_4_3_1200x900.jpg
covers/cover_3_4_900x1200.jpg
```

Cover rules:

- Horizontal cover: 4:3, usually 1200x900.
- Vertical cover: 3:4, usually 900x1200.
- Crop with explicit x/y bias; do not rely on uncontrolled center crop when the subject is off-center.
- Add title/subtitle overlay only if it stays readable after crop.
- Keep public-safe text only. No draft labels, internal variant names, local paths, private account labels, or browser access details.
- Write a small evidence JSON or image-size check if this is part of an automated pipeline.

## 10. Manifest

Write a manifest next to the item artifacts. YAML or JSON are both fine if the consuming publisher can read it.

Recommended fields:

```yaml
id: example_content_id
platform: target_platform
title: Public title
caption: Public caption text
publish_mode: manual
status: pending
enabled: true
video_file: media/final.mp4
cover_horizontal_file: covers/cover_4_3_1200x900.jpg
cover_vertical_file: covers/cover_3_4_900x1200.jpg
hashtags:
  - "#example"
topics:
  - example-topic
variant_id: concise-public-safe-variant-id
variant_axis: visual_style
variant_hypothesis: Short private planning note if the manifest is not public-facing
audio_provider: local-tts
audio_voice: voice-name
audio_rate: "+0%"
subtitle_alignment: script-text-with-local-speech-timing
image_provider: chatgpt-fixed-tab
source_images:
  - media/source_image_primary.png
```

If a manifest may become public or be uploaded to a platform scheduler, remove private planning fields such as `variant_hypothesis` or keep them in a separate private generation manifest.

## 11. Public-Safety Redaction

Before packaging, publishing, or sharing artifacts, scan:

- `SKILL.md` and references;
- prompts;
- source image file names;
- manifests;
- title overlays;
- captions and hashtags;
- cover text;
- logs and evidence JSON.

Block or rewrite:

- local filesystem paths;
- fixed-tab URLs or browser-session identifiers;
- access tokens and credential environment variables;
- private account names, handles, or workspaces;
- internal project names, draft labels, experiment labels, and unpublished tool names;
- generated text inside images that the operator did not explicitly approve.

## 12. Minimal Artifact Tree

```text
item/
  media/
    script_for_tts.txt
    narration.mp3
    narration.vtt
    source_image_primary.png
    final.mp4
  covers/
    cover_4_3_1200x900.jpg
    cover_3_4_900x1200.jpg
  evidence/
    qa_frame_01.jpg
    qa_frame_02.jpg
    cover_export_check.json
  manifests/
    short_video.yaml
```

Keep transient frame folders optional. If frame folders are huge, delete them after QA or keep only sampled evidence frames.

## 13. Failure Handling

- Fixed tab missing image tool: verify the pinned tab and image-generation mode; do not silently switch providers.
- Image has text/watermark/private labels: regenerate or crop out; do not patch public text unless the result is visually clean.
- TTS duration differs from expected script length: trust measured duration and regenerate frames.
- Captions drift: re-align with local speech timing and preserve script text as authoritative.
- Covers crop the subject or text: adjust crop bias and re-export both cover sizes.
- Manifest contains private paths: rewrite paths relative to the item root or package root.
