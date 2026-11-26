import {useState} from 'react';
type Guest = {name:string; partnerName:string; attending:boolean; guestCount:number};
export function DownloadGuestList({guests}:{guests:Guest[]}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function download() {
    setBusy(true);setError('');
    try {
      const [{PDFDocument,rgb}, {default:fontkit}, mark, fontResponse] = await Promise.all([import('pdf-lib'),import('@pdf-lib/fontkit'),fetch('/assets/branding/monogram-fa.png'),fetch('/assets/fonts/DejaVuSerif.ttf')]);
      if (!mark.ok || !fontResponse.ok) throw new Error('Guest list artwork is unavailable.');
      const pdf=await PDFDocument.create();
      pdf.registerFontkit(fontkit);
      const font=await pdf.embedFont(await fontResponse.arrayBuffer(),{subset:true});
      const emblem=await pdf.embedPng(await mark.arrayBuffer());
      const names=guests.filter(g=>g.attending).flatMap(g=>[g.name,...(g.guestCount>1 && g.partnerName?[g.partnerName]:[])]).sort((a,b)=>a.localeCompare(b));
      const gold=rgb(.62,.47,.24), ink=rgb(.20,.16,.12), pale=rgb(.98,.96,.92);
      const perPage=22, count=Math.max(1,Math.ceil(names.length/perPage));
      pdf.setTitle('Flois & Åge — Confirmed Guest List');
      for(let p=0;p<count;p++){
        const page=pdf.addPage([595.28,841.89]),w=595.28;
        const center=(text:string,y:number,size:number,color=ink)=>page.drawText(text,{x:(w-font.widthOfTextAtSize(text,size))/2,y,size,font,color});
        page.drawRectangle({x:24,y:24,width:w-48,height:793.89,borderColor:gold,borderWidth:.7});
        const ratio=Math.min(84/emblem.width,84/emblem.height);
        page.drawImage(emblem,{x:(w-emblem.width*ratio)/2,y:738,width:emblem.width*ratio,height:emblem.height*ratio});
        center('Flois & Åge',710,25,gold);
        center('CONFIRMED GUEST LIST',681,15);
        center('Saturday, 9 January 2027  |  Glee Hotel, Nairobi',659,11);
        center('Total confirmed guests: '+names.length,638,12,gold);
        page.drawRectangle({x:45,y:600,width:w-90,height:24,color:gold});
        page.drawText('No.',{x:55,y:608,size:11,font,color:rgb(1,1,1)});
        page.drawText('Full guest name',{x:100,y:608,size:11,font,color:rgb(1,1,1)});
        names.slice(p*perPage,(p+1)*perPage).forEach((name,i)=>{
          const y=580-i*22;
          if(i%2===0)page.drawRectangle({x:45,y:y-6,width:w-90,height:22,color:pale});
          page.drawText(String(p*perPage+i+1).padStart(2,'0'),{x:55,y,size:10,font,color:gold});
          let size=11;while(font.widthOfTextAtSize(name,size)>440 && size>6)size-=.5;
          page.drawText(name,{x:100,y,size,font,color:ink,maxWidth:440});
        });
        if(!names.length)center('No confirmed guests yet.',550,12);
        page.drawLine({start:{x:45,y:94},end:{x:w-45,y:94},color:gold,thickness:.7});
        center('Confirmed List — Prepared for The Glee Hotel',73,12,gold);
        center('Page '+(p+1)+' of '+count,49,9);
      }
      const bytes=await pdf.save();
      const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));
      const a=document.createElement('a');a.href=url;a.download='Flois-and-Age-Confirmed-Guest-List.pdf';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to prepare guest list.');}finally{setBusy(false);}
  }
  return <span className="pdf-download"><button className="primary" disabled={busy} onClick={()=>void download()}>{busy?'Preparing guest list…':'Download Guest List (PDF)'}</button>{error&&<span role="alert" className="download-error">{error}</span>}</span>;
}
