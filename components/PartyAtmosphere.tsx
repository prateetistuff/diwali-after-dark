'use client';
import { useEffect, useRef, useState } from 'react';
import { methods } from '../lib/game/engine';
export default function PartyAtmosphere({ room }: {
    room: any;
}) {
    const [sound, setSound] = useState(false), [haptics, H] = useState(false), [vibration, V] = useState(false), [effects, F] = useState(true), [scene, S] = useState<any>(null), [soundError, E] = useState('');
    const audio = useRef<AudioContext | null>(null), seen = useRef(''), phase = useRef('');
    useEffect(() => { V(typeof navigator.vibrate === 'function'); F(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
    useEffect(() => { if (!sound)
        return; let n = 0; const notes = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 392]; const timer = setInterval(() => { const ctx = audio.current; if (!ctx || ctx.state !== 'running' || document.hidden)
        return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = notes[n++ % notes.length]; g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(.025, ctx.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 1.3); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1.4); }, 700); const visibility = () => { if (document.hidden)
        audio.current?.suspend();
    else
        audio.current?.resume().catch(() => setSound(false)); }; document.addEventListener('visibilitychange', visibility); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); audio.current?.suspend(); }; }, [sound]);
    useEffect(() => () => { audio.current?.close(); }, []);
    useEffect(() => { if (!room?.event?.id || seen.current === room.event.id)
        return; seen.current = room.event.id; const key = 'diwali-scene-' + room.code; if (sessionStorage.getItem(key) === room.event.id)
        return; sessionStorage.setItem(key, room.event.id); S(room.event); if (haptics && vibration)
        navigator.vibrate([70, 60, 70]); }, [room?.event?.id, haptics, vibration, room?.code]);
    useEffect(() => { if (!scene)
        return; const t = setTimeout(() => S(null), effects ? 6500 : 3500); return () => clearTimeout(t); }, [scene, effects]);
    useEffect(() => { if (room?.phase && phase.current !== room.phase) {
        phase.current = room.phase;
        if (haptics && vibration)
            navigator.vibrate(40);
    } }, [room?.phase, haptics, vibration]);
    async function toggleSound() { if (sound) {
        setSound(false);
        return;
    } try {
        const Audio = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Audio)
            throw Error();
        if (!audio.current)
            audio.current = new Audio();
        await audio.current!.resume();
        setSound(true);
        E('');
    }
    catch {
        E('Sound is unavailable in this browser.');
    } }
    let method = methods.find(m => m.id === scene?.method) || methods[0];
    return <><div className="atmosphere-controls" aria-label="Optional atmosphere settings"><button onClick={toggleSound} aria-pressed={sound}>{sound ? '♫ Sound on' : '♫ Sound off'}</button><button onClick={() => F(!effects)} aria-pressed={effects}>{effects ? '✦ Effects on' : '✦ Effects off'}</button>{vibration && <button onClick={() => H(!haptics)} aria-pressed={haptics}>{haptics ? 'Haptics on' : 'Haptics off'}</button>}{soundError && <small>{soundError}</small>}</div>{effects && <div className="festive-glow" aria-hidden="true"><span>✧</span><span>✦</span><span>✧</span></div>}{scene && <div className={'blackout-scene ' + (effects ? 'animated' : 'still')} role="dialog" aria-modal="true" aria-label="Blackout story"><button className="scene-skip" autoFocus onClick={() => S(null)}>Continue →</button><div className="eyebrow">{scene.protected ? 'A LIGHT REFUSES TO GO OUT' : 'A SHADOW AT MEHRA HOUSE'}</div>{effects && <div className={'shadow-stage method-' + scene.method} aria-hidden="true"><div className="stage-lantern left-lantern"/><div className="stage-lantern right-lantern"/><div className="shadow-figure culprit"><i /><b /></div><div className={'shadow-figure target ' + (scene.protected ? 'protected' : '')}><i /><b /></div><div className="gold-veil"/><div className={'story-diya ' + (scene.protected ? 'saved' : '')}><i /></div></div>}<div className="scene-copy"><h2>{scene.protected ? `${scene.victim} was protected.` : `${scene.victim}'s diya went out.`}</h2><p>{scene.protected ? 'A golden shield interrupts the shadow. The name card stays upright. Nobody was taken out.' : method.story}</p><small>Fictional shadow theatre · no graphic violence</small></div></div>}</>;
}
export function LetterText({ text }: {
    text: string;
}) { const [count, C] = useState(0); useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    C(text.length);
    return;
} C(0); const id = setInterval(() => C(n => { if (n >= text.length) {
    clearInterval(id);
    return n;
} return n + 3; }), 24); return () => clearInterval(id); }, [text]); return <p className="letter-text"><span className="sr-only">{text}</span><span aria-hidden="true">{text.slice(0, count)}{count < text.length && <span className="letter-cursor">▏</span>}</span>{count < text.length && <button className="finish-letter" onClick={() => C(text.length)}>Show full letter</button>}</p>; }
