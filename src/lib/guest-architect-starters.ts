/**
 * Curated unfinished bars in Lyrical Architect style for guest try sheet.
 * Multisyllabic internals, concrete imagery, restrained adjectives — left open.
 */

const STARTERS: string[] = [
  'I was counting the cracks in the ceiling before the morning knew my name…',
  'The hallway kept my footsteps like a secret it never learned to spend…',
  'Streetlights stuttered Morse on wet asphalt and I answered in breath…',
  'My shadow learned my gait before the mirror learned my face…',
  'Ink bled through the napkin while the diner clock pretended not to watch…',
  'I folded the apology into my pocket until the seams remembered the weight…',
  'Rain wrote receipts on the window — every drop a debt I still negotiate…',
  'The train door closed on a sentence I had practiced for three stations…',
  'Concrete kept the heat of noon like a grudge under my sneakers…',
  'I tuned the silence between sirens until it hummed like a second pulse…',
  'Her voicemail aged in my phone like fruit left too long on the sill…',
  'Neon carved my outline into brick and dared me to step out of it…',
  'I stacked unpaid dreams behind the fridge where dust keeps better time…',
  'The bridge held its breath with me while the river practiced leaving…',
  'Cassette hiss taught me honesty before any chorus learned my key…',
  'I measured courage in elevator floors that never quite reached the roof…',
  'Smoke from the grill wrote my biography in cursive nobody could read…',
  'The last bus left a ghost of headlights on my knees and a question…',
  'I practiced introductions to empty chairs until the chairs had opinions…',
  'Winter kept my hands in fists so the truth would fit smaller…',
  'The studio bulb flickered like it was editing my confidence in real time…',
  'I left fingerprints on the glass where ambition pressed its forehead…',
  'Alley cats audited my alibis and found them short by two heartbeats…',
  'My notebook smelled like rain and unfinished arguments with myself…',
  'The skyline wore fog like a hoodie pulled low over its intentions…',
  'I borrowed tomorrow’s confidence and paid interest in sleepless nights…',
  'Bass from the next block rearranged the dust in patterns I almost trusted…',
  'The payphone still remembered numbers my pockets forgot how to dial…',
  'I traced constellation scars on the dashboard waiting for a green light…',
  'Coffee cooled into a mirror that refused to flatter my resolve…',
  'The fire escape held more honesty than the living room ever scheduled…',
  'I argued with the thermostat about how cold a promise can get…',
  'Graffiti spelled my almost-name in letters taller than my excuses…',
  'The moon clocked overtime above a city that never clocked out…',
  'I kept the ticket stub like evidence that I almost made the show…',
  'Sidewalk chalk washed away before the confession finished drying…',
  'My headphones leaked courage into the commute one bar at a time…',
  'The vending machine ate my change and taught me patience with a clunk…',
  'I rehearsed the ending in the shower until steam edited the plot…',
  'Dawn arrived early and caught me still negotiating with midnight…',
];

/** Pick a random starter; optionally avoid repeating the last one. */
export function pickGuestStarterLine(exclude?: string | null): string {
  if (STARTERS.length === 0) return 'I left the line unfinished on purpose…';
  if (STARTERS.length === 1) return STARTERS[0]!;
  let pick = STARTERS[Math.floor(Math.random() * STARTERS.length)]!;
  if (exclude && STARTERS.length > 1) {
    let guard = 0;
    while (pick === exclude && guard < 8) {
      pick = STARTERS[Math.floor(Math.random() * STARTERS.length)]!;
      guard += 1;
    }
  }
  return pick;
}

export function guestArchitectStarterCount(): number {
  return STARTERS.length;
}
