'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

export const phaseDesign: Record<string, { title: string; icon: string; instruction: string }> = {
    lobby: { title: 'The party awaits', icon: '✦', instruction: 'Share the room code and wait for the host.' },
    search: { title: 'Search the house', icon: '❋', instruction: 'Search two rooms for clues. Share only what you choose.' },
    blackout: { title: 'Blackout', icon: '☾', instruction: 'The diyas dim. Keep your screen private.' },
    discussion: { title: 'Gather at the table', icon: '◇', instruction: 'Share a clue or challenge an alibi before voting.' },
    vote: { title: 'Voting is open', icon: '▣', instruction: 'Choose one suspect or skip. A strict majority is needed.' },
    ended: { title: 'The final reveal', icon: '✧', instruction: 'See who was behind the blackout and review the evidence.' },
};

export function phasePrompt(room: any) {
    if (!room.me.alive) return 'Your diya is out. Watch the round as a spectator.';
    if (room.phase === 'search' && room.me.searches >= 2) return 'Both searches are used. Review your clues or share one with the table.';
    if (room.phase === 'vote' && room.myVote) return 'Vote recorded. You can change it while voting is open.';
    if (room.phase !== 'blackout') return phaseDesign[room.phase].instruction;
    if (room.myAction) return 'Secret choice saved. You can change it while the blackout lasts.';
    return ({
        Killer: 'Open My envelope to choose a target and a shadow scene.',
        Detective: 'Open My envelope to investigate a guest.',
        Protector: 'Open My envelope to shield a guest.',
        Witness: 'Wait for the lights. Review your private lead in My envelope.',
        Archivist: 'Wait for the lights. Review your letter fragments in My envelope.',
    } as Record<string, string>)[room.me.role] ?? 'Wait for the lights. Review your clues in My envelope.';
}

const fabrics = ['#ca764c', '#648e85', '#8f71a8', '#ab5567', '#546c98', '#b88b51'];
type PlayerSeat = { id: string; name: string; alive: boolean; online: boolean; ghost?: boolean; bot?: boolean; voted?: boolean };

export function MeetingTable({ players, me, voting }: { players: PlayerSeat[]; me: string; voting: boolean }) {
    const rows = [players.slice(0, Math.ceil(players.length / 2)), players.slice(Math.ceil(players.length / 2))];
    return <section className="meeting-room" aria-label={voting ? 'Voting attendance' : 'Meeting attendance'}>
        {rows.map((row, index) => <div className={'meeting-seats seats-' + index} key={index}>
            {row.map((player, seat) => {
                const status = !player.alive ? 'Out' : player.ghost ? 'Ghost' : player.bot ? 'Bot' : !player.online ? 'Away' : 'Alive';
                return <div className="meeting-seat" data-out={!player.alive} key={player.id}>
                    <div className="seated-portrait" aria-hidden="true" style={{ '--fabric': fabrics[(seat + index * 3) % fabrics.length] } as CSSProperties}>
                        <i /><b>{[...player.name][0]}</b>
                    </div>
                    <strong title={player.name}>{player.name}{player.id === me ? ' (you)' : ''}</strong>
                    <small>{status}{voting && player.alive && (player.voted ? ' · ✓ Voted' : ' · Pending')}</small>
                </div>;
            })}
        </div>)}
        <div className="meeting-table" aria-hidden="true"><i/><span>❋</span><i/></div>
    </section>;
}

export function PhaseOverlay({ title, copy, label, onClose, children, className = '' }: {
    title: string; copy: string; label: string; onClose: () => void; children?: React.ReactNode; className?: string;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return <dialog ref={dialog} className={'phase-overlay ' + className} aria-label={title}
        onCancel={event => { event.preventDefault(); onClose(); }}>
        <div className="phase-overlay-inner">
            {children}
            <h2>{title}</h2>
            <p>{copy}</p>
            <button autoFocus className="primary" onClick={onClose}>{label} →</button>
        </div>
    </dialog>;
}

export function ShadowTheatre({ method, saved }: { method: string; saved: boolean }) {
    return <div className={'shadow-theatre theatre-' + method} data-saved={saved} aria-hidden="true">
        <div className="theatre-stars">✦ · ✧ · ✦ · ✧</div>
        <div className="theatre-arch"><span/><span/><span/></div>
        <div className="theatre-floor">❋</div>
        <div className="theatre-lamp lamp-left"><i/></div>
        <div className="theatre-lamp lamp-right"><i/></div>
        <div className="theatre-figure theatre-shadow"><i/><b/></div>
        <div className="theatre-figure theatre-target"><i/><b/></div>
        {method === 'mirror' && <div className="theatre-mirror"/>}
        {method === 'confetti' && <div className="theatre-confetti">✧　▰　✦　▪　✧　▰</div>}
        {saved && <div className="theatre-shield">◇</div>}
        <div className="theatre-diya"><i/></div>
    </div>;
}
