export type Player = {
    id: string;
    token: string;
    recovery: string;
    name: string;
    character: string;
    alive: boolean;
    role: string;
    seen: number;
    bot: boolean;
    ghost: boolean;
    kicked?: boolean;
    joinKey?: string;
    clues: string[];
    notes: string[];
    searches: number;
    lastShield?: string;
};
export type Room = {
    schema: 2;
    code: string;
    host: string;
    phase: string;
    generation: number;
    round: number;
    deadline: number;
    endAt: number;
    started: number;
    settings: {
        minutes: number;
        ghosts: boolean;
    };
    players: Player[];
    actions: Record<string, {
        target: string;
        method?: string;
    }>;
    votes: Record<string, string>;
    clues: any[];
    shared: string[];
    discoveries: any[];
    log: string[];
    chat: any[];
    receipts: string[];
    winner?: string;
    finalVote?: boolean;
    event?: any;
    botDone?: string;
};
export const characters = ['Party planner', 'Estranged cousin', 'DJ', 'Family lawyer', 'Photographer', 'Neighbour', 'Chef', 'College friend', 'Business partner', 'Poet', 'Jeweller', 'Magician', 'Journalist', 'Decorator', 'Investor', 'Childhood friend'];
export const locations = [{ id: 'courtyard', name: 'Rangoli courtyard', symbol: '❋', detail: 'Footprints interrupt a perfect pattern.' }, { id: 'mithai', name: 'Mithai table', symbol: '◈', detail: 'A folded note beneath the silver tray.' }, { id: 'study', name: 'Locked study', symbol: '✉', detail: 'A charity ledger. Three missing pages.' }, { id: 'terrace', name: 'Lantern terrace', symbol: '✦', detail: 'A silhouette in the festival lights.' }, { id: 'hall', name: 'Mirror hallway', symbol: '◇', detail: 'Reflections do not always tell the truth.' }, { id: 'music', name: 'Music room', symbol: '♫', detail: 'An invitation with a pencilled alibi.' }];
export const methods = [{ id: 'lantern', title: 'The vanishing lantern', story: 'A shadow crosses the lantern curtain. A gold flash, a whispered name—and one diya goes dark.' }, { id: 'confetti', title: 'The confetti eclipse', story: 'Imaginary sky-blooms fill the windows. Behind a curtain of gold paper, a silhouette reaches out. One name card turns face down.' }, { id: 'mirror', title: 'The mirror masquerade', story: 'Festival reflections multiply a hooded figure. The room falls silent. An empty chair faces the mirror.' }];
export const roleHelp: Record<string, string> = { Killer: 'During Blackout, secretly choose a guest and a cinematic scene. With two killers, agree on one target; a split choice is resolved randomly. Survive until your team matches the guests.', Detective: 'During each Blackout, investigate one living player. Your result is private; you choose whether to tell the group.', Protector: 'During Blackout, shield one living player, including yourself. You cannot shield the same player twice in a row. A successful shield prevents the attack.', Witness: 'At the beginning, receive a private partial clue linking a killer to a small group. Share it—or keep it until you can test an alibi.', Archivist: 'Receive all three letter fragments privately at the start. Piece together the motive and choose what to share.', Guest: 'Search two locations each Search phase. Discuss your discoveries, test alibis, and vote. Your clues stay private until you share them.' };
export function randomInt(n: number) { if (n < 1)
    throw Error('Empty choice'); const cap = Math.floor(4294967296 / n) * n; let a = new Uint32Array(1); do {
    crypto.getRandomValues(a);
} while (a[0] >= cap); return a[0] % n; }
export function shuffle<T>(a: T[]): T[] { a = [...a]; for (let i = a.length - 1; i > 0; i--) {
    let j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
} return a; }
const pick = <T,>(a: T[]): T => a[randomInt(a.length)];
export function player(name: string, now: number, index: number, bot = false): Player { return { id: crypto.randomUUID(), token: crypto.randomUUID(), recovery: crypto.randomUUID().replaceAll('-', ''), name, character: characters[index % 16], alive: true, role: 'Guest', seen: now, bot, ghost: false, clues: [], notes: [], searches: 0 }; }
export function createRoom(code: string, name: string, now: number): Room { let p = player(name, now, 0); return { schema: 2, code, host: p.id, phase: 'lobby', generation: 0, round: 0, deadline: 0, endAt: 0, started: 0, settings: { minutes: 20, ghosts: false }, players: [p], actions: {}, votes: {}, clues: [], shared: [], discoveries: [], log: ['The doors of Mehra House are open.'], chat: [], receipts: [] }; }
const living = (r: Room) => r.players.filter(p => p.alive && !p.kicked);
const killers = (r: Room) => r.players.filter(p => p.role === 'Killer' && !p.kicked);
function log(r: Room, s: string) { r.log.push(s); r.log = r.log.slice(-80); }
function addChat(r: Room, name: string, text: string) { r.chat.push({ id: crypto.randomUUID(), name, text }); r.chat = r.chat.slice(-150); }
function group(r: Room, k: Player, seed: number) { return shuffle([k, ...shuffle(r.players.filter(p => p.id !== k.id)).slice(0, Math.min(seed, r.players.length - 2))]).map(p => p.name).join(', '); }
function makeClues(r: Room) {
    let k = killers(r)[0];
    const suspects = group(r, k, Math.max(1, Math.floor(r.players.length / 3)));
    return [
        { id: 'letter1', location: 'study', round: 1, title: 'Letter · fragment I / III', text: '“Aarav, the Diwali relief fund was never yours to hide. Tonight the ledger leaves this house.”', kind: 'letter' },
        { id: 'letter2', location: 'mithai', round: 2, title: 'Letter · fragment II / III', text: '“The signatures were copied. The missing money paid for a life someone here could not afford.”', kind: 'letter' },
        { id: 'letter3', location: 'hall', round: 3, title: 'Letter · fragment III / III', text: '“At midnight I will name the person behind it. Meet me beside the mithai table.” — Aarav', kind: 'letter' },
        { id: 'rangoli', location: 'courtyard', round: 1, title: 'A smudged guest list', text: `A witness places at least one culprit in this group near the hallway: ${suspects}. A partial lead, not a verdict.`, suspects: r.players.filter(p => suspects.split(', ').includes(p.name)).map(p => p.id), kind: 'lead' },
        { id: 'terrace', location: 'terrace', round: 1, title: 'A gold cuff', text: 'A gold cuff was caught on a lantern ribbon. Almost everyone was wearing festive clothes; this alone proves nothing.', kind: 'red-herring' },
        { id: 'music', location: 'music', round: 1, title: 'The interrupted playlist', text: 'The music stopped before the lights. Someone wanted the whole party to look toward the terrace.', kind: 'context' },
        { id: 'tray', location: 'mithai', round: 1, title: 'A moved sweet tray', text: 'The silver tray was moved to make room for a letter. The sweets themselves tell you nothing about who attacked Aarav.', kind: 'red-herring' },
        { id: 'reflection', location: 'hall', round: 1, title: 'A blurred reflection', text: 'The mirror shows two overlapping shadows. The photographer warns that a reflection can double one person.', kind: 'red-herring' },
        { id: 'ledger', location: 'study', round: 2, title: 'The ledger margin', text: `The person who altered the ledger is among ${group(r, k, Math.max(1, Math.floor(r.players.length / 3)))}. Compare this list with the courtyard clue.`, kind: 'lead' },
        { id: 'receipt', location: 'courtyard', round: 2, title: 'A receipt with the wrong date', text: 'The decorations were paid for last week. The argument about their price was a distraction, not evidence of tonight’s crime.', kind: 'context' },
        { id: 'latephoto', location: 'terrace', round: 3, title: 'A recovered photo strip', text: `A partly obscured face could belong to ${group(r, k, 1)}. At least one is a culprit. Ask what each did before the blackout.`, kind: 'lead' },
        { id: 'alibi', location: 'music', round: 2, title: 'A pencilled alibi', text: '“I was choosing the next song.” Three guests wrote the same sentence. An alibi needs another witness.', kind: 'context' }
    ];
}
function award(r: Room, p: Player, c: any, now: number) { if (!p.clues.includes(c.id)) {
    p.clues.push(c.id);
    r.discoveries.push({ player: p.name, playerId: p.id, clue: c.id, title: c.title, round: r.round, at: now });
} }
export function start(r: Room, now: number) { const ps = r.players.filter(p => !p.kicked); if (ps.length < 4 || ps.length > 16)
    throw Error('Start with 4–16 guests.'); let roles = ['Killer', ...(ps.length >= 12 ? ['Killer'] : []), 'Detective', ...(ps.length >= 5 ? ['Protector'] : []), ...(ps.length >= 6 ? ['Witness'] : []), ...(ps.length >= 10 ? ['Archivist'] : [])]; while (roles.length < ps.length)
    roles.push('Guest'); roles = shuffle(roles); ps.forEach((p, i) => { p.role = roles[i]; p.alive = true; p.clues = []; p.notes = []; p.searches = 0; p.lastShield = undefined; }); r.players = ps; r.generation++; r.round = 1; r.started = now; r.endAt = now + r.settings.minutes * 60000; r.winner = undefined; r.finalVote = false; r.shared = []; r.discoveries = []; r.chat = []; r.log = ['9:47 PM. The lights go out. A shadow passes the mithai table. Aarav’s diya is extinguished. The first letter says: “Find the truth before midnight.”']; r.clues = makeClues(r); r.event = { id: crypto.randomUUID(), method: 'lantern', victim: 'Aarav Mehra', protected: false }; for (let p of ps) {
    if (p.role === 'Witness')
        award(r, p, r.clues.find(c => c.id === 'rangoli'), now);
    if (p.role === 'Archivist')
        r.clues.filter(c => c.kind === 'letter').forEach(c => award(r, p, c, now));
} enter(r, 'search', now); }
const duration: Record<string, number> = { search: 90, blackout: 25, discussion: 75, vote: 35 };
function enter(r: Room, phase: string, now: number) { r.phase = phase; r.deadline = now + duration[phase] * 1000; r.botDone = undefined; if (phase === 'search') {
    r.players.forEach(p => p.searches = 0);
    r.votes = {};
    r.actions = {};
} if (phase === 'blackout')
    r.actions = {}; if (phase === 'vote')
    r.votes = {}; }
function won(r: Room) { let ps = living(r), ks = ps.filter(p => p.role === 'Killer'); if (!ks.length) {
    r.phase = 'ended';
    r.winner = 'guests';
    return true;
} if (ks.length >= ps.length - ks.length) {
    r.phase = 'ended';
    r.winner = 'killers';
    return true;
} return false; }
function resolveBlackout(r: Room, now: number) { let ks = living(r).filter(p => p.role === 'Killer'), inn = living(r).filter(p => p.role !== 'Killer'); let choices = ks.map(p => r.actions[p.id]).filter(a => a && inn.some(p => p.id === a.target)); let choice = choices.length ? pick(choices) : { target: pick(inn).id, method: pick(methods).id }; let victim = r.players.find(p => p.id === choice.target)!; let shields = living(r).filter(p => p.role === 'Protector').map(p => { let a = r.actions[p.id]; if (a)
    p.lastShield = a.target; return a?.target; }); for (let p of living(r).filter(p => p.role === 'Detective')) {
    let t = r.players.find(t => t.id === r.actions[p.id]?.target);
    if (t)
        p.notes.push(`Round ${r.round}: ${t.name} ${t.role === 'Killer' ? 'is a Killer.' : 'is not a Killer.'}`);
} let protectedTarget = shields.includes(victim.id); if (!protectedTarget)
    victim.alive = false; r.event = { id: crypto.randomUUID(), method: choice.method || 'lantern', victim: victim.name, protected: protectedTarget }; log(r, protectedTarget ? `Round ${r.round}: ${victim.name}'s diya flickered—but a shield kept it alight. Nobody was taken out.` : `Round ${r.round}: ${victim.name}'s diya went out. Their name card is turned over.`); if (!won(r))
    enter(r, 'discussion', now); }
function resolveVote(r: Room, now: number) { let tally: Record<string, number> = {}; let alive = living(r); for (let p of alive) {
    let v = r.votes[p.id];
    if (v === 'skip' || alive.some(x => x.id === v))
        tally[v] = (tally[v] || 0) + 1;
} let ordered = Object.entries(tally).sort((a, b) => b[1] - a[1]); let top = ordered[0]; if (top && top[0] !== 'skip' && top[1] > alive.length / 2) {
    let p = r.players.find(p => p.id === top[0])!;
    p.alive = false;
    log(r, `${p.name} was voted out: ${p.role === 'Killer' ? 'a Killer.' : 'an innocent guest.'}`);
}
else
    log(r, `Round ${r.round}: no majority. Nobody was voted out.`); if (won(r))
    return; if (r.finalVote) {
    r.phase = 'ended';
    r.winner = 'killers';
    log(r, 'Midnight arrived with a culprit still inside.');
}
else {
    r.round++;
    enter(r, 'search', now);
} }
function botTurns(r: Room, now: number) { const key = r.generation + ':' + r.round + ':' + r.phase; for (let p of living(r).filter(p => p.bot || p.ghost)) {
    if (r.phase === 'search' && p.searches === 0) {
        let available = shuffle(r.clues.filter(c => c.round <= r.round && !p.clues.includes(c.id)));
        for (let c of available.slice(0, 2)) {
            award(r, p, c, now);
            if (!r.shared.includes(c.id))
                r.shared.push(c.id);
        }
        p.searches = 2;
    }
    else if (r.phase === 'blackout' && !r.actions[p.id]) {
        let eligible = living(r).filter(t => p.role === 'Killer' ? t.role !== 'Killer' : p.role === 'Protector' ? t.id !== p.lastShield : t.id !== p.id);
        if (eligible.length && ['Killer', 'Detective', 'Protector'].includes(p.role))
            r.actions[p.id] = { target: pick(eligible).id, method: pick(methods).id };
    }
    else if (r.phase === 'vote' && !r.votes[p.id]) {
        let candidates = living(r).filter(t => t.id !== p.id && (p.role !== 'Killer' || t.role !== 'Killer'));
        r.votes[p.id] = candidates.length ? pick(candidates).id : 'skip';
    }
    if (r.phase === 'discussion' && r.botDone !== key && p.notes.length) {
        addChat(r, p.name + ' · ghost', p.notes[p.notes.length - 1]);
    }
} r.botDone = key; }
export function advance(r: Room, now: number) { for (let p of r.players) {
    if (!p.bot && !p.kicked && r.settings.ghosts && now - p.seen > 45000)
        p.ghost = true;
} let host = r.players.find(p => p.id === r.host); if (!host || host.kicked || now - host.seen > 60000) {
    let next = r.players.find(p => !p.bot && !p.ghost && !p.kicked && now - p.seen < 15000);
    if (next && next.id !== r.host) {
        r.host = next.id;
        log(r, `${next.name} is now the host.`);
    }
} if (['lobby', 'ended'].includes(r.phase))
    return; for (let i = 0; i < 40 && !['ended', 'lobby'].includes(r.phase); i++) {
    botTurns(r, now);
    if (now >= r.endAt && !r.finalVote) {
        r.finalVote = true;
        enter(r, 'vote', now);
        r.deadline = now + 45000;
        log(r, 'Midnight approaches. One final 45-second vote.');
        break;
    }
    if (now < r.deadline)
        break;
    let at = r.deadline;
    if (r.phase === 'search')
        enter(r, 'blackout', at);
    else if (r.phase === 'blackout')
        resolveBlackout(r, at);
    else if (r.phase === 'discussion')
        enter(r, 'vote', at);
    else if (r.phase === 'vote')
        resolveVote(r, at);
} }
export function mutate(r: Room, p: Player, b: any, now: number) {
    const action = b.action;
    const host = () => { if (p.id !== r.host)
        throw Error('Only the host can do that.'); };
    const active = () => { if (!p.alive || p.kicked)
        throw Error('You are spectating this round.'); };
    const target = () => { let t = living(r).find(t => t.id === b.target); if (!t)
        throw Error('Choose a living guest.'); return t; };
    if (action === 'start') {
        host();
        if (r.phase !== 'lobby')
            throw Error('The game has already started.');
        start(r, now);
    }
    else if (action === 'settings') {
        host();
        if (r.phase !== 'lobby')
            throw Error('Adjust settings in the lobby.');
        if ([10, 20, 30].includes(b.minutes))
            r.settings.minutes = b.minutes;
        if (typeof b.ghosts === 'boolean')
            r.settings.ghosts = b.ghosts;
    }
    else if (action === 'addBot') {
        host();
        if (r.phase !== 'lobby' || r.players.filter(p => !p.kicked).length >= 16)
            throw Error('Add fill-ins in a lobby with space.');
        let names = ['Diya', 'Rangoli', 'Phuljhari', 'Jugnu', 'Chand', 'Roshni', 'Taara', 'Gul'];
        let n = names[r.players.filter(p => p.bot).length % names.length];
        r.players.push(player(n + ' · bot', now, r.players.length, true));
    }
    else if (action === 'kick') {
        host();
        let t = r.players.find(t => t.id === b.target);
        if (!t || t.id === p.id)
            throw Error('Choose another player.');
        if (r.phase === 'lobby' || r.phase === 'ended') {
            t.kicked = true;
            t.alive = false;
        }
        else {
            t.ghost = true;
            t.seen = 0;
            log(r, `${t.name} is now controlled by a ghost. Their seat can still reconnect.`);
        }
    }
    else if (action === 'restart') {
        host();
        if (!['lobby', 'ended'].includes(r.phase) && b.confirm !== true)
            throw Error('Confirm before ending the current game.');
        r.phase = 'lobby';
        r.deadline = 0;
        r.endAt = 0;
        r.event = undefined;
        r.winner = undefined;
        r.players = r.players.filter(p => !p.kicked);
        r.players.forEach(p => { p.alive = true; p.role = 'Guest'; p.clues = []; p.notes = []; p.searches = 0; });
        r.clues = [];
        r.shared = [];
        r.discoveries = [];
        r.actions = {};
        r.votes = {};
        r.chat = [];
        log(r, 'A fresh party is ready. Roles will be shuffled again.');
    }
    else if (action === 'extend') {
        host();
        if (['lobby', 'ended'].includes(r.phase))
            throw Error('The clock is not running.');
        r.deadline += 30000;
        r.endAt += 30000;
        log(r, 'Host added 30 seconds.');
    }
    else if (action === 'next') {
        host();
        if (['lobby', 'ended'].includes(r.phase))
            throw Error('Start the game first.');
        r.deadline = now;
        advance(r, now);
    }
    else if (action === 'search') {
        active();
        if (r.phase !== 'search')
            throw Error('Explore during the Search phase.');
        if (p.searches >= 2)
            throw Error('You have used both searches this round.');
        let c = r.clues.find(c => c.location === b.location && c.round <= r.round && !p.clues.includes(c.id));
        if (!c)
            throw Error('Nothing new here yet. Try another room.');
        award(r, p, c, now);
        p.searches++;
    }
    else if (action === 'share') {
        active();
        let c = r.clues.find(c => c.id === b.clue);
        if (!c || !p.clues.includes(c.id))
            throw Error('Find this clue first.');
        if (!r.shared.includes(c.id)) {
            r.shared.push(c.id);
            log(r, `${p.name} shared ${c.title}.`);
        }
    }
    else if (action === 'secretAction') {
        active();
        if (r.phase !== 'blackout')
            throw Error('Secret actions happen during Blackout.');
        let t = target();
        if (p.role === 'Killer') {
            if (t.role === 'Killer')
                throw Error('Choose a guest outside your team.');
            if (!methods.some(m => m.id === b.method))
                throw Error('Choose a scene.');
        }
        else if (p.role === 'Protector') {
            if (t.id === p.lastShield)
                throw Error('Choose someone different from your last shield.');
        }
        else if (p.role === 'Detective') {
            if (t.id === p.id)
                throw Error('Investigate another guest.');
        }
        else
            throw Error('Your role has no secret action.');
        r.actions[p.id] = { target: t.id, method: p.role === 'Killer' ? b.method : undefined };
    }
    else if (action === 'vote') {
        active();
        if (r.phase !== 'vote')
            throw Error('Voting opens after Discussion.');
        if (b.target !== 'skip')
            target();
        r.votes[p.id] = b.target;
    }
    else if (action === 'chat') {
        active();
        if (r.phase === 'blackout')
            throw Error('The house is silent during Blackout.');
        let msg = String(b.message || '').trim().slice(0, 400);
        if (msg)
            addChat(r, p.name, msg);
    }
    else if (!['sync', 'join', 'recover'].includes(action))
        throw Error('Unknown action.');
}
export function project(r: Room, p: Player, now: number, version: number) { const ended = r.phase === 'ended'; const publicPlayers = r.players.filter(x => !x.kicked).map(x => ({ id: x.id, name: x.name, character: x.character, alive: x.alive, bot: x.bot, ghost: x.ghost, online: now - x.seen < 20000, role: ended ? x.role : undefined })); const safeClue = (c: any) => ({ id: c.id, title: c.title, text: c.text, location: c.location, letter: c.kind === 'letter', kind: ended ? c.kind : undefined, shared: r.shared.includes(c.id) }); return { schema: 2, code: r.code, host: r.host, phase: r.phase, generation: r.generation, round: r.round, deadline: r.deadline, endAt: r.endAt, serverNow: now, version, settings: r.settings, players: publicPlayers, me: { id: p.id, name: p.name, alive: p.alive, role: r.phase === 'lobby' ? 'Sealed' : p.role, help: r.phase === 'lobby' ? 'Your role opens when the host starts.' : roleHelp[p.role], searches: p.searches, notes: p.notes, recovery: p.recovery, lastShield: p.lastShield }, team: p.role === 'Killer' && r.phase !== 'lobby' ? killers(r).map(x => ({ id: x.id, name: x.name })) : [], inventory: r.clues.filter(c => p.clues.includes(c.id)).map(safeClue), shared: r.clues.filter(c => r.shared.includes(c.id)).map(safeClue), locations: locations.map(l => ({ ...l, available: r.clues.some(c => c.location === l.id && c.round <= r.round && !p.clues.includes(c.id)) })), myAction: r.actions[p.id], myVote: r.votes[p.id], voteCount: Object.keys(r.votes).length, log: r.log, chat: r.chat, event: r.event, winner: r.winner, finalVote: r.finalVote, recap: ended ? r.discoveries.map(d => ({ ...d, kind: r.clues.find(c => c.id === d.clue)?.kind })) : [], story: ended ? `${killers(r).map(x => x.name).join(' and ')} diverted the Diwali relief fund and forged the ledger. Aarav planned to expose the theft at midnight. The blackout hid the confrontation; the threatening letters were meant to turn the guests against each other. The gold cuff, moved sweet tray and double reflection were distractions. The ledger and letter fragments told the real story.` : undefined }; }
export function upgradeLegacy(old: any, now: number): Room { let r = createRoom(old.code, 'Host', now); r.players = old.players.map((p: any, i: number) => ({ ...player(p.name, now, i), id: p.id, token: p.token, seen: 0 })); r.host = old.host; r.log = ['This room has been upgraded. Your seats are preserved; the host can start a fresh game with the new rules.']; return r; }
