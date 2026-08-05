/**
 * Generates src/lib/scene/scene-neon-lexicon-corpus.ts
 * Large evocative lexicon for Scene neon (craft / night / writing / music).
 * Run: node scripts/generate-scene-neon-corpus.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, { words: string[]; gloss: (w: string) => string }>} */
const BANKS = {
  poetry: {
    gloss: (w) => `Poetry craft — let ${w} bend the line.`,
    words: [
      'caesura','enjambment','volta','strophe','sestina','villanelle','quatrain','couplet','tercet','octave',
      'hemistich','catalexis','elision','ellipsis','anaphora','epistrophe','chiasmus','zeugma','metonymy','synecdoche',
      'litotes','hyperbole','apostrophe','prosody','scansion','dactyl','spondee','trochee','iamb','anapest',
      'hexameter','pentameter','tetrameter','trimeter','dimeter','monometer','alexandrine','freeverse','blankverse','ode',
      'elegy','pastoral','eclogue','idyll','dirge','threnody','paean','invective','jeremiad','manifesto',
      'palimpsest','incipit','excipit','colophon','epigraph','epilogue','prologue','interlude','coda','refrain',
      'leitmotif','motif','trope','archetype','allegory','parable','fable','mythos','lore','canon',
      'apocrypha','fragment','shard','splinter','remnant','relic','vestige','trace','residue','afterimage',
    ],
  },
  music: {
    gloss: (w) => `Music in the mouth — ${w} as feel.`,
    words: [
      'nocturne','timbre','anacrusis','polyphony','assonance','syncopation','ostinato','cadence','sotto','rubato',
      'melisma','counterpoint','tessitura','parlando','aria','legato','staccato','pizzicato','vibrato','glissando',
      'fermata','crescendo','diminuendo','fortissimo','pianissimo','mezzo','allegro','andante','adagio','presto',
      'ritardando','accelerando','sforzando','arpeggio','ostinato','polyrhythm','crossrhythm','downbeat','upbeat','backbeat',
      'hook','bridge','outro','prelude','sonata','fugue','canon','round','drone','pedal',
      'overtone','undertone','harmonic','dissonance','consonance','resolution','modulation','transposition','inversion','augmentation',
      'sequence','motif','riff','lick','break','drop','swell','wash','haze',
      'reverb','delay','chorus','phaser','flanger','distortion','saturation','warmth','bite','grain',
    ],
  },
  night: {
    gloss: (w) => `Night lexicon — ${w} under the skyline.`,
    words: [
      'vesper','liminal','ephemera','sonder','afterglow','hushed','glimmer','murmur','orbit','inkwell',
      'midnight','twilight','dusk','dawn','aurora','nebula','constellation','eclipse','umbra','penumbra',
      'moonrise','moonset','starlight','streetlight','lamplight','candlelight','firefly','ember','ash','cinder',
      'fog','mist','haze','smog','drizzle','downpour','squall','gust','breeze','zephyr',
      'alley','rooftop','skylight','stoop','curb','corner','crosswalk','overpass','underpass','viaduct',
      'neon','marquee','billboard','awning','storefront','fireescape','scaffold','crane','skyline','horizon',
      'insomniac','nightowl','graveyard','witching','witchinghour','latenight','afterhours','lastcall','closingtime','lasttrain',
      'silence','quietude','stillness','hush','whisper','rustle','creak','hum','buzz','thrum',
    ],
  },
  craft: {
    gloss: (w) => `Booth craft — build with ${w}.`,
    words: [
      'blueprint','margin','cipher','prosody','cadence','motif','refrain','volta','counterpoint','incipit',
      'draft','revise','rewrite','cut','splice','stitch','weave','braid','knot','looseend',
      'throughline','spine','skeleton','scaffold','frame','chassis','engine','throttle','brake','clutch',
      'punchline','setup','turn','twist','reveal','conceal','misdirect','payoff','callback','plant',
      'internal','multisyllabic','slant','near','perfect','forced','family','cluster','chain','ladder',
      'bar','measure','phrase','clause','clause','clause','stanza','verse','chorus','hook',
      'flow','pocket','pocket','swing','drag','rush','lean','push','pull','float',
      'density','economy','restraint','excess','ornament','ornate','spare','lean','tight','loose',
    ],
  },
  texture: {
    gloss: (w) => `Texture word — feel ${w} in the bar.`,
    words: [
      'velvet','satin','silk','linen','wool','denim','leather','suede','canvas','burlap',
      'chrome','brass','copper','iron','steel','pewter','mercury','glass','crystal','obsidian',
      'marble','granite','slate','basalt','sandstone','chalk','charcoal','graphite','ink','lead',
      'smoke','steam','vapor','dust','pollen','ash','soot','rust','patina','verdigris',
      'gloss','matte','sheen','luster','tarnish','polish','scratch','scar','crease','fold',
      'ripple','wave','grain','weave','mesh','lattice','grid','mosaic','tessera','shard',
      'thorn','petal','bark','root','vine','moss','lichen','fungus','spore','seed',
      'pulse','throb','ache','sting','burn','chill','thaw','freeze','melt','smolder',
    ],
  },
  emotion: {
    gloss: (w) => `Carry ${w} into the next bar.`,
    words: [
      'longing','yearning','hunger','thirst','ache','pang','twinge','sting','wound','scar',
      'grace','mercy','spite','wrath','envy','awe','dread','hope','doubt','faith',
      'defiance','surrender','resolve','hesitation','courage','cowardice','pride','shame','guilt','innocence',
      'nostalgia','melancholy','euphoria','rapture','bliss','sorrow','grief','mourning','solace','comfort',
      'loneliness','belonging','exile','homecoming','departure','return','absence','presence','ghost','haunt',
      'obsession','fixation','devotion','betrayal','loyalty','trust','suspicion','paranoia','clarity','confusion',
      'ambition','apathy','drive','drift','focus','scatter','calm','chaos','order','entropy',
      'tenderness','brutality','gentleness','harshness','softness','edge','blunt','sharp','dull','keen',
    ],
  },
  motion: {
    gloss: (w) => `Motion in the line — ${w}.`,
    words: [
      'drift','glide','soar','plunge','dive','rise','fall','spiral','orbit','circle',
      'pivot','swerve','veer','tilt','lean','lurch','stagger','stumble','sprint','crawl',
      'hover','float','sink','buoy','anchor','moor','cast','reel','tether','sever',
      'surge','ebb','flood','recede','crest','trough','break','crash','splash','ripple',
      'flicker','flare','spark','ignite','smolder','extinguish','kindle','bank','stoke','douse',
      'unfold','unfurl','collapse','expand','contract','compress','stretch','snap','bend','warp',
      'echo','rebound','ricochet','deflect','absorb','reflect','refract','scatter','gather','collect',
      'vanish','appear','emerge','submerge','surface','breach','pierce','cleave','split','fuse',
    ],
  },
  city: {
    gloss: (w) => `City grain — ${w} on the block.`,
    words: [
      'stoop','hydrant','manhole','grate','gutter','drain','pipe','valve','meter','fuse',
      'subway','platform','turnstile','token','fare','transfer','express','local','terminal','depot',
      'diner','booth','counter','juke','neon','signage','graffiti','tag','throwup','mural',
      'pawnshop','laundromat','bodega','deli','barbershop','pharmacy','clinic','shelter','mission','chapel',
      'courtyard','tenement','brownstone','walkup','loft','penthouse','basement','boiler','radiator','thermostat',
      'siren','horn','brakes','engine','idle','exhaust','tailpipe','taillight','headlight','highbeam',
      'checkpoint','border','threshold','doorway','gate','latch','deadbolt','chain','peephole',
      'mailbox','postcard','telegram','payphone','booth','receiver','dialtone','static','signal','dropout',
    ],
  },
  abstract: {
    gloss: (w) => `Abstract fuel — write through ${w}.`,
    words: [
      'entropy','symmetry','asymmetry','paradox','irony','satire','farce','tragedy','comedy','drama',
      'thesis','antithesis','synthesis','premise','conclusion','hypothesis','axiom','theorem','proof','doubt',
      'pattern','rhythm','cycle','loop','recursion','fractal','mosaic','collage','montage','juxtaposition',
      'contrast','harmony','tension','release','pressure','vacuum','void','abyss','summit','nadir',
      'origin','terminus','genesis','apocalypse','rebirth','renewal','decay','growth','stasis','flux',
      'memory','forgetting','amnesia','recall','echo','archive','ledger','record','receipt','evidence',
      'signal','noise','channel','bandwidth','latency','feedback','gain','loss','clip','saturate',
      'focus','blur','depth','surface','core','shell','mask','face','mirror','lens',
    ],
  },
  nature: {
    gloss: (w) => `Nature as metaphor — ${w}.`,
    words: [
      'river','delta','estuary','rapids','cascade','waterfall','creek','brook','spring','well',
      'mountain','ridge','cliff','bluff','canyon','gorge','ravine','valley','plateau','mesa',
      'forest','thicket','grove','clearing','canopy','understory','rootball','sapling','hollow','knot',
      'desert','dune','oasis','mirage','saltflat','badlands','mesa','butte','arroyo','wash',
      'ocean','tide','undertow','current','swell','whitecap','reef','shoal','harbor','cove',
      'storm','thunder','lightning','hail','sleet','frost','thaw','meltwater','icicle','glacier',
      'bloom','bud','blossom','wilt','ripen','harvest','sow','reap','fallow','fertile',
      'wolf','raven','owl','hawk','moth','cicada','cricket','coyote','fox','crow',
    ],
  },
  time: {
    gloss: (w) => `Time pressure — ${w} in the bar.`,
    words: [
      'instant','moment','minute','hour','epoch','era','age','aeon','century','decade',
      'yesterday','tomorrow','forever','never','always','seldom','often','rarely','suddenly','gradually',
      'deadline','countdown','overtime','intermission','interlude','interval','span','stretch','lapse','gap',
      'early','late','punctual','overdue','premature','belated','timely','untimely','seasonal','eternal',
      'chrono','clockwork','metronome','tempo','pace','rate','velocity','acceleration','inertia','momentum',
      'past','present','future','history','prophecy','omen','portent','harbinger','aftermath','prelude',
      'genesis','midpoint','climax','denouement','aftermath','legacy','inheritance','bequest','heirloom','antiquity',
      'vintage','retro','modern','futurist','archaic','obsolete','nascent','embryonic','mature','senescent',
    ],
  },
  voice: {
    gloss: (w) => `Voice color — speak with ${w}.`,
    words: [
      'baritone','tenor','alto','soprano','falsetto','growl','rasp','purr','bark','hiss',
      'drawl','clip','lisp','stutter','murmur','shout','bellow','whisper','mutter','mumble',
      'monotone','cadence','inflection','accent','dialect','patois','slang','jargon','argot','cant',
      'oratory','rhetoric','sermon','homily','tirade','rant','plea','prayer','curse','blessing',
      'confession','admission','denial','alibi','excuse','apology','boast','brag','humblebrag','flex',
      'punch','jab','hook','uppercut','feint','parry','riposte','salvo','barrage','volley',
      'lullaby','warcry','anthem','hymn','chant','mantra','slogan','catchphrase','tagline','motto',
      'silence','pause','beat','hold','rest','breath','inhale','exhale','sigh','gasp',
    ],
  },
  deep: {
    gloss: (w) => `Deep cut — ${w} earns its place.`,
    words: [
      'syzygy','petrichor','sonder','liminal','hiraeth','saudade','ubuntu','komorebi','wabi','sabi',
      'mono','aware','yugen','ikigai','hygge','lagom','duende','duende','fernweh','weltschmerz',
      'sehnsucht','torschlusspanik','schadenfreude','gestalt','zeitgeist','weltanschauung','doppelganger','poltergeist','phantasm','apparition',
      'chimera','phoenix','leviathan','behemoth','colossus','titan','golem','homunculus','automaton','simulacrum',
      'labyrinth','maze','minotaur','ariadne','icarus','orpheus','eurydice','persephone','hades','elysium',
      'nirvana','samsara','karma','dharma','moksha','atman','brahman','zen','koan','satori',
      'alchemy','elixir','panacea','pharmakon','catharsis','anagnorisis','peripeteia','hubris','nemesis','hamartia',
      'sublime','beautiful','grotesque','uncanny','abject','sacred','profane','numinous','mundane','quotidian',
    ],
  },
};

/** Extra single words to push past ~3600 unique for full-year coverage. */
const BULK = `
absinthe abyss accord ache acumen adagio adamant adobe adrift aegis aerial aether affinity aftermath
agile aisle alchemy alder alias alien align alkali allure alpha altar amber amble amen amnesia
amorphous ampere amulet anagram anarchy anatomy anchor andante android angelus angle anise annex
annulus anode anomaly antenna anthem antic anvil apex aphasia apogee apostle apparatus apricot apron
aquarium arc arcane archipelago archive arctic arena argon aroma arsenal artery artifact artisan ascent
ashen asphalt asteroid asylum atlas atom atrium attic auburn audit aurora automaton avalanche avatar
axiom axis azure babel badge baffle bait ballast bamboo bandit banjo banquet barb bark barnacle
baron barren basalt basin bastion batch beacon beaker beam beaver bedrock beguile beige bellwether
belvedere berth bevel bezel bicep bifurcate birch bistromath bitumen blackout blade blank blaze
bleak blight blink blizzard bloom blot blotch blueprint blur boardwalk bobbin bog boil bolt
bonfire booth borealis boulder boulevard bounce boundary bouquet bovine bow bowsprit brackish braid
bramble brandish brass bravura brawl brazen breach breadcrumb breeze briar brick brim brine
bristle brittle broadcast brochure bronze brood brook brow bruise bruit brush brute bubble
buckle buffer bulb bulge bulkhead bullet bulletin bump buoy burden bureau burgeon burnish burst
busker butcher buttress buzz bygone byline byre byway cabin cache cadence cadenza cage cairn
caldera calf caliber calligraphy calm camber cameo campus canal candela candle canopy canvas
canyon capacity cape capillary capsule carapace carbon carcass cardinal cargo carmine carnival
carousel cartilage cascade case cassette castle catalog catalyst catapult catchment cathedral cauldron
causal caution cavern cavity cedar ceiling celadon cellar cello cement census ceramic cereal
chalice chalk chamber chameleon channel chaos chapel charcoal charge chariot charm chart chase
chassis chasm chassis chassis chassis chassis chassis chassis chassis chassis chassis chassis chassis
chatoyant cheekbone chemistry cherub chess chicory chill chime chimney china chip chisel
chlorine chord chorus chrome chronicle chrysalis chum churn cipher circuit cistern citadel citrus
civic civil clam clamp clan clang clarion clasp clay cleanse cleat cleft clench cliff
climate climax clinch cloister clone cloth cloud clove clover club clutch coalesce coal
coast cobalt cobra cockle coda coil coin coke colander cold collage collar collate
collect college collide cologne colon colony color colossus column coma comb combat
comet comfort comma command compass complex compost compound compute concave concept concert
concrete condor conduit cone confess confetti conflict confluence confuse congress conical
conjure connect conquest console contour contract contrast control convert convex convoy cool
copper coral cord core cork cornice corona corpse corridor corrode cortex cosmic
cosmos costume cotton couch coulisse counsel count couple courier course court cove
covenant cover coyote cradle craft crag crane crater cravat crawl crayon craze
crease create credit creek crest crew crib cricket crimson crisp critic crochet
croft crone crop cross crow crowd crown crucible crude cruise crumb crush
crust crystal cube cue cull culture culvert cupola curb curl current curtain
curve cusp custom cut cyan cycle cyclone cylinder cypher cyst dab dagger
dale dam damp dance dapple dark dart dash data dawn daze dazzle
deal dearth debris debt decade decay deck declaim decorate decree deep default
defense defer deflect deform deft degree delay delete delta delve demand demur
den dense dent depth derby descend desert design desire desk destiny detach
detail detect deter develop device devil devise dew diagram dial diamond diary
dice dictate diesel diet differ diffuse dig digest digit dignity dilute dim
dime diminish dine diode dirt disable disagree disappear disaster disc discard discipline
disclose discord discount discover discrete discuss disease disguise dish disk dismiss disorder
dispatch disperse display dispose dispute disrupt dissolve distance distill distinct distort distract
distress distribute district ditch dive diverse divert divide divine dizzy dock doctrine
document dodge doge doge doge doge doge doge doge doge doge doge doge
dolt dome donor doom door dose dot double doubt dough dove down draft
drag drain drama drape draw dread dream dredge dress drift drill drink
drip drive drizzle drone drop drown drum dry dual duck duct due
duel dull dune dungeon dupe dusk dust duty dwell dye dynamic dynasty
eager eagle ear earth ease east ebb echo eclipse ecology edge edict
edit eel eerie effect egg ego eight eject elastic elbow elder elect
element elevate elf elite elixir elm else ember embrace emerge emery
emit emotion empire empty enamel enclose encore end endure energy engage
engine engrave enjoy enlarge enlist enrich enroll ensue enter entice entire
entry envelop envy epic epoch equal equator equip era erase erect
erode errand error erupt escape escrow essence estate etch eternal ether
ethic evacuate evade even event ever evidence evoke evolve ewe exact
exam exceed excel except excerpt excess exchange excite exclaim exclude excuse execute
exempt exercise exert exhaust exhibit exile exist exit exotic expand expect
expel expend expert expire explain explode exploit explore export expose express
extend extent exterior extinct extra extract extreme eye fable facade face
facet fact fade fail faint fair faith fake fall false fame family
fan fancy fang far fare farm fashion fast fate father fault favor
fawn fear feast feather feature federal fee feed feel feet fell fellow
felt female fence fend fern ferry fetal fetch fever few fiber fiction
field fiend fierce fiery fifth fight figure filament file fill film filter
filth final finance find fine finger finish fire firm first fiscal fish
fist fit five fix flag flame flank flare flash flat flaw flax
flea flee flesh flex flick flight fling flint flip flirt float flock
flood floor flora flour flow flower fluent fluid flush flute flux fly
foam focus fog foil fold folk follow fond font food fool foot
for force ford forearm forest forge forget fork form fort forth fortune
forum fossil foster foul found fountain four fowl fox fraction fracture fragile
fragment frame franchise frank fraud fray freak free freeze freight frenzy fresh
fret friction friend fright fringe frock frog front frost frown frozen fruit
fry fuel full fume fun function fund funeral fungus funnel funny fur
furnace fury fuse fusion fuss future fuzzy gadget gain galaxy gale gall
gallery gallon gamble game gamma gang gap garage garbage garden gargoyle garment
garnet garnish gate gather gauge gauze gave gavel gawk gaze gear gecko
gel gem gender gene general genesis genre gentle geography geology geometry germ
gesture get geyser ghost giant gift gild gill gilt ginger giraffe gird
girl give glacier glad glance gland glare glass glaze gleam glean glee
glen glide glimpse glint glitter gloat globe gloom glory gloss glove glow
glue glut gnash gnat gnaw gnome go goal goat goblin god gold
golf gone gong good goose gorge gospel gossip got gouge gourd gout
govern gown grab grace grade gradual graft grain gram grand granite grant
grape graph grasp grass grate grave gravel gravity gray graze grease great
greed green greet grey grid grief grill grim grime grin grind grip
grit groan grocery groin groom groove gross grotto ground group grove grow
growl growth grub grudge gruel gruff grunt guarantee guard guess guest guide
guild guile guilt guinea guitar gulf gull gum gun gurgle guru gust
gut gutter guy gym gypsum gyro habit hack hail hair half hall
halo halt ham hammer hand handle hang happen happy harbor hard hare
harm harp harsh harvest hash haste hat hatch hate haunt have hawk
hay hazard haze he head heal health heap hear heart heat heath
heave heaven heavy hedge heel height heist held helium helix hell
helm help hem hemisphere hen hence herb herd here hero herring hesitate
hex hibernate hiccup hide high highway hike hill hilt him hind hinge
hint hip hire history hit hive hoard hobby hockey hoist hold hole
holiday hollow holy home hone honest honey honor hood hoof hook hope
horizon horn horror horse hose host hot hotel hound hour house hover
how howl hub hue hug hull hum human humble humid humor hundred
hunger hunt hurdle hurl hurry hurt husband hush husk hut hybrid hydra
hydrogen hymn hypnosis hypothesis ice icon idea ideal identify idle idol
igloo ignite ignore iguana ill illegal image imagine imbue imitate immense
immune impact impair impart impede imperial implant imply import impose impress
imprint improve impulse in inch incident incline include income increase index
indicate indoor induce industry inert infant infect infer infinite inflame inflate
inflict influence inform infrared infringe infusion ingest inhale inherit initial inject
injure ink inland inlet inmate inn innervate input inquire insane insect insert
inside insight insist inspect inspire install instance instant instead instinct institute instruct
instrument insult insure intact integer integrate integrity intellect intend intense intent
inter intercept interest interior internal interpret interrupt interval intervene interview intestine
intimate into intrigue introduce invent inventory inverse invest investigate invite involve ion
iris iron irony island isle isotope issue itch item ivory jack jade
jaguar jail jam jar jargon jasmine jaw jazz jealous jeans jelly jerk
jet jewel jigsaw jingle job join joint joke jolt journal journey joy
judge juice jump jungle junior junk jury just juvenile kaleidoscope keen keep
keg kelp kernel kettle key kick kid kidney kill kiln kilo kin
kind king kingdom kiss kit kitchen kite kitten kiwi knee knife knight
knit knob knock knot know knowledge knuckle koala lab label labor lace
lack ladder laden ladle lady lag lake lamb lament lamp lance land
lane language lantern lap large lark laser lash last latch late
latex latitude laugh launch lava law lawn lawsuit lawyer lay layer
lazy lead leaf league leak lean leap learn lease least leather leave
lecture ledge lee leech left leg legal legend legible legion legislate
legitimate leisure lemon lend length lens leopard less lesson let letter
level lever levy lexicon liable liar liberty library license lick lid
lie life lift light like limb lime limit limp line linear linen
link lion lip liquid list listen lit literal litter little live liver
lizard load loaf loan lobby local lock locomotive lodge loft log
logic logo lone long look loop loose lord lose loss lost lot
lotion lottery loud lounge love low loyal lubricant lucid luck luggage
lull lumber luminous lump lunar lunch lung lure lush luxury lymph
lyric machine mad magazine magic magnet magnitude maid mail main major
make male mall mammal man manage mandate mane manganese mania manner
mansion mantle manual map maple mar marble march mare margin marine
mark market marriage marrow marry mars marsh marshal marsupial martial marvel
mask mass mast master match mate material math matter mature maximum
may maze me meadow meal mean meaning measure meat mechanic medal
media median medium meet melody melt member memo memory menace mend
mental mention menu mercury mercy merge merit mesh mess metal metaphor
method metric microscope middle midnight might migrant mild mile military milk
mill mime mind mine mineral mini minimum minister minor mint minus
minute miracle mirror mirth miscue miserable misery miss missile mission mist
mistake mix mixture moan moat mobile mock mode model modern modest
modify module moist mold mole molecule moment monarchy money monitor monk
monkey monsoon monster month monument mood moon moral more morning morph
morsel mortal mosaic mosque mosquito moss most motel moth mother motion
motive motor mountain mouse mouth move movie much mucus mud muffin
mule multiply municipal murder murmur muscle museum mushroom music must mute
mutual muzzle my myriad mystery myth nadir nail naive naked name
nanny nap narrate narrow nasal nation native natural nature nausea naval
navy near neat nebula necessary neck nectar need needle negate negative
neglect neither neon nephew nerve nest net network neural neutral never
new news next nice niche nick niece night nil nine nitrogen noble
nod noise nomad none noon nor norm normal north nose not note
nothing notice noun novel now nowhere nozzle nuclear nude nugget numb
number numeral numerous nurse nut nylon oar oasis oat oath obey
object oblige obscure observe obsess obsolete obtain obvious occasion occupy ocean
octave octagon October odd ode odor of off offend offer office
officer official often oil okay old olive omega omen omit on
once one onion only onto open opera operate opinion oppose opposite
optic option or oracle orange orbit orchard orchestra order organ organic
orient origin ornament orphan orthogonal oscillate osmosis other otter ought ounce
our out outdoor outer outfit outlet outline outlook output outrage outside
oval oven over overcome overdue overflow overhaul overhead overlook overnight override
overt overturn overwhelm owe own owner oxide oxygen oyster ozone pace
pack package pad paddle page paid pain paint pair palace pale
palm pan panel panic pant paper parade paradox paragraph parallel parcel
pardon parent park parliament parrot part particle particular party pass passage
passenger passion past pasta paste pasture pat patch path patient patriot
patrol pattern pause pave pavilion paw pay peace peach peak peanut
pear pearl peasant peat pebble peculiar pedal peddle peek peel peer
peg pelican pellet pen penalty pencil pendulum penguin peninsula people pepper
per perceive percent perfect perform perfume perhaps period perish perk permanent
permit perpendicular persist person personal persuade pest pet petal petition petroleum
petty phase pheasant phenomenon philosophy phoenix phone photo phrase physical physics
piano pick picnic picture pie piece pierce pig pigeon pile pill
pillar pillow pilot pimple pin pinch pine pink pint pioneer pipe
pistol piston pit pitch pity pivot pizza place placid plaid plain
plan plane planet plank plant plasma plaster plastic plate platform platinum
platter play plaza plea pleasant please pleasure pledge plenty plot plow
pluck plug plum plume plump plunder plunge plural plus ply plywood
pocket poem poet point poison poke polar pole police policy polish
polite politics poll pollen pond pony pool poor pop popcorn pope
popular porcelain porch porcupine pore pork port portal portion portrait pose
position positive possess possible post pot potato potent pottery pouch poultry
pound pour poverty powder power practice prairie praise prawn pray preach
precede precious precise predict prefer prefix pregnant prejudice preliminary premier
premise prepare prescribe presence present preserve preside press pressure prestige presume
pretend pretty prevent preview previous prey price prick pride priest primary
prime primitive prince princess principal principle print prior prism prison private
privilege prize probability probe problem procedure proceed process proclaim produce product
profession professor profile profit program progress prohibit project proliferate prolific prolong
promise promote prompt prone proof prop propaganda propel proper property prophet
proportion propose prose prospect protect protein protest proton proud prove proverb
provide province provision provoke prow proxy psychology public publish pudding puddle
puff pull pulp pulse pump punch punctual punish pupil puppet puppy
purchase pure purge purple purpose purr purse pursue push put puzzle
pyramid python quack quail quaint quality quantum quarrel quarry quarter quartz
queen query quest question queue quick quiet quill quilt quince quit
quite quiz quota quote rabbit raccoon race rack radar radial radiant
radiate radical radio radish radius raft rag rage raid rail rain
raise rake rally ram ramp ranch random range rank rapid rare
rascal rash rate rather ratio rattle raven raw ray razor reach
react read ready real realm reap rear reason rebel rebuild recall
receipt receive recent recipe recite reckon reclaim recognize recommend reconcile record
recover recruit rectangle red reduce reed reef refer refine reflect reform
refrain refresh refuge refund refuse refute regard regime region register regret
regular regulate reign rein reject rejoice relate relative relax release relevant
reliable relic relief religion relish rely remain remark remarkable remedy remember
remind remote remove render renew rent repair repeat replace replay reply
report represent repress reproduce reptile republic reputation request require rescue research
resemble reserve reservoir reset reside resign resin resist resolve resort resource
respect respond response rest restaurant restore restrain restrict result resume retail
retain retire retreat retrieve return reveal revenge revenue reverse review revise
revive revolt revolution reward rhyme rhythm rib ribbon rice rich rid
ride ridge ridiculous rifle right rigid rim ring rinse riot rip
ripe ripple rise risk ritual rival river road roam roar roast
rob robot robust rock rocket rod rogue role roll romance roof
room roost root rope rose rot rotate rough round route routine
row royal rub rubber rude rug ruin rule rumble rumor run
rune runner runway rupture rural rush rust rut saber sack sacred
sad saddle safari safe sag sage said sail saint sake salad
salary sale saline saliva salt salute same sample sand sandal sandstone
sane sang sapphire sarcasm satellite satin satire satisfaction satisfy sauce saucer
sausage savage save savor saw sax say scale scam scan scandal
scar scarce scare scarf scarlet scatter scene scent schedule scheme scholar
school science scissors scoff scold scoop scope scorch score scorn scorpion
scour scout scowl scramble scrap scrape scratch scream screen screw scribble
script scroll scrub sculpture sea seal seam search season seat second
secret section secure sediment see seed seek seem seep segment seize
select self sell semantic semicolon senate send senior sense sensitive sensor
sentence sentinel separate sequence serial series serious sermon serpent serum
serve service session set settle seven several severe sew sewer sex
shack shade shadow shaft shake shall shallow shame shape share shark
sharp shatter shave shawl she shear shed sheep sheer sheet shelf
shell shelter shepherd sherbet shield shift shimmer shin shine ship shirt
shiver shock shoe shoot shop shore short shot should shoulder shout
shove show shower shred shrewd shrimp shrine shrink shroud shrub shrug
shuffle shut shutter shy sibling sick side siege sieve sift sigh
sight sign signal silence silent silk silly silver similar simmer simple
simulate simultaneous sin since sincere sing single sink sip sir siren
sister sit site situate six size skate skeleton sketch ski skill
skin skip skirt skull sky slab slack slam slang slant slap
slash slate slave sleek sleep sleet slender slice slick slide slight
slim slime slip slit slogan slope slot slow sludge slug sluice
slum slumber slur slush sly smack small smart smash smear smell
smelt smile smirk smoke smooth smother smudge snack snail snake snap
snare snarl snatch sneak sneer sneeze sniff snip snob snoop snore
snorkel snort snow snub snuff snug soak soap soar sob sober
soccer social sock soda sofa soft software soil solar sold soldier
sole solid solvent solve some somehow someone something sometime somewhat somewhere
son song sonic soon soot soothe sophisticated sophomore sore sorrow sorry
sort soul sound soup sour source south souvenir sovereign sow space
spare spark sparrow sparse spasm spat spatial spawn speak spear special
species specific specimen speck spectrum speech speed spell spend sphere spice
spider spike spill spin spinach spine spiral spirit spit spite splash
spleen splendid splice splinter split spoil spoke sponge sponsor spontaneous spoon
sport spot spout spray spread spring sprinkle sprint sprout spruce spur
spurious spy squad square squash squat squeak squeeze squid squint squirrel
squirt stab stable stack stadium staff stag stage stagger stain stair
stake stale stalk stall stamp stand standard stanza staple star stare
start starve state static station statue status stay steady steak steal
steam steel steep steer stem step stereo stern stew stick stiff
still stimulate sting stink stint stir stitch stock stomach stone stool
stoop stop storage store storm story stout stove straight strain strait
strand strange stranger strap strategy straw stray streak stream street strength
stress stretch strict stride strife strike string strip stripe strive stroke
stroll strong structure struggle strut stub stuck student studio study stuff
stumble stump stun stunt stupid sturdy style sub subject sublime submarine
submit subsequent substance subtle subtract suburb succeed success such suck sudden
sue suffer sufficient sugar suggest suit suite sulfur sultan sum summarize
summer summit summon sun sundae Sunday sunny sunset sunshine super superb
superior supper supplement supply support suppose suppress supreme sure surface surge
surgeon surgery surname surplus surprise surround survey survive suspect suspend sustain
swallow swamp swan swap swarm sway swear sweat sweater sweep sweet
swell swift swim swing switch swivel sword syllable symbol sympathy symphony
symptom synagog sync syndrome synonym syntax synthesis synthetic system table tablet
tack tackle tactic tadpole tag tail tailor take talent talk tall
tame tan tangle tank tap tape target tariff task taste tattoo
taunt tavern tax tea teach team tear tease technical technique technology
tedious teen teeth telegraph telephone telescope television tell temper temperature temple
tempo temporary tempt ten tenant tend tender tense tension tent term
terminal terrace terrible territory terror test text textile texture than thank
that thaw the theater theft their them theme then theory there
thermal thermometer these thesis they thick thief thigh thin thing think
third thirsty this thorn thorough those though thought thousand thread threat
three threshold thrift thrill thrive throat throne throng through throw thrust
thumb thunder thus thyroid tiara tick ticket tide tidy tie tiger
tight tile till tilt timber time timid tin tinge tingle tint
tiny tip tire tissue title toad toast today toe together toil
token told tolerance tomato tomb tomorrow ton tone tongs tongue tonight
too tool tooth top topic torch tornado torque tortoise torture toss
total touch tough tour tourist toward towel tower town toxic toy
trace track trade tradition traffic tragedy trail train trait tramp trance
transfer transform transit translate transmit transparent transplant transport trap trash travel
tray treasure treat treaty tree trek tremble trench trend trial triangle
tribe tribute trick trigger trim trinity trip triple triumph trivia troop
trophy tropical trouble trough troupe trout truck true trumpet trunk trust
truth try tube tuck Tuesday tug tuition tulip tumble tumor tuna
tune tunnel turbine turf turkey turn turtle tusk tutor tuxedo twelve
twenty twice twin twine twist two type typhoon typical tyrant ubiquitous
ugly ulcer ultimate umbrella unable unacceptable unaware uncle uncover under undergo
underground underline understand undertake underwear undo undue unfair unfold unhappy
uniform union unique unit unite universe university unknown unless unlike unlikely
until unusual up update upgrade uphold upon upper upright upset upside
upstairs upward uranium urban urge urgent urine usable usage use useful
user usual usurp utensil utility vacant vacation vacuum vague vain valentine
valley valuable value valve vampire van vanilla vanish vanity vapor variable
variety various varnish vase vast vault veer vegetable vehicle veil vein
velocity velvet vendor veneer venom vent venture venue verb verbal verdict
verge verify verse version versus vertical very vessel vest veteran veto
via vial vibrate vice vicinity victim video view vigilant vigor village
vine vinegar vintage violate violence violet violin virus visa visible vision
visit visual vital vitamin vivid vocabulary vocal voice void volcano volume
voluntary volunteer vomit vote vow vowel voyage vulcan vulgar vulnerable vulture
wad wafer wage wagon wail waist wait wake walk wall wallet
walnut walrus waltz wander want war ward warehouse warm warn warp
warrant warrior wart wary wash wasp waste watch water watt wave
wax way weak wealth weapon wear weasel weather weave web wedding
wedge weed week weep weigh weight weird welcome weld well west
wet whale wharf what wheat wheel when where whether which while
whim whip whirl whisper whistle white who whole whom whose why
wick wide widow width wife wild will willow wilt win wind
window wine wing wink winter wipe wire wisdom wise wish wit
witch with withdraw wither within without witness wolf woman wonder wood
wool word work world worm worry worse worship worst worth would
wound wrap wrath wreath wreck wren wrench wrestle wrinkle wrist write
wrong wrought yacht yank yard yarn yawn year yearn yeast yell
yellow yelp yes yesterday yet yield yoke yolk you young your
youth zeal zebra zenith zero zest zigzag zinc zip zipper zone
zoo zoom
`.trim().split(/\s+/);

function slugify(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
}

function titleCase(word) {
  if (!word) return word;
  if (word.includes(' ')) {
    return word.split(' ').map(titleCase).join(' ');
  }
  // Keep known all-caps / special
  if (word === 'wabi' || word === 'sabi' || word === 'mono' || word === 'aware') {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Very light pronunciation hint for bulk words. */
function roughPron(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 4) return w.toUpperCase();
  // Insert mid break
  const mid = Math.ceil(w.length / 2);
  return `${w.slice(0, mid).toUpperCase()}-${w.slice(mid)}`;
}

function main() {
  /** @type {Map<string, { id: string; word: string; pron: string; gloss: string }>} */
  const map = new Map();

  // Premium curated first (keep existing hand-tuned where we re-add below)
  const premium = [
    ['caesura', 'sih-ZHUR-uh', 'A pause that shapes the line.'],
    ['cipher', 'SY-fer', 'A freestyle circle; bars in the round.'],
    ['nocturne', 'NOK-turn', 'Music made for the night.'],
    ['enjambment', 'en-JAM-ment', 'Meaning that runs past the break.'],
    ['leitmotif', 'LYT-moh-teef', 'A theme that keeps returning.'],
    ['prosody', 'PROSS-uh-dee', 'The music inside speech.'],
    ['timbre', 'TAM-ber', 'The color of a sound.'],
    ['anacrusis', 'an-uh-KROO-sis', 'The pickup before the downbeat.'],
    ['polyphony', 'puh-LIF-uh-nee', 'Many voices, one weave.'],
    ['strophe', 'STROH-fee', 'A turn of the verse.'],
    ['assonance', 'ASS-uh-nunss', 'Vowels echoing across words.'],
    ['syncopation', 'sing-kuh-PAY-shun', 'Stress where you least expect it.'],
    ['ostinato', 'os-tih-NAH-toh', 'A figure that refuses to leave.'],
    ['cadence', 'KAY-dunss', 'How a phrase comes to rest.'],
    ['sotto', 'SOT-toh', 'Spoken under the breath.'],
    ['rubato', 'roo-BAH-toh', 'Time bent for feel.'],
    ['motif', 'moh-TEEF', 'A small idea with gravity.'],
    ['refrain', 'rih-FRAYN', 'The line that comes back.'],
    ['volta', 'VOL-tuh', 'The turn that changes the poem.'],
    ['melisma', 'muh-LIZ-muh', 'One syllable stretched into song.'],
    ['counterpoint', 'KOWN-ter-point', 'Lines that argue in harmony.'],
    ['ephemera', 'ih-FEM-er-uh', 'What only lasts a night.'],
    ['sonder', 'SAHN-der', 'Realizing every stranger has a full life.'],
    ['liminal', 'LIM-in-ul', 'The doorway between states.'],
    ['vesper', 'VESS-per', 'Evening; a late prayer of sound.'],
    ['hushed', 'huhsht', 'Quiet on purpose.'],
    ['afterglow', 'AF-ter-gloh', 'Light that stays when the show ends.'],
    ['blueprint', 'BLOO-print', 'The plan under the paint.'],
    ['residue', 'REZ-ih-doo', 'What a session leaves behind.'],
    ['incipit', 'in-SIP-it', 'The first words of a work.'],
    ['coda', 'KOH-duh', 'The last turn after the end.'],
    ['tessitura', 'tess-ih-TOOR-uh', 'Where a voice lives most naturally.'],
    ['parlando', 'par-LAHN-doh', 'Sung as if spoken.'],
    ['aria', 'AH-ree-uh', 'A solo that claims the air.'],
    ['murmur', 'MUR-mer', 'Soft speech that still carries.'],
    ['glimmer', 'GLIM-er', 'A brief, low light.'],
    ['orbit', 'OR-bit', 'A path you keep returning on.'],
    ['inkwell', 'INK-well', 'Where the next line waits.'],
    ['margin', 'MAR-jin', 'The quiet space beside the text.'],
    ['echo', 'EK-oh', 'A sound that answers itself.'],
  ];

  for (const [id, pron, gloss] of premium) {
    map.set(id, { id, word: titleCase(id), pron, gloss });
  }

  for (const bank of Object.values(BANKS)) {
    for (const raw of bank.words) {
      const id = slugify(raw);
      if (!id || id.length < 3 || map.has(id)) continue;
      // Skip obvious junk / duplicates from typos in banks
      if (['clause', 'pocket'].includes(id) && map.has(id)) continue;
      map.set(id, {
        id,
        word: titleCase(raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/hour$/, ' hour').trim() || raw),
        pron: roughPron(raw),
        gloss: bank.gloss(titleCase(raw)),
      });
    }
  }

  // Fix a few compound display names
  const displayFixes = {
    witchinghour: 'Witching Hour',
    latenight: 'Late Night',
    afterhours: 'After Hours',
    lastcall: 'Last Call',
    closingtime: 'Closing Time',
    lasttrain: 'Last Train',
    fireescape: 'Fire Escape',
    looseend: 'Loose End',
    blankverse: 'Blank Verse',
    freeverse: 'Free Verse',
  };
  for (const [id, word] of Object.entries(displayFixes)) {
    const e = map.get(id);
    if (e) e.word = word;
  }

  const STOP = new Set([
    'the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','day','get','has','him',
    'his','how','man','new','now','old','see','two','way','who','boy','did','its','let','put','say','she','too','use',
    'dad','mom','god','dog','cat','yes','yet','ago','own','off','why','any','few','lot','may','per','via','etc',
    'doge','clause','chassis','that','this','with','from','they','have','been','were','said','each','which','their',
    'will','other','about','many','then','them','these','some','would','make','like','into','time','there','could',
    'than','first','water','been','call','who','oil','sit','set','run','hot','try','ask','hand','port','large',
    'land','here','must','high','such','follow','act','why','ask','men','change','went','light','kind','need',
    'house','picture','again','animal','point','mother','world','near','build','self','earth','father','head',
    'stand','page','should','country','found','answer','school','grow','study','still','learn','plant','cover',
    'food','sun','four','between','state','keep','eye','never','last','tree','city','tree','cross','since',
    'hard','start','might','story','saw','far','sea','draw','left','late','run','while','press','close','night',
    'real','life','few','those','both','book','carry','took','science','eat','room','friend','began','idea',
    'fish','mountain','stop','once','base','hear','horse','cut','sure','watch','color','face','wood','main',
  ]);

  for (const raw of BULK) {
    const id = slugify(raw);
    if (!id || id.length < 5 || id.length > 12) continue;
    if (STOP.has(id)) continue;
    if (map.has(id)) continue;
    if (/^\d/.test(id)) continue;
    // Skip very common short stems
    if (/^(un|re|in|de|pre|over|under)/.test(id) && id.length < 7) continue;
    map.set(id, {
      id,
      word: titleCase(raw),
      pron: roughPron(raw),
      gloss: `Skyline lexicon — write with ${titleCase(raw)}.`,
    });
  }

  const entries = [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  console.log('corpus size', entries.length);

  const outPath = join(__dirname, '..', 'src', 'lib', 'scene', 'scene-neon-lexicon-corpus.ts');
  const body = entries
    .map(
      (e) =>
        `  { id: ${JSON.stringify(e.id)}, word: ${JSON.stringify(e.word)}, pron: ${JSON.stringify(e.pron)}, gloss: ${JSON.stringify(e.gloss)} },`
    )
    .join('\n');

  const file = `/** Auto-generated by scripts/generate-scene-neon-corpus.mjs — do not edit by hand. */

export const SCENE_NEON_CORPUS = [
${body}
] as const;
`;

  writeFileSync(outPath, file, 'utf8');
  console.log('wrote', outPath);
}

main();
