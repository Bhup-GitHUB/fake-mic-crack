# fake-mic-crack

`fake-mic-crack` is a Chrome extension prototype that captures microphone audio, applies simulated poor voice quality effects, and plays the processed result locally. It is designed as a small Web Audio API and AudioWorklet experiment that can later be adapted for meeting applications.

The prototype can simulate:

- Short audio interruptions and packet loss
- Playback latency and jitter
- Low-quality digital distortion
- A synthetic robotic voice

The current local playback workflow is intended for development and testing. It does not yet register itself as a microphone that Google Meet or another application can select.

## Requirements

- Node.js 20 or newer
- Bun 1.1 or newer
- Google Chrome with permission to use a microphone
- Headphones for monitoring, to avoid acoustic feedback

## Setup

Install dependencies and create a production extension build:

```bash
bun install
bun run build
```

The committed `bun.lock` file keeps dependency resolution reproducible. Use the development watcher while working on the extension:

```bash
bun run dev
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select the generated `dist` directory. Click the extension toolbar action to open the audio playground in a dedicated tab.

The playground requests microphone permission only after Start is pressed. Select an input device, start monitoring at a low volume, and enable effects one at a time while validating the result with headphones.

Available development checks are:

```bash
bun run typecheck
bun test
```

Use the project scripts as the source of truth if their names or available checks change during prototype development.

## Audio pipeline

```text
Microphone
    |
MediaStreamAudioSourceNode
    |
AudioWorkletNode
    |  crack -> latency/jitter -> distortion -> robot
Gain and monitoring controls
    |
AudioContext destination
```

The React UI controls configuration and lifecycle only. Audio samples stay inside the Web Audio graph. The AudioWorklet owns real-time processing and uses preallocated state for delay buffers, which keeps the audio callback free of UI work and avoidable allocations.

Read [docs/architecture.md](docs/architecture.md) for the component boundaries, effect behavior, lifecycle, and technical tradeoffs.

## Google Meet and virtual microphone routing

The first milestone is local monitoring. A browser extension cannot automatically become a system-wide microphone, so routing processed audio into Google Meet needs a separate integration or an operating-system virtual audio device.

The routing options and current feasibility assessment are documented in [docs/routing.md](docs/routing.md). The document covers a future `MediaStreamAudioDestinationNode` approach for browser integration and BlackHole on macOS or VB-Cable on Windows for external routing experiments.

## Limitations

- Packet loss is simulated by changing audio samples; network packets are not dropped.
- Local monitoring does not make the processed stream selectable as a microphone in Meet.
- Browser and operating-system buffering add latency beyond the configured effect value.
- Speaker monitoring can feed back into the microphone.
- Browser microphone processing and device changes can affect the result.
- Meet integration depends on browser capture behavior and may require maintenance when Meet changes.
- Effect parameters are prototype controls and are not intended to model a particular codec or network.

## Project status

This is a prototype. The implementation is intentionally limited to a browser extension, Web Audio API, and AudioWorklet so that the processing engine can be evaluated before adding virtual-device support or native code.
