'use client';

import { useEffect, useRef, useState } from 'react';
import { methods } from '../lib/game/engine';
import { playBeat, playCue } from '../lib/game/score';
import { PhaseOverlay, ShadowTheatre } from './PhasePresentation';

export default function PartyAtmosphere({ room, clock }: { room: any; clock: number }) {
    const [sound, setSound] = useState(false);
    const [haptics, setHaptics] = useState(false);
    const [vibration, setVibration] = useState(false);
    const [effects, setEffects] = useState(true);
    const [scene, setScene] = useState<any>(null);
    const [soundError, setSoundError] = useState('');
    const [voteAlert, setVoteAlert] = useState('');
    const audio = useRef<AudioContext | null>(null);
    const seenScene = useRef('');
    const seenPhase = useRef('');
    const warned = useRef('');
    const phase = room?.phase ?? 'lobby';
    const phaseKey = room && [room.code, room.generation, room.round, phase, room.finalVote ? 'final' : 'regular'].join(':');
    const remaining = room?.deadline - clock;
    const shouldWarn = remaining > 0 && remaining <= 10000 && !['lobby', 'ended'].includes(phase);
    const event = room?.event;
    const play = (cue: string) => {
        if (audio.current?.state === 'running' && !document.hidden) playCue(audio.current, cue);
    };

    useEffect(() => {
        setVibration(typeof navigator.vibrate === 'function');
        setEffects(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        return () => { void audio.current?.close(); audio.current = null; };
    }, []);
    useEffect(() => {
        if (!sound) return;
        let step = 0;
        let timer: ReturnType<typeof setTimeout>;
        const loop = () => {
            const ctx = audio.current;
            const delay = ctx?.state === 'running' && !document.hidden ? playBeat(ctx, phase, step++) : 500;
            timer = setTimeout(loop, delay);
        };
        loop();
        return () => clearTimeout(timer);
    }, [sound, phase]);
    useEffect(() => {
        if (!sound) return;
        const visibility = () => {
            if (document.hidden) void audio.current?.suspend();
            else void audio.current?.resume().catch(() => setSound(false));
        };
        document.addEventListener('visibilitychange', visibility);
        return () => document.removeEventListener('visibilitychange', visibility);
    }, [sound]);
    useEffect(() => {
        if (!phaseKey || phaseKey === seenPhase.current) return;
        seenPhase.current = phaseKey;
        if (!event?.id || event.id === seenScene.current) play(phase);
        if (haptics && vibration) navigator.vibrate(40);
        if (phase === 'vote') setVoteAlert(phaseKey);
    }, [phaseKey, phase, event?.id, haptics, vibration]);
    useEffect(() => {
        if (!shouldWarn || warned.current === phaseKey) return;
        warned.current = phaseKey;
        play('warning');
    }, [shouldWarn, phaseKey]);
    useEffect(() => {
        if (!event?.id || event.id === seenScene.current) return;
        seenScene.current = event.id;
        const key = 'diwali-scene-' + room.code;
        if (sessionStorage.getItem(key) === event.id) return;
        sessionStorage.setItem(key, event.id);
        setScene(event);
        play(event.kind === 'verdict' ? 'verdict' : event.protected ? 'shield' : 'shadow');
        if (haptics && vibration) navigator.vibrate([70, 60, 70]);
    }, [event?.id, room?.code, haptics, vibration]);
    useEffect(() => {
        if (!scene) return;
        const timer = setTimeout(() => setScene(null), effects ? 5800 : 4500);
        return () => clearTimeout(timer);
    }, [scene, effects]);
    useEffect(() => {
        if (!voteAlert || voteAlert !== phaseKey) return;
        const timer = setTimeout(() => setVoteAlert(''), 3800);
        return () => clearTimeout(timer);
    }, [voteAlert, phaseKey]);

    async function toggleSound() {
        try {
            if (sound) {
                setSound(false);
                await audio.current?.close();
                audio.current = null;
                return;
            }
            const Audio = window.AudioContext || (window as any).webkitAudioContext;
            if (!Audio) throw Error();
            audio.current ??= new Audio();
            await audio.current!.resume();
            setSound(true);
            setSoundError('');
            play(phase);
        } catch {
            setSoundError('Sound is unavailable in this browser.');
        }
    }

    const method = methods.find(entry => entry.id === scene?.method) ?? methods[0];
    const voting = phase === 'vote' && voteAlert === phaseKey && remaining > 0;
    const verdict = scene?.kind === 'verdict';
    return <>
        <div className="atmosphere-controls" aria-label="Optional atmosphere settings">
            <button onClick={toggleSound} aria-pressed={sound}>{sound ? '♫ Sound on' : '♫ Sound off'}</button>
            <button onClick={() => setEffects(!effects)} aria-pressed={effects}>{effects ? '✦ Effects on' : '✦ Effects off'}</button>
            {vibration && <button onClick={() => setHaptics(!haptics)} aria-pressed={haptics}>{haptics ? 'Haptics on' : 'Haptics off'}</button>}
            {soundError && <small role="status">{soundError}</small>}
        </div>
        {effects && <div className="festive-glow" aria-hidden="true"><span>✧</span><span>✦</span><span>✧</span></div>}
        {voting ? <PhaseOverlay key={phaseKey} className={'vote-overlay ' + (effects ? '' : 'still')} title={room.finalVote ? 'Final vote is open' : 'Voting is open'}
            copy={room.me.alive ? 'Choose one suspect or skip before the clock runs out.' : 'Watch the table decide. Eliminated guests sit this vote out.'}
            label={room.me.alive ? 'Go to ballot' : 'Watch the vote'} onClose={() => setVoteAlert('')}>
            <div className="ballot-emblem" aria-hidden="true"><span>✓</span></div>
        </PhaseOverlay> : scene && room && phase !== 'lobby' && phase !== 'vote' && <PhaseOverlay key={scene.id} className={'story-overlay ' + (effects ? '' : 'still')}
            title={verdict ? scene.victim ? `${scene.victim} was voted out` : 'No majority' : scene.protected ? `${scene.victim} was protected` : `${scene.victim}’s diya went out`}
            copy={verdict ? scene.summary : scene.protected ? 'The shield held. Every name card stays upright.' : method.story}
            label="Continue" onClose={() => setScene(null)}>
            {verdict ? <div className="verdict-emblem" aria-hidden="true">❋</div> : <ShadowTheatre method={method.id} saved={scene.protected} />}
        </PhaseOverlay>}
    </>;
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
