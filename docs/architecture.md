# Architecture

## Product boundary

The project is a Manifest V3 Chrome extension with a React interface. The extension opens an audio playground in a dedicated tab. That tab owns microphone permission, the `AudioContext`, the processing graph, and monitoring. A small extension service worker only opens or focuses the playground; it does not process audio.

This boundary keeps the first prototype easy to run and makes the audio engine independent from meeting-site code. Closing the playground ends the audio session and releases the microphone track.

## Runtime flow

```text
Toolbar action
    |
Manifest V3 service worker
    |
Playground tab
    |
React controls ---- configuration and lifecycle messages ---- Audio engine
                                                               |
Microphone -> MediaStream source -> AudioWorkletNode -> monitor gain -> output
                                               |
                               crack -> latency -> distortion -> robot
```

React owns user-facing state such as selected device, running status, enabled effects, slider values, and errors. The audio engine owns browser resources and translates typed settings into AudioWorklet messages. The worklet owns sample processing and effect state. No sample data crosses into React.

## Audio lifecycle

1. The user selects a microphone and presses Start.
2. The page requests microphone access with a mono track and asks the browser to disable echo cancellation, noise suppression, and automatic gain control where those constraints are supported.
3. The audio engine creates an `AudioContext`, loads the worklet module, creates the microphone source and worklet node, and connects a monitor gain to the context destination.
4. Monitoring starts muted or at a conservative volume so that headphones can be connected safely.
5. UI changes update the worklet configuration without rebuilding the graph.
6. Stop disconnects nodes, stops microphone tracks, closes the context, clears worklet state, and returns the interface to its idle state.

The lifecycle must handle denied permission, missing devices, a disconnected device, a suspended context, a worklet load failure, and repeated Start/Stop operations. Partial setup must be cleaned up if any step fails.

## Worklet processing

One `AudioWorkletProcessor` applies four focused DSP stages in a fixed order:

1. Crack simulates broken digital speech by silencing short, randomly selected packet-sized sections. Packet loss controls how often sections are dropped; crack intensity controls how long an interruption can continue.
2. Latency stores samples in a preallocated circular buffer and reads them after the configured delay. Jitter periodically changes the read offset within a bounded range.
3. Distortion applies soft clipping and reduced-resolution/sample-and-hold degradation to produce low-quality digital artifacts.
4. Robot uses ring modulation with a low-frequency carrier and blends the modulated signal with the input to create a metallic voice.

Each effect has an enable flag and a bounded amount. Bypass paths preserve the signal. Delay state is cleared when latency is bypassed so old speech cannot reappear after a later enable. Parameters should be smoothed where a direct change could create a click. The processor must clamp invalid or non-finite output before writing it to the output buffer.

The worklet must use the runtime sample rate and current channel layout. Delay buffers are allocated during initialization, and the processing callback must not allocate objects, perform asynchronous work, log repeatedly, or call UI code.

## Extension build shape

The production build contains the Manifest V3 manifest, the service worker bundle, the React playground bundle, and a separately addressable worklet module. All executable resources are packaged with the extension so the default Manifest V3 content security policy can remain in place. No remote script or remote module is required.

The source layout is organized by responsibility:

```text
public/manifest.json
src/extension/background.ts
src/app/App.tsx
src/app/components/
src/audio/engine.ts
src/audio/settings.ts
src/audio/worklet/processor.ts
src/audio/worklet/effects/
tests/audio/
docs/architecture.md
docs/routing.md
```

The effect modules should remain small and deterministic where practical. Seeded randomness in tests makes crack behavior reproducible without making runtime behavior predictable to the listener.

## Practical tradeoffs

One worklet is preferable for this prototype because it keeps effect ordering and shared buffers explicit. Separate Web Audio nodes for every effect would make independent routing easier, but would add parameter synchronization and graph complexity before the behavior is understood.

Tone.js is not required for the initial effects. Direct DSP keeps the prototype small and makes packet loss, delay, distortion, and modulation behavior visible. A library can be added later if a higher quality pitch or vocoder effect becomes a priority.

The extension deliberately starts with local playback. Supplying a processed stream to another application is a separate browser and operating-system integration problem, so it is documented as a follow-on rather than hidden inside the core engine.

## Validation targets

Automated tests should cover pass-through behavior, crack loss boundaries, delay timing, bounded jitter, distortion output validity, robot modulation, bypass behavior, and buffer boundaries at common sample rates. Manual Chrome checks should cover permission denial, device removal, repeated Start/Stop, rapid parameter changes, effect combinations, and a long monitoring session.
