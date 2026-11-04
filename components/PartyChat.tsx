'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Message = { name: string; text: string };

export default function PartyChat({ messages, scrollRequest }: { messages: Message[]; scrollRequest: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const animating = useRef(false);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchY = useRef(0);
  const [unread, setUnread] = useState(false);
  const signature = JSON.stringify(messages);

  const atBottom = useCallback(() => {
    const el = viewport.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
  }, []);

  const scrollLatest = useCallback((smooth = true) => {
    const el = viewport.current;
    if (!el) return;
    following.current = true;
    setUnread(false);
    animating.current = true;
    if (endTimer.current) clearTimeout(endTimer.current);
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    endTimer.current = setTimeout(() => { animating.current = false; }, 700);
  }, []);

  // Content changes include edits to the current message, not just new array entries.
  useLayoutEffect(() => {
    if (following.current) scrollLatest();
    else setUnread(true);
  }, [signature, scrollLatest]);

  useLayoutEffect(() => { scrollLatest(); }, [scrollRequest, scrollLatest]);

  useEffect(() => {
    const el = viewport.current;
    const inner = content.current;
    if (!el || !inner) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (following.current) scrollLatest();
      });
    });
    observer.observe(inner);
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [scrollLatest]);

  function takeControl() {
    const el = viewport.current;
    following.current = false;
    animating.current = false;
    if (endTimer.current) clearTimeout(endTimer.current);
    // Cancel any in-progress smooth movement before the user's gesture continues.
    if (el) el.scrollTo({ top: el.scrollTop, behavior: 'instant' });
  }

  return <div className="chat-scroll-shell">
    <div className="messages" ref={viewport} tabIndex={0} aria-label="Party messages"
      onWheel={e => { if (e.deltaY < 0) takeControl(); }}
      onTouchStart={e => { touchY.current = e.touches[0].clientY; }}
      onTouchMove={e => { const y = e.touches[0].clientY; if (y > touchY.current) takeControl(); touchY.current = y; }}
      onPointerDown={() => { if (animating.current) takeControl(); }}
      onKeyDown={e => { if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) takeControl(); }}
      onScroll={() => {
        if (atBottom()) { following.current = true; setUnread(false); }
        else if (!animating.current) following.current = false;
      }}>
      <div ref={content} className="message-list">
        {messages.length === 0 && <p>No whispers yet. Who saw what during the blackout?</p>}
        {messages.map((m, i) => <div className="chat-message" key={i}><b>{m.name}</b><p>{m.text}</p></div>)}
      </div>
    </div>
    {unread && <button type="button" className="new-messages" onClick={() => scrollLatest()}>↓ New messages</button>}
  </div>;
}
