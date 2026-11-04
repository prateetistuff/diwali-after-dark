'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type Seat = {
    code: string;
    token: string;
};
export function useParty() {
    const [room, setRoom] = useState<any>(null), [seat, setSeat] = useState<Seat | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [connection, setConnection] = useState('Connecting…'), [clock, setClock] = useState(Date.now());
    const roomRef = useRef<any>(null), seatRef = useRef<Seat | null>(null), pending = useRef(false), syncing = useRef(false), anchor = useRef({ server: Date.now(), local: 0 }), mounted = useRef(true), epoch = useRef(0), attempt = useRef<{
        fingerprint: string;
        id: string;
    } | null>(null);
    const apply = useCallback((d: any, elapsed: number) => { if (roomRef.current && d.code === roomRef.current.code && d.version < roomRef.current.version)
        return; roomRef.current = d; setRoom(d); anchor.current = { server: d.serverNow + Math.max(0, elapsed - (d.serverNow - (d.serverReceivedAt || d.serverNow))) / 2, local: performance.now() }; setClock(anchor.current.server); setConnection('Live'); }, []);
    const request = useCallback(async (action: string, extra: any = {}) => { const sync = action === 'sync'; if (sync && (pending.current || syncing.current))
        return false; if (!sync && pending.current)
        return false; if (sync)
        syncing.current = true;
    else {
        pending.current = true;
        setBusy(true);
    } if (['create', 'join', 'recover'].includes(action))
        epoch.current++; const context = epoch.current; const started = performance.now(); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 25000); try {
        let current = seatRef.current;
        const fingerprint = JSON.stringify({ action, ...(current || {}), ...extra });
        if (!sync && attempt.current?.fingerprint !== fingerprint)
            attempt.current = { fingerprint, id: crypto.randomUUID() };
        let body = { action, ...(current || {}), requestId: sync ? crypto.randomUUID() : attempt.current!.id, ...extra };
        if (action === 'create') {
            delete (body as any).token;
            delete (body as any).code;
        }
        if (action === 'join' && extra.code !== current?.code)
            delete (body as any).token;
        const res = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
        const d: any = await res.json();
        if (d.error)
            throw Error(d.error);
        if (!mounted.current || context !== epoch.current)
            return false;
        if (d.token) {
            const s = { code: d.code, token: d.token };
            seatRef.current = s;
            setSeat(s);
            localStorage.setItem('diwali-session', JSON.stringify(s));
            localStorage.setItem('diwali-seat-' + d.code, JSON.stringify(s));
        }
        apply(d, performance.now() - started);
        if (!sync)
            attempt.current = null;
        setError('');
        return true;
    }
    catch (e: any) {
        if (context === epoch.current && mounted.current) {
            setConnection('Reconnecting…');
            if (!sync || !roomRef.current)
                setError(e.name === 'AbortError' ? 'Connection is slow. Please try again.' : e.message);
        }
        return false;
    }
    finally {
        clearTimeout(timeout);
        if (sync)
            syncing.current = false;
        else {
            pending.current = false;
            if (mounted.current)
                setBusy(false);
        }
    } }, [apply]);
    useEffect(() => { mounted.current = true; try {
        const saved = JSON.parse(localStorage.getItem('diwali-session') || 'null');
        if (saved?.token) {
            seatRef.current = saved;
            setSeat(saved);
            request('sync');
        }
        else
            setConnection('Ready');
    }
    catch {
        setConnection('Ready');
    } const tick = setInterval(() => setClock(anchor.current.server + Math.max(0, performance.now() - anchor.current.local)), 250); return () => { mounted.current = false; clearInterval(tick); }; }, [request]);
    useEffect(() => { if (!seat)
        return; const tick = setInterval(() => { if (roomRef.current)
        request('sync'); }, 2500); const resume = () => { if (document.visibilityState === 'visible' && roomRef.current)
        request('sync'); }; window.addEventListener('online', resume); document.addEventListener('visibilitychange', resume); return () => { clearInterval(tick); window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', resume); }; }, [seat, request]);
    function entrance() { epoch.current++; roomRef.current = null; setRoom(null); setError(''); }
    function resume() { request('sync'); }
    return { room, seat, error, setError, busy, connection, clock, request, entrance, resume };
}
