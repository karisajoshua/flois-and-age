import {useRef, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {asset, wedding} from './wedding';

const chapters = [
  {
    title: 'A new chapter',
    left: <>Every love story is beautiful.<br/><em>Welcome to ours.</em></>,
    right: <>With love and joy, we invite you to share in our wedding day.</>,
    rightTitle: 'Together with you',
  },
  {
    title: 'Our wedding day',
    left: <>Saturday<br/><strong>9 January 2027</strong></>,
    right: <>{wedding.venue}<br/>Kenya</>,
    rightTitle: 'The celebration',
  },
];

export function Storybook() {
  const [page, setPage] = useState(-1);
  const [turning, setTurning] = useState(false);
  const turnLock = useRef(false);
  const reduced = useReducedMotion();

  function turn(next: number) {
    if (turnLock.current || next < -1 || next >= chapters.length) return;
    turnLock.current = !reduced;
    setTurning(!reduced);
    setPage(next);
  }

  function finishTurn() {
    turnLock.current = false;
    setTurning(false);
  }

  return <motion.section className="story-chapter" aria-label="Wedding storybook"
    initial={reduced ? false : {opacity: 0}} whileInView={{opacity: 1}}
    viewport={{once: true, amount: 0.15}} transition={{duration: reduced ? 0 : 1.6}}>
    <p className="eyebrow">The beginning of forever</p>
    <div className={`album ${page < 0 ? 'is-closed' : 'is-open'}`}>
      {page < 0 ? <motion.div className="album-cover" key="cover"
        initial={reduced ? false : {opacity: 0}} animate={{opacity: 1}}
        transition={{duration: reduced ? 0 : 0.8}} onAnimationComplete={finishTurn}>
        <img src={asset('storybook/book-cover.png')} alt="Ivory storybook with original gold filigree" width="854" height="1100" loading="lazy"/>
        <div className="cover-copy">
          <p className="eyebrow">Flois &amp; Åge</p><h2>A new<br/>chapter</h2>
          <p>9 January 2027</p>
          <button className="quiet" disabled={turning} onClick={() => turn(0)}>Open our book</button>
        </div>
      </motion.div> : <div className="album-spread">
        <img className="spread-art" src={asset('storybook/book-open-spread.png')} alt="" width="1100" height="733" loading="lazy"/>
        <motion.div className="spread-content" key={page}
          initial={reduced ? false : {opacity: 0}} animate={{opacity: 1}}
          transition={{duration: reduced ? 0 : 1.3}} onAnimationComplete={finishTurn}>
          <div className="album-page">
            <p className="eyebrow">Flois &amp; Åge</p>
            <h2>{chapters[page].title}</h2>
            <p>{chapters[page].left}</p>
          </div>
          <div className="album-page">
            <p className="eyebrow">With love</p>
            <h3>{chapters[page].rightTitle}</h3>
            <p>{chapters[page].right}</p>
          </div>
        </motion.div>
        {!reduced && turning && <motion.div key={`leaf-${page}`} className="turning-leaf" aria-hidden="true"
          initial={{rotateY: -175}} animate={{rotateY: 0}}
          transition={{duration: 1.3, ease: 'easeInOut'}}/>}
      </div>}
    </div>
    <div className="story-controls">
      <button className="quiet" disabled={turning || page === -1} onClick={() => turn(page - 1)}>
        {page === 0 ? 'Close book' : 'Previous'}
      </button>
      <span role="status" aria-live="polite">{page < 0 ? 'Cover' : `Chapter ${page + 1} of ${chapters.length}`}</span>
      <button className="primary" disabled={turning || page === chapters.length - 1} onClick={() => turn(page + 1)}>
        {page < 0 ? 'Open book' : 'Next chapter'}
      </button>
    </div>
  </motion.section>;
}
