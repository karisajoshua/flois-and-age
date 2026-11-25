import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/wedding.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {daysUntilWedding, wedding, asset} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('countdown changes at midnight in Nairobi, not UTC', () => {
  assert.equal(daysUntilWedding(new Date('2027-01-07T20:59:59Z')), 2);
  assert.equal(daysUntilWedding(new Date('2027-01-07T21:00:00Z')), 1);
  assert.equal(daysUntilWedding(new Date('2027-01-08T21:00:00Z')), 0);
  assert.equal(daysUntilWedding(new Date('2027-02-01T00:00:00Z')), 0);
});

test('calendar download uses the confirmed date without inventing a ceremony time', () => {
  const calendar = readFileSync(new URL('../public/flois-and-age-wedding.ics', import.meta.url), 'utf8');
  assert.match(calendar, /DTSTART;VALUE=DATE:20270109\r\n/);
  assert.match(calendar, /DTEND;VALUE=DATE:20270110\r\n/);
  assert.match(calendar, /SUMMARY:Flois & Åge Wedding/);
  assert.match(calendar, /LOCATION:Glee Hotel\\, Nairobi\\, Kenya/);
  assert.doesNotMatch(calendar, /DTSTART[^\r\n]*T\d{6}/);
});

test('directions name the confirmed venue and omit guest location', () => {
  const directions = new URL(wedding.directions);
  assert.equal(directions.hostname, 'www.google.com');
  assert.equal(directions.searchParams.get('destination'), 'Glee Hotel Nairobi');
  assert.equal(directions.searchParams.has('origin'), false);
});

test('every referenced artwork exists and introductory artwork fits the asset budget', () => {
  const sources = ['main.tsx','Envelope.tsx','Storybook.tsx','styles.css'].map(name =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')).join('\n');
  const references = [...sources.matchAll(/asset\('([^']+)'\)/g)].map(match => asset(match[1]));
  const cssReferences = [...sources.matchAll(/url\('([^']+)'\)/g)].map(match => match[1]);
  for (const path of new Set([...references, ...cssReferences])) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Missing artwork: ${path}`);
  }
  const initial = ['backgrounds/ivory-silk.png','branding/monogram-fa.png','ornaments/gold-divider.png',
    'envelope/envelope-body.png','envelope/envelope-flap.png','envelope/envelope-interior.png',
    'envelope/envelope-foreground-pocket.png','envelope/wax-seal.png','stationery/invitation-card.png'];
  const bytes = initial.reduce((sum, path) => sum + statSync(new URL(`../public${asset(path)}`, import.meta.url)).size, 0);
  assert.ok(bytes < 800_000, `Initial artwork is ${bytes} bytes`);
});
