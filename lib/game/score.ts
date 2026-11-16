const tracks: Record<string, { root: number; melody: number[]; beat: number }> = {
    lobby: { root: 130.81, melody: [0, 7, 12, 3], beat: 0.8 },
    search: { root: 146.83, melody: [0, 7, 3, 10, 7, 5, 3, 2], beat: 0.65 },
    blackout: { root: 73.42, melody: [0, 0, 1, 0, 6, 1, 0, 3], beat: 0.49 },
    discussion: { root: 110, melody: [0, 7, 3, 7, 10, 5, 3, 2], beat: 0.88 },
    vote: { root: 82.41, melody: [0, 0, 7, 1, 0, 6, 1, 3], beat: 0.42 },
    ended: { root: 146.83, melody: [0, 7, 12, 15], beat: 0.95 },
};

function tone(ctx: AudioContext, frequency: number, start: number, length: number, volume: number, wave: OscillatorType) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.024);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + length);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}

export function playBeat(ctx: AudioContext, phase: string, step: number) {
    const track = tracks[phase] ?? tracks.lobby;
    const { root, melody, beat } = track;
    const start = ctx.currentTime;
    const pitch = root * 2 ** (melody[step % melody.length] / 12);
    tone(ctx, pitch * (phase === 'blackout' ? 1 : 2), start, beat * 1.65, 0.023, 'triangle');
    tone(ctx, pitch * 4, start, beat * 0.54, 0.008, 'sine');
    if (step % 2 === 0) tone(ctx, root * 0.5, start, beat * 1.8, 0.047, 'sine');
    return beat * 1000;
}

export function playCue(ctx: AudioContext, cue: string) {
    const notes: Record<string, number[]> = {
        search: [293.66, 440], blackout: [155.56, 73.42], discussion: [329.63, 493.88],
        vote: [196, 196, 293.66], ended: [220, 293.66, 440], warning: [440, 440],
        shadow: [174.61, 138.59, 73.42], shield: [293.66, 440, 587.33], verdict: [220, 146.83],
    };
    notes[cue]?.forEach((frequency, index) => {
        tone(ctx, frequency, ctx.currentTime + index * 0.15, cue === 'warning' ? 0.22 : 0.66, 0.053, 'triangle');
    });
}
