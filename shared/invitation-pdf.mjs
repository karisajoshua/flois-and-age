import {PDFDocument, PDFName, PDFString, rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
export const invitationUrl = 'https://flois-and-age.vercel.app/';
export async function createInvitationPdf({emblem, font, guestNames = ''}) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  doc.setTitle('Flois & Åge — Wedding Invitation'); doc.setAuthor('Flois & Åge'); doc.setSubject('9 January 2027 · Glee Hotel, Nairobi');
  const face = await doc.embedFont(font, {subset: true});
  const mark = await doc.embedPng(emblem);
  const qr = await doc.embedPng(await QRCode.toDataURL(invitationUrl, {errorCorrectionLevel: 'M', margin: 1, width: 360, color: {dark: '#674b27', light: '#fffaf0'}}));
  const page = doc.addPage([420, 595]);
  const gold = rgb(.46, .32, .14), ink = rgb(.28, .22, .16), muted = rgb(.43, .38, .29);
  page.drawRectangle({x: 0, y: 0, width: 420, height: 595, color: rgb(1, .98, .94)});
  for (const inset of [18, 24]) page.drawRectangle({x: inset, y: inset, width: 420 - inset * 2, height: 595 - inset * 2, borderWidth: inset === 18 ? .8 : .35, borderColor: rgb(.69, .54, .31)});
  function center(text, y, size, color = ink, maxWidth = 340) {
    const glyphs = face.getCharacterSet();
    if (Array.from(text).some(c => !glyphs.includes(c.codePointAt(0)))) throw new Error('A character in these names is not supported by the invitation font. Please download the general invitation PDF instead.');
    const safe = text;
    const width = face.widthOfTextAtSize(safe, size);
    const fit = Math.min(size, size * maxWidth / Math.max(1, width));
    page.drawText(safe, {x: (420 - face.widthOfTextAtSize(safe, fit)) / 2, y, font: face, size: fit, color});
  }
  page.drawImage(mark, {x: 133, y: 416, width: 154, height: 154});
  center('TOGETHER WITH THEIR FAMILIES', 409, 8, muted);
  center('Flois & Åge', 370, 31, gold);
  center('Joyfully invite you to celebrate their wedding', 345, 10);
  if (guestNames) center(guestNames, 316, 12, gold);
  page.drawLine({start: {x: 166, y: 300}, end: {x: 254, y: 300}, thickness: .6, color: gold});
  center('SATURDAY, 9 JANUARY 2027', 274, 12, gold);
  center('Glee Hotel, Nairobi', 250, 13);
  center('With love, we look forward to celebrating with you.', 222, 8.5, muted);
  page.drawImage(qr, {x: 168, y: 117, width: 84, height: 84});
  center('OPEN YOUR INVITATION & RSVP', 95, 9, gold);
  center('flois-and-age.vercel.app', 75, 9, muted);
  center('Tap the link above or scan the QR code.', 51, 7, muted);
  const link = doc.context.register(doc.context.obj({Type: 'Annot', Subtype: 'Link', Rect: [68, 67, 352, 205], Border: [0, 0, 0], A: {Type: 'Action', S: 'URI', URI: PDFString.of(invitationUrl)}}));
  page.node.set(PDFName.of('Annots'), doc.context.obj([link]));
  return doc.save();
}
