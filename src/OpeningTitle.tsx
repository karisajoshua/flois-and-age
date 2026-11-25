import {useEffect, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {asset, wedding} from './wedding';

function TypedNames({reduced}: {reduced: boolean}) {
  const letters = Array.from(wedding.names);
  const [length, setLength] = useState(reduced ? letters.length : 0);
  useEffect(() => {
    if (reduced) { setLength(letters.length); return; }
    setLength(0);
    let ticker: number | undefined;
    const start = window.setTimeout(() => {
      ticker = window.setInterval(() => setLength(value => {
        if (value + 1 >= letters.length) window.clearInterval(ticker);
        return Math.min(value + 1, letters.length);
      }), 125);
    }, 1350);
    return () => { window.clearTimeout(start); window.clearInterval(ticker); };
  }, [reduced, letters.length]);
  return <span className="typed-names">
    <span className="sr-only">{wedding.names}</span>
    <span className="typing-size" aria-hidden="true">{wedding.names}</span>
    <span className="typing-visual" aria-hidden="true">{letters.slice(0, length).join('')}
      {!reduced && length < letters.length && <span className="typing-caret"/>}
    </span>
  </span>;
}

export function OpeningTitle({automatic = true, onStart}: {automatic?: boolean; onStart?: () => void}) {
  const reduced = Boolean(useReducedMotion());
  const entrance = (delay: number) => ({
    initial: reduced ? false as const : {opacity: 0, y: 12},
    animate: {opacity: 1, y: 0},
    transition: {duration: reduced ? 0 : 1.2, delay: reduced ? 0 : delay, ease: 'easeOut' as const},
  });
  return <>
    <motion.p className="eyebrow intro-item" {...entrance(0.1)}>A celebration of love</motion.p>
    <motion.img className="intro-mark intro-item" src={asset('branding/monogram-fa.png')}
      alt="F & Å" fetchPriority="high" width="330" height="330" {...entrance(0.4)}/>
    <motion.h1 className="intro-item" {...entrance(0.9)}><TypedNames reduced={reduced}/></motion.h1>
    <motion.p className="eyebrow intro-item" {...entrance(2.5)}>{wedding.dateLabel}</motion.p>
    <motion.p className="opening-verse intro-item" {...entrance(2.9)}>Every love story is beautiful.<br/>Welcome to ours.</motion.p>
    <motion.p className="intro-venue intro-item" {...entrance(3.3)}>{wedding.venue}</motion.p>
    <>{onStart ? <motion.button type="button" className="primary intro-start" onClick={onStart} {...entrance(1.8)}>Open Invitation</motion.button> : <motion.p className="scroll-cue intro-item" {...entrance(0)}>{automatic ? 'Your invitation is unfolding…' : 'Scroll to your invitation'}<span aria-hidden="true">⌄</span></motion.p>}</>
  </>;
}
