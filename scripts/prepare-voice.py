"""Trim system TTS padding and normalize delivered countdown WAVs. Run after countdown-voice.ps1."""
import wave, struct
from pathlib import Path
for path in (Path(__file__).resolve().parents[1] / 'public' / 'audio').glob('count-*.wav'):
    with wave.open(str(path), 'rb') as source:
        rate, channels, width = source.getframerate(), source.getnchannels(), source.getsampwidth()
        if width != 2 or channels != 1:
            raise ValueError('Expected mono 16-bit speech')
        samples = list(struct.unpack('<'+'h'*source.getnframes(), source.readframes(source.getnframes())))
    active = [i for i,v in enumerate(samples) if abs(v) > 130]
    if not active:
        raise ValueError('Silent countdown cue')
    margin = int(rate*.025)
    samples = samples[max(0,active[0]-margin):min(len(samples),active[-1]+margin)]
    if len(samples)/rate > .86:
        # Resample only unusually long words so countdown syllables cannot overlap.
        length = int(rate*.86)
        samples = [samples[int(i*len(samples)/length)] for i in range(length)]
    gain = min(4, 23000/max(abs(v) for v in samples))
    samples = [round(v*gain) for v in samples]
    with wave.open(str(path), 'wb') as target:
        target.setnchannels(1); target.setsampwidth(2); target.setframerate(rate)
        target.writeframes(struct.pack('<'+'h'*len(samples),*samples))
    print(path.name, round(len(samples)/rate,3), 'seconds')
