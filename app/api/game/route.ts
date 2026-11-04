import { env } from 'cloudflare:workers';
import { createRoom, player, advance, mutate, project, upgradeLegacy, Room } from '../../../lib/game/engine';
export async function POST(req: Request) {
    try {
        if (Number(req.headers.get('content-length') || 0) > 8192)
            throw Error('Request too large.');
        const b: any = await req.json();
        const binding = env.DB!;
        const db = (binding as any)?.withSession ? (binding as any).withSession("first-primary") : binding;
        if (!db)
            throw Error('Room service unavailable.');
        const now = Date.now();
        let code = String(b.code || '').toUpperCase().replace(/\s/g, '');
        const name = String(b.name || '').trim().slice(0, 24);
        const requestId = String(b.requestId || '');
        if (b.action !== 'sync' && !/^[a-f0-9-]{36}$/i.test(requestId))
            throw Error('Refresh the game to use the latest version.');
        if (b.action === 'create') {
            if (!name)
                throw Error('Enter your party name.');
            if (!/^[a-f0-9-]{36}$/i.test(requestId))
                throw Error('Please refresh and try again.');
            code = requestId.replaceAll('-', '').slice(0, 8).toUpperCase();
            const prior: any = await db.prepare('SELECT data,version FROM rooms WHERE code=?').bind(code).first();
            if (prior) {
                const r = JSON.parse(prior.data);
                if (r.createKey !== requestId)
                    throw Error('Please try creating another room.');
                const creator = r.players.find((p: any) => p.id === r.creator && !p.kicked);
                if (!creator) throw Error('That party already exists. Recover your existing seat.');
                return Response.json({ token: creator.token, ...project(r, creator, now, prior.version), serverReceivedAt: now, serverNow: Date.now() });
            }
            const r = createRoom(code, name, now);
            (r as any).createKey = requestId;
            (r as any).creator = r.players[0].id;
            await db.prepare('INSERT INTO rooms(code,data,version) VALUES(?,?,0)').bind(code, JSON.stringify(r)).run();
            return Response.json({ token: r.players[0].token, ...project(r, r.players[0], now, 0), serverReceivedAt: now, serverNow: Date.now() });
        }
        if (!/^[A-F0-9]{6,8}$/.test(code))
            throw Error('Enter the 6–8 character room code.');
        for (let retry = 0; retry < 24; retry++) {
            const row: any = await db.prepare('SELECT data,version FROM rooms WHERE code=?').bind(code).first();
            if (!row)
                throw Error('Room not found. Check the code.');
            let parsed = JSON.parse(row.data);
            let r: Room = parsed.schema === 2 ? parsed : upgradeLegacy(parsed, now);
            let p = r.players.find(p => p.token === b.token && !p.kicked);
            let issue = false;
            if (b.action === 'recover') {
                const recovery = String(b.recovery || '').trim();
                if (recovery.length < 32)
                    throw Error('Paste the full seat recovery key.');
                p = r.players.find(p => p.recovery === recovery && !p.kicked);
                if (!p)
                    throw Error('Room code or recovery key is incorrect.');
                issue = true;
            }
            else if (b.action === 'join' && !p) {
                p = r.players.find(p => p.joinKey === requestId && !p.kicked);
                if (!p) {
                    if (r.phase !== 'lobby')
                        throw Error('This game has started. Use Resume or your recovery key.');
                    if (!name)
                        throw Error('Enter your party name.');
                    if (r.players.filter(p => !p.kicked).length >= 16)
                        throw Error('This party is full.');
                    if (r.players.some(p => !p.kicked && p.name.toLowerCase() === name.toLowerCase()))
                        throw Error('That name is taken. Add an initial.');
                    p = player(name, now, r.players.length);
                    p.joinKey = requestId;
                    r.players.push(p);
                }
                issue = true;
            }
            if (!p)
                throw Error('Seat unavailable. Use your recovery key or join a new lobby.');
            p.seen = now;
            p.ghost = false;
            advance(r, now);
            const receipt = p.id + ':' + requestId;
            if (b.action === 'sync' || !requestId || !r.receipts.includes(receipt)) {
                mutate(r, p, b, now);
                if (b.action !== 'sync' && requestId)
                    r.receipts = [...r.receipts.slice(-99), receipt];
            }
            let result = await db.prepare('UPDATE rooms SET data=?,version=version+1 WHERE code=? AND version=?').bind(JSON.stringify(r), code, row.version).run();
            if (result.meta.changes)
                return Response.json({ ...(issue ? { token: p.token } : {}), ...project(r, p, now, row.version + 1), serverReceivedAt: now, serverNow: Date.now() });
        }
        throw Error('The party is busy. Please retry.');
    }
    catch (e: any) {
        return Response.json({ error: e.message || 'Could not reach the room.' }, { status: 400 });
    }
}
