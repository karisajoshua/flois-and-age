import {useEffect, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {requestJson} from './request';
export type StoryPhoto = {path: string; caption: string; url?: string};
export type Story = {title: string; body: string; photos: StoryPhoto[]; published: boolean};
export function OurStory() {
  const [story, setStory] = useState<Story | null>(null);
  const [selected, setSelected] = useState<StoryPhoto | null>(null);
  const reduced = useReducedMotion();
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
        {story?.photos[0]?.url ? <button className="story-photo-button" onClick={() => setSelected(story.photos[0])} aria-label={`Enlarge photo: ${story.photos[0].caption}`}><img src={story.photos[0].url} alt={story.photos[0].caption} loading="lazy" width="640" height="800"/></button> : <div className="story-keepsake"><img src="/assets/story/cream-roses.webp" alt="" loading="lazy" width="640" height="800"/><div><p className="eyebrow">The beginning of forever</p><p className="story-initials">F &amp; Å</p><span>9 January 2027</span></div></div>}
        <p className="story-photo-note">{story?.photos[0]?.caption || 'A new chapter, together.'}</p>
      </div>
      <div className="story-prose"><span className="story-number" aria-hidden="true">01 / Forever begins</span>
        {story?.body ? story.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <><h3>Every love story is beautiful.<br/><em>Welcome to ours.</em></h3><p>With love and joy, we invite you to share in our wedding day.</p><p>Our story and favourite photographs will be shared here soon. For now, we look forward to the next chapter — and to celebrating it with you.</p></>}
        <p className="story-signature">Flois &amp; Åge</p>
      </div>
    </div>
    {story && story.photos.length > 1 && <div className="story-gallery">{story.photos.slice(1).map((photo, i) => <figure key={photo.path}><button className="story-photo-button" onClick={() => setSelected(photo)} aria-label={`Enlarge photo: ${photo.caption}`}><img src={photo.url} alt={photo.caption} loading="lazy" width="600" height="750"/></button><figcaption><span aria-hidden="true">0{i + 2}</span>{photo.caption}</figcaption></figure>)}</div>}
    {selected && <dialog className="photo-lightbox" ref={node => {if (node && !node.open) node.showModal();}} onCancel={() => setSelected(null)} onClick={e => {if (e.target === e.currentTarget) setSelected(null);}} aria-label="Wedding photograph"><button className="lightbox-close" autoFocus onClick={() => setSelected(null)}>Close photo</button><img src={selected.url} alt={selected.caption}/><p>{selected.caption}</p></dialog>}
  </motion.section>;
}
