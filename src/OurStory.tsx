import {useEffect, useState, useRef} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {requestJson} from './request';
export type StoryPhoto = {path: string; caption: string; url?: string};
export type Story = {title: string; body: string; photos: StoryPhoto[]; published: boolean};
export function OurStory() {
  const [story, setStory] = useState<Story | null>(null);
  const [selected, setSelected] = useState<StoryPhoto | null>(null);
  const reduced = useReducedMotion();
  const photos: StoryPhoto[] = [{"path":"IMG-20261125-WA0056.jpg","caption":"Flois & Åge · 1","url":"/assets/story/IMG-20261125-WA0056.jpg"},{"path":"IMG-20261125-WA0057.jpg","caption":"Flois & Åge · 2","url":"/assets/story/IMG-20261125-WA0057.jpg"},{"path":"IMG-20261125-WA0058.jpg","caption":"Flois & Åge · 3","url":"/assets/story/IMG-20261125-WA0058.jpg"},{"path":"IMG-20261125-WA0059.jpg","caption":"Flois & Åge · 4","url":"/assets/story/IMG-20261125-WA0059.jpg"}];
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const node = stage.current;
    if (!node || reduced) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect(); }
    }, {threshold: 0.55});
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);
  useEffect(() => {
    if (!active || complete || selected || reduced) return;
    let elapsed = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      elapsed += 100;
      if (elapsed < 4500) return;
      window.clearInterval(timer);
      if (index + 1 < photos.length) setIndex(index + 1);
      else setComplete(true);
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, complete, index, selected, reduced, photos.length]);
  useEffect(() => {const controller = new AbortController(); void requestJson('/api/story', undefined, {signal: controller.signal}).then(result => {if (!controller.signal.aborted) setStory(result.story);}).catch(() => {}); return () => controller.abort();}, []);
  useEffect(() => {
    if (!selected) return;
    const previous = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {if (event.key === 'Escape') setSelected(null);};
    document.addEventListener('keydown', onKey);
    return () => {document.documentElement.style.overflow = previous; document.removeEventListener('keydown', onKey);};
  }, [selected]);
  return <motion.section className="our-story" aria-labelledby="our-story-title" initial={reduced ? false : {opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true, amount: .1}} transition={{duration: reduced ? 0 : 1.4}}>
    <div className="story-heading"><p className="eyebrow">Flois &amp; Åge</p><h2 id="our-story-title">{story?.title || 'Our story'}</h2><span className="story-rule" aria-hidden="true"/></div>
    <div className="story-editorial">
      <div className="story-artwork">
        <div ref={stage} className="story-cinema" data-story-complete={complete || !!reduced ? 'true' : 'false'}>
          <AnimatePresence initial={false}>
            <motion.button key={photos[index].path} className="story-cinema-photo" onClick={() => setSelected(photos[index])} aria-label={photos[index].caption}
              initial={reduced ? false : {opacity:0, scale:1.035, rotate: index % 2 ? 1.5 : -1.5}} animate={{opacity:1,scale:1,rotate:0}} exit={{opacity:0}} transition={{duration: reduced ? 0 : 0.9}}>
              <img src={photos[index].url} alt={photos[index].caption} decoding="async"/>
            </motion.button>
          </AnimatePresence>
        </div>
        <div className="story-cinema-dots" aria-label="Choose a photograph">{photos.map((photo,i) => <button key={photo.path} type="button" aria-label={'Photo '+(i+1)} aria-pressed={index===i} onClick={()=>{setIndex(i);setComplete(false);setActive(true);}}/>)}</div>
        <p className="story-photo-note">{String(index+1).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</p>
      </div>
      <div className="story-prose"><span className="story-number" aria-hidden="true">01 / Forever begins</span>
        {story?.body ? story.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <><h3>Every love story is beautiful.<br/><em>Welcome to ours.</em></h3><p>With love and joy, we invite you to share in our wedding day.</p><p>We look forward to the next chapter — and to celebrating it with you.</p></>}
        <p className="story-signature">Flois &amp; Åge</p>
      </div>
    </div>
    {selected && <dialog className="photo-lightbox" ref={node => {if (node && !node.open) node.showModal();}} onCancel={() => setSelected(null)} onClick={e => {if (e.target === e.currentTarget) setSelected(null);}} aria-label="Wedding photograph"><button className="lightbox-close" autoFocus onClick={() => setSelected(null)}>Close photo</button><img src={selected.url} alt={selected.caption}/><p>{selected.caption}</p></dialog>}
  </motion.section>;
}
