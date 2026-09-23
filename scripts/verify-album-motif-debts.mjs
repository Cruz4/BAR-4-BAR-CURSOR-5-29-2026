import {
  collectAlbumMotifPromises,
  computeAlbumMotifDebts,
  motifTouchesLyrics,
  openAlbumMotifDebts,
} from '../src/lib/album-motif-debts.ts';

const album = {
  id: 'a1',
  ownerId: 'u1',
  title: 'Test',
  theme: '',
  createdAt: '',
  thingsToSay: ['Neon rain', 'Voicemail'],
  tracks: [
    {
      id: 't1',
      albumId: 'a1',
      ownerId: 'u1',
      title: 'One',
      sections: [
        {
          id: 's1',
          type: 'verse',
          bars: [{ idx: 1, text: 'Neon bleeding on the rain', accepted: true, syllables: 0, rhymeKey: '?' }],
        },
      ],
      vibe: { genre: 'General', tempoBPM: 90, feeling: ['neutral'] },
      intentRefs: [],
      status: 'in_progress',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 't2',
      albumId: 'a1',
      ownerId: 'u1',
      title: 'Two',
      sections: [{ id: 's2', type: 'verse', bars: [{ idx: 1, text: 'Empty road', accepted: true, syllables: 0, rhymeKey: '?' }] }],
      vibe: { genre: 'General', tempoBPM: 90, feeling: ['neutral'] },
      intentRefs: [],
      status: 'in_progress',
      createdAt: '',
      updatedAt: '',
    },
  ],
};

if (!motifTouchesLyrics('Neon rain', ['Neon bleeding on the rain'])) {
  throw new Error('expected neon motif touch');
}
if (motifTouchesLyrics('Voicemail', ['Empty road'])) {
  throw new Error('voicemail should not touch empty road');
}

const promises = collectAlbumMotifPromises(album);
if (promises.length !== 2) throw new Error(`expected 2 promises, got ${promises.length}`);

const debts = computeAlbumMotifDebts(album, 't2');
const neon = debts.find((d) => d.motif === 'Neon rain');
const vm = debts.find((d) => d.motif === 'Voicemail');
if (neon?.status !== 'elsewhere') throw new Error('neon should be elsewhere on t2');
if (vm?.status !== 'open') throw new Error('voicemail should be open');

const open = openAlbumMotifDebts(debts);
if (open.length !== 1 || open[0] !== 'Voicemail') throw new Error('open debts mismatch');

console.log('verify-album-motif-debts: ok');
