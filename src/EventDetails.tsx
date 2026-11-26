import {motion, useReducedMotion} from 'motion/react';
import {dressCode, guestGuidance, programme} from './eventDetails';
import {asset} from './wedding';

export function EventDetails() {
  const reduced = useReducedMotion();
  return <div className="event-details">
    <motion.section className="detail-sheet programme-sheet" aria-labelledby="programme-title"
      initial={reduced ? false : {opacity: 0, y: 18}} whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.1}} transition={{duration: reduced ? 0 : 1.1}}>
      <p className="eyebrow">Our celebration</p>
      <h2 id="programme-title">The programme</h2>
      <p className="provisional-label">Provisional programme · times to be confirmed</p>
      <p className="section-intro">A glimpse of how we hope to celebrate. We’ll share the final order and times here once confirmed.</p>
      <ol className="programme-list">{programme.map(item => <motion.li key={item.title} initial={reduced ? false : {opacity: 0, y: 24}} whileInView={{opacity: 1, y: 0}} viewport={{once: true, amount: 0.45}} transition={{duration: reduced ? 0 : 0.85, ease: 'easeOut'}}>
        <span className="programme-marker" aria-hidden="true"/>
        <div><p className="programme-time">{item.time}</p><h3>{item.title}</h3><p>{item.description}</p></div>
      </motion.li>)}</ol>
    </motion.section>
    <motion.section className="detail-sheet dress-sheet" aria-labelledby="dress-title"
      initial={reduced ? false : {opacity: 0, y: 18}} whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.1}} transition={{duration: reduced ? 0 : 1.1}}>
      <p className="eyebrow">An elegant occasion</p><h2 id="dress-title">Dress beautifully</h2>
      <p className="section-intro">{dressCode.theme}</p>
      <div className="dress-options">
        <article><svg className="dress-emblem" viewBox="0 0 80 90" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M28 10 10 22 7 78h66l-3-56-18-12-12 9-12-9Z M28 10l12 58 12-58 M23 14l-7 22 12 4-5 9 17 19 17-19-5-9 12-4-7-22 M35 16l5 8 5-8 M40 24l-5 26 5 8 5-8-5-26 M40 68v10"/></svg><h3>Gentlemen</h3><p>{dressCode.men}</p><p className="dress-note">Suits &amp; ties</p></article>
        <article><svg className="dress-emblem" viewBox="0 0 80 90" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M29 8h8l3 6 3-6h8l-3 23 16 46q-24 9-48 0l16-46-3-23Z M32 31h16 M34 39 25 77 M46 39l9 38 M40 35v47"/></svg><h3>Ladies</h3><p>{dressCode.women}</p><p className="dress-note">Suggested styling · final guidance to follow</p></article>
      </div>
    </motion.section>
    <motion.section className="detail-sheet guidance-sheet" aria-labelledby="guidance-title"
      initial={reduced ? false : {opacity: 0}} whileInView={{opacity: 1}}
      viewport={{once: true, amount: 0.1}} transition={{duration: reduced ? 0 : 1.1}}>
      <img className="detail-ornament" src={asset('ornaments/gold-divider.png')} alt="" width="180" height="50" loading="lazy"/>
      <p className="eyebrow">A few kind requests</p><h2 id="guidance-title">With love &amp; consideration</h2>
      <p className="section-intro">Thank you for helping us make the day warm, thoughtful and memorable for everyone.</p>
      <dl className="guest-guidance">{guestGuidance.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
    </motion.section>
  </div>;
}
