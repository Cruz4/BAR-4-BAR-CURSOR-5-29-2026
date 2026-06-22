import fs from 'fs';

const bar = (idx, text, rhymeKey) => ({
  idx,
  text,
  accepted: true,
  syllables: text.split(/\s+/).filter(Boolean).length,
  rhymeKey: rhymeKey || (text.match(/[a-zA-Z]+$/)?.[0]?.toLowerCase() ?? 'a'),
  lineSource: 'written',
});

const section = (id, type, lines) => ({
  id,
  type,
  bars: lines.map((l, i) => bar(i + 1, l.text, l.rhyme)),
});

const track = (id, albumId, title, status, sections, vibeExtra = {}) => ({
  id,
  albumId,
  ownerId: 'import-placeholder',
  title,
  status,
  createdAt: '2026-06-01T12:00:00.000Z',
  vibe: {
    enabled: true,
    genre: vibeExtra.genre || 'Hip-Hop',
    tempoBPM: vibeExtra.tempo || 92,
    feeling: vibeExtra.feeling || ['focused', 'nocturnal'],
    instrumentation: vibeExtra.instrumentation || 'Drums, bass, sparse keys.',
  },
  intentRefs: [],
  intentsEnabled: false,
  sections,
  rhymeHighlightingEnabled: true,
});

const albums = [
  {
    id: 'album-neon-after-hours',
    ownerId: 'import-placeholder',
    title: 'NEON AFTER HOURS',
    theme: 'City lights, late sessions, and bars that refuse to sleep.',
    message: 'The booth is the only place the clock stops.',
    thingsToSay: ['Glass on the console', 'Taxi steam at 3am', 'Voicemail full of demos'],
    createdAt: '2026-06-01T10:00:00.000Z',
    direction: {
      enabled: true,
      setting_world: 'A downtown studio with pink neon leaking through the blinds.',
      emotion_core: 'Restless focus after the world clocks out.',
      trigger_moment: 'The last train rattles past the block.',
      message_truth: 'Discipline is love with a metronome.',
      tone_palette: 'Magenta, asphalt grey, and cigarette amber.',
    },
    tracks: [
      track('track-neon-01', 'album-neon-after-hours', 'BOOTH LIGHT', 'complete', [
        section('sec-neon-01-v', 'verse', [
          { text: 'Pink light on the faders, coffee going cold again', rhyme: 'again' },
          { text: 'I write the same four bars until they sound like friends', rhyme: 'friends' },
          { text: 'The city hums a bassline through the vent and wall', rhyme: 'wall' },
          { text: 'I treat the silence like a sample I can stall', rhyme: 'stall' },
        ]),
        section('sec-neon-01-h', 'hook', [
          { text: 'After hours, after doubt, after all the noise', rhyme: 'noise' },
          { text: 'I find the one true line and treat it like a choice', rhyme: 'choice' },
        ]),
      ], { genre: 'Boom Bap', tempo: 88, feeling: ['gritty', 'focused'] }),
      track('track-neon-02', 'album-neon-after-hours', 'TAXI STEAM', 'in_progress', [
        section('sec-neon-02-v', 'verse', [
          { text: 'Yellow cab steam on the glass like a cheap effect', rhyme: 'effect' },
          { text: 'I pocket every hook I almost wrote but never kept', rhyme: 'kept' },
          { text: 'The meter runs on minutes I cannot get back', rhyme: 'back' },
          { text: 'So I turn the pain to cadence on a worn-out track', rhyme: 'track' },
        ]),
      ], { genre: 'Lo-Fi Hip-Hop', tempo: 78 }),
      track('track-neon-03', 'album-neon-after-hours', 'VOICEMAIL DEMO', 'in_progress', [
        section('sec-neon-03-v', 'verse', [
          { text: 'My inbox full of maybes and a beat I never finished', rhyme: 'finished' },
          { text: 'I loop the same eight bars until the doubt diminished', rhyme: 'diminished' },
          { text: 'The neon flickers once and paints the wall electric blue', rhyme: 'blue' },
          { text: 'I press record and tell the truth I never meant to', rhyme: 'to' },
        ]),
      ]),
      track('track-neon-04', 'album-neon-after-hours', 'LAST TRAIN', 'in_progress', [
        section('sec-neon-04-v', 'verse', [
          { text: 'Steel wheels scream goodbye through the tunnel under town', rhyme: 'town' },
          { text: 'I pack my notes in pockets till the morning comes around', rhyme: 'around' },
          { text: 'The booth still smells like incense and ambition mixed with fear', rhyme: 'fear' },
          { text: 'I leave one verse unfinished just to prove I was here', rhyme: 'here' },
        ]),
      ]),
    ],
  },
  {
    id: 'album-iron-district',
    ownerId: 'import-placeholder',
    title: 'IRON DISTRICT',
    theme: 'Industrial grit, warehouse shows, and rusted ambition.',
    message: 'Pressure makes the bars honest.',
    thingsToSay: ['Chain-link skyline', 'Welding sparks at midnight'],
    createdAt: '2026-06-02T10:00:00.000Z',
    direction: {
      enabled: true,
      setting_world: 'Abandoned factory floors converted to underground stages.',
      emotion_core: 'Aggressive clarity under fluorescent hum.',
      trigger_moment: 'The generator coughs alive for one more set.',
      message_truth: 'Scars are just stories with better percussion.',
      tone_palette: 'Rust orange, oil black, and steel blue.',
    },
    tracks: [
      track('track-iron-01', 'album-iron-district', 'WELD SPARK', 'complete', [
        section('sec-iron-01-v', 'verse', [
          { text: 'Sparks rain down like confetti on the concrete floor', rhyme: 'floor' },
          { text: 'I spit bars heavy enough to bend a steel door', rhyme: 'door' },
          { text: 'The crowd is small but hungry, every head a mic check', rhyme: 'check' },
          { text: "I bleed the blueprint through a verse they won't forget", rhyme: 'forget' },
        ]),
      ], { genre: 'Industrial Hip-Hop', tempo: 96, feeling: ['aggressive', 'raw'] }),
      track('track-iron-02', 'album-iron-district', 'CHAIN LINK', 'in_progress', [
        section('sec-iron-02-v', 'verse', [
          { text: 'Chain-link horizon cutting sky into a grid', rhyme: 'grid' },
          { text: 'I learned to rhyme in alleys where the brave kids hid', rhyme: 'hid' },
          { text: 'The bass hits like a piston in a chest of doubt', rhyme: 'doubt' },
          { text: 'I write until the factory lights finally go out', rhyme: 'out' },
        ]),
      ]),
      track('track-iron-03', 'album-iron-district', 'GENERATOR', 'in_progress', [
        section('sec-iron-03-v', 'verse', [
          { text: 'Generator coughs and coughs but never lets us down', rhyme: 'down' },
          { text: 'We run the set on faith and one extension cord in town', rhyme: 'town' },
          { text: 'The reverb lives inside a tank we found abandoned', rhyme: 'abandoned' },
          { text: 'I leave my tag in lyrics sharper than a brand did', rhyme: 'brand did' },
        ]),
      ]),
      track('track-iron-04', 'album-iron-district', 'RUST HYMN', 'in_progress', [
        section('sec-iron-04-v', 'verse', [
          { text: 'Rust eats the railing but it cannot eat my will', rhyme: 'will' },
          { text: 'I stack syllables like girders on a windowsill', rhyme: 'sill' },
          { text: 'The district sleeps in oil stains and broken neon signs', rhyme: 'signs' },
          { text: 'I carve my name in rhythm between the power lines', rhyme: 'lines' },
        ]),
      ]),
    ],
  },
  {
    id: 'album-coastal-static',
    ownerId: 'import-placeholder',
    title: 'COASTAL STATIC',
    theme: 'Salt air, tape hiss, and memories washed in reverb.',
    message: 'Some truths only arrive at low tide.',
    thingsToSay: ['Boardwalk static', 'Fog horn at dawn'],
    createdAt: '2026-06-03T10:00:00.000Z',
    direction: {
      enabled: true,
      setting_world: 'A cliffside shack studio above a crashing shoreline.',
      emotion_core: 'Melancholy washed clean by wind.',
      trigger_moment: 'The first gull cry before sunrise.',
      message_truth: 'Let go or be dragged by your own tide.',
      tone_palette: 'Sea foam, driftwood grey, and horizon gold.',
    },
    tracks: [
      track('track-coast-01', 'album-coastal-static', 'LOW TIDE', 'complete', [
        section('sec-coast-01-v', 'verse', [
          { text: 'Low tide exposes secrets that the high tide hides', rhyme: 'hides' },
          { text: 'I walk the wet sand writing bars the ocean tries', rhyme: 'tries' },
          { text: 'To wash away before I memorize the line', rhyme: 'line' },
          { text: 'I keep the sharpest ones and let the rest resign', rhyme: 'resign' },
        ]),
      ], { genre: 'Coastal Folk Rap', tempo: 72, feeling: ['reflective', 'windy'] }),
      track('track-coast-02', 'album-coastal-static', 'FOG HORN', 'in_progress', [
        section('sec-coast-02-v', 'verse', [
          { text: 'Fog horn moans a warning only locals understand', rhyme: 'understand' },
          { text: 'I tape the hiss and call it percussion in my hand', rhyme: 'hand' },
          { text: 'The cliff edge teaches balance or a brutal fall', rhyme: 'fall' },
          { text: 'I write with one foot grounded, one foot free of all', rhyme: 'all' },
        ]),
      ]),
      track('track-coast-03', 'album-coastal-static', 'BOARDWALK', 'in_progress', [
        section('sec-coast-03-v', 'verse', [
          { text: 'Boardwalk closed for season but the static still remains', rhyme: 'remains' },
          { text: 'I sample childhood summers mixed with present-day pains', rhyme: 'pains' },
          { text: 'The arcade lights are ghosts behind a metal gate', rhyme: 'gate' },
          { text: 'I rhyme my way back home before it gets too late', rhyme: 'late' },
        ]),
      ]),
      track('track-coast-04', 'album-coastal-static', 'SALT LINE', 'in_progress', [
        section('sec-coast-04-v', 'verse', [
          { text: 'Salt line on my lips from shouting at the sea', rhyme: 'sea' },
          { text: 'I treat each wave collapse like someone answering me', rhyme: 'me' },
          { text: 'The horizon draws a bar I never quite can cross', rhyme: 'cross' },
          { text: 'I write until the sun decides to take its loss', rhyme: 'loss' },
        ]),
      ]),
    ],
  },
  {
    id: 'album-velvet-circuit',
    ownerId: 'import-placeholder',
    title: 'VELVET CIRCUIT',
    theme: 'Late-night soul circuits, analog warmth, and velvet confidence.',
    message: 'Smooth is not soft — it is controlled fire.',
    thingsToSay: ['Tube amp glow', 'Silk over sub-bass'],
    createdAt: '2026-06-04T10:00:00.000Z',
    direction: {
      enabled: true,
      setting_world: 'A velvet-draped listening room wired to vintage amps.',
      emotion_core: 'Controlled heat beneath polished delivery.',
      trigger_moment: 'The needle drops on side A of a forgotten LP.',
      message_truth: 'Elegance is discipline wearing perfume.',
      tone_palette: 'Burgundy, brass gold, and midnight violet.',
    },
    tracks: [
      track('track-velvet-01', 'album-velvet-circuit', 'TUBE GLOW', 'complete', [
        section('sec-velvet-01-v', 'verse', [
          { text: 'Tube glow paints the corner where the good ideas wait', rhyme: 'wait' },
          { text: 'I pour a measured cadence like a sommelier of fate', rhyme: 'fate' },
          { text: 'The sub-bass sits beneath a silk-lined vocal tone', rhyme: 'tone' },
          { text: 'I make the complicated sound like it was always known', rhyme: 'known' },
        ]),
      ], { genre: 'Soul Hip-Hop', tempo: 84, feeling: ['smooth', 'confident'] }),
      track('track-velvet-02', 'album-velvet-circuit', 'SIDE A', 'in_progress', [
        section('sec-velvet-02-v', 'verse', [
          { text: 'Side A starts with crackle like a door to somewhere old', rhyme: 'old' },
          { text: 'I sample grace from records that were never sold', rhyme: 'sold' },
          { text: 'The circuit hums a blessing through the copper and the cloth', rhyme: 'cloth' },
          { text: 'I write a verse that fits the room like tailored broth', rhyme: 'broth' },
        ]),
      ]),
      track('track-velvet-03', 'album-velvet-circuit', 'COPPER LINE', 'in_progress', [
        section('sec-velvet-03-v', 'verse', [
          { text: 'Copper line from heart to mic, no signal lost in transit', rhyme: 'transit' },
          { text: 'I polish every metaphor until the listener can grab it', rhyme: 'grab it' },
          { text: 'The velvet deadens echo but it amplifies intent', rhyme: 'intent' },
          { text: 'I leave the session knowing exactly what I meant', rhyme: 'meant' },
        ]),
      ]),
      track('track-velvet-04', 'album-velvet-circuit', 'MIDNIGHT VIOLET', 'in_progress', [
        section('sec-velvet-04-v', 'verse', [
          { text: 'Midnight violet drapes the booth in quiet royalty', rhyme: 'royalty' },
          { text: 'I stack internal rhymes with unapologetic loyalty', rhyme: 'loyalty' },
          { text: 'The circuit closes when the last bar lands precise', rhyme: 'precise' },
          { text: 'I dim the lights and let the mix become advice', rhyme: 'advice' },
        ]),
      ]),
    ],
  },
];

const outPath = 'sample-data/bar4bar-studio-vault-4x4-import.json';
fs.mkdirSync('sample-data', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(albums, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Albums: ${albums.length}, Tracks: ${albums.reduce((n, a) => n + a.tracks.length, 0)}`);
