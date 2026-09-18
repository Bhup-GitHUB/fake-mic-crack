# Audio routing research

## Current behavior

The prototype captures the microphone and sends processed audio to the playground tab's default audio output. Chrome extensions do not automatically expose an arbitrary processed stream as a system-wide microphone. The local playground is therefore the first validation target, and Google Meet routing remains a separate experiment.

Use headphones during local monitoring. A live microphone routed to speakers can create feedback, and the configured effect delay can make that feedback harder to control.

## Browser stream approach

Web Audio can expose the output of an effects graph as a `MediaStream` with `AudioContext.createMediaStreamDestination()`. A future browser integration could use this stream as the audio track in a meeting capture path:

```text
Meet microphone request
        |
Page-context capture integration
        |
Shared effects engine
        |
MediaStreamAudioDestinationNode
        |
Processed audio track returned to the meeting
```

The difficult part is replacing or intercepting the stream that Meet uses while preserving normal microphone permissions, mute state, device changes, video tracks, and meeting reconnect behavior. A content script runs in an isolated extension world, so it cannot assume that page-owned media objects are directly replaceable. A future experiment may need a small page-context bridge and careful handling of the timing of `getUserMedia` calls.

The integration must be treated as compatibility-sensitive. Meet can change its capture code, and browser permission or autoplay rules can change the conditions under which a stream is accepted. The implementation should first be tested in a disposable meeting with an obvious test sound, then with mute/unmute, device switching, tab reload, and reconnect scenarios.

This approach does not alter network packets. It supplies a different audio stream before WebRTC encoding, so packet loss and crack effects remain audio-level simulations.

## macOS: BlackHole

[BlackHole](https://existential.audio/blackhole/) is a macOS virtual audio driver that can expose application audio to another application. A routing experiment can send the browser's processed output to a BlackHole output device and select the corresponding BlackHole input device as the microphone in Meet.

The exact setup depends on the installed BlackHole channel count and macOS sound settings. The operator may need to configure Chrome's output device, a multi-output or aggregate device in Audio MIDI Setup, and Meet's microphone selection separately. System-wide routing adds buffering and can introduce another level of latency, so the configured effect delay should be measured at the meeting endpoint rather than assumed to be exact.

BlackHole is an external dependency. The extension should detect missing devices through browser device enumeration and explain that the driver must be installed and configured outside the extension. The prototype does not install, configure, or modify audio drivers.

## Windows: VB-Cable

[VB-CABLE](https://vb-audio.com/Cable/) provides a Windows virtual audio cable. A routing experiment can send processed browser audio to the virtual cable playback endpoint and select the virtual cable recording endpoint as the microphone in Meet.

Windows sound settings and the browser's output-device behavior determine whether an additional audio router or mixer is needed. Verify the selected sample rate, exclusive-mode settings, monitoring path, and mute state. As with BlackHole, this adds system buffering and can change latency.

The extension should treat VB-Cable as an optional external device. It should not bundle, install, or modify the driver.

## Recommended investigation order

1. Verify the effects engine with local headphone monitoring.
2. Verify a `MediaStreamAudioDestinationNode` stream in a small browser-only test page.
3. Test a page-context bridge against a controlled meeting capture scenario, preserving video and mute behavior.
4. Test BlackHole on macOS and VB-Cable on Windows as external routing paths.
5. Compare end-to-end latency, drop behavior, reconnect behavior, and CPU use before choosing a supported integration path.

Until those checks pass, documentation should describe Meet support as experimental. A virtual audio device is the more broadly compatible fallback because applications can select it as a normal microphone, but it requires user-installed operating-system software and does not provide a self-contained extension experience.
