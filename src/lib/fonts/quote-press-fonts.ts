import {
  Abril_Fatface,
  Anton,
  Architects_Daughter,
  Bangers,
  Bebas_Neue,
  Bungee,
  Caveat,
  Cinzel,
  Comfortaa,
  DM_Serif_Display,
  Fjalla_One,
  Kanit,
  Libre_Baskerville,
  Lora,
  Merriweather,
  Montserrat,
  Oswald,
  Outfit,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Raleway,
  Righteous,
  Rubik,
  Satisfy,
  Shadows_Into_Light,
  Space_Grotesk,
  Syne,
  Teko,
} from 'next/font/google';
import { ibmPlexMono, inter, robotoSlab } from '@/lib/fonts/site-fonts';
import { QUOTE_PRESS_FONTS } from '@/lib/profile/quote-press';

const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', preload: false });
const oswald = Oswald({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const permanentMarker = Permanent_Marker({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const architectsDaughter = Architects_Daughter({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const syne = Syne({ subsets: ['latin'], weight: ['400', '700', '800'], display: 'swap', preload: false });
const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', preload: false });
const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', preload: false });
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const bungee = Bungee({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const rubik = Rubik({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const fjallaOne = Fjalla_One({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', preload: false });
const kanit = Kanit({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const righteous = Righteous({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', preload: false });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const pacifico = Pacifico({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const teko = Teko({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const raleway = Raleway({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const abrilFatface = Abril_Fatface({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const shadowsIntoLight = Shadows_Into_Light({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const bangers = Bangers({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });
const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', preload: false });
const satisfy = Satisfy({ subsets: ['latin'], weight: '400', display: 'swap', preload: false });

/** Keys stay the Quote Press family strings. Values are the self-hosted next/font stacks. */
const LOCAL_QUOTE_PRESS_FAMILIES: Record<string, string> = {
  '"Bebas Neue", sans-serif': bebasNeue.style.fontFamily,
  '"Playfair Display", serif': playfair.style.fontFamily,
  '"Oswald", sans-serif': oswald.style.fontFamily,
  '"Space Grotesk", sans-serif': spaceGrotesk.style.fontFamily,
  '"DM Serif Display", serif': dmSerif.style.fontFamily,
  '"Permanent Marker", cursive': permanentMarker.style.fontFamily,
  '"Roboto Slab", serif': robotoSlab.style.fontFamily,
  '"IBM Plex Mono", monospace': ibmPlexMono.style.fontFamily,
  '"Inter", sans-serif': inter.style.fontFamily,
  '"Architects Daughter", cursive': architectsDaughter.style.fontFamily,
  '"Syne", sans-serif': syne.style.fontFamily,
  '"Libre Baskerville", serif': libreBaskerville.style.fontFamily,
  '"Anton", sans-serif': anton.style.fontFamily,
  '"Caveat", cursive': caveat.style.fontFamily,
  '"Outfit", sans-serif': outfit.style.fontFamily,
  '"Bungee", cursive': bungee.style.fontFamily,
  '"Rubik", sans-serif': rubik.style.fontFamily,
  '"Fjalla One", sans-serif': fjallaOne.style.fontFamily,
  '"Merriweather", serif': merriweather.style.fontFamily,
  '"Kanit", sans-serif': kanit.style.fontFamily,
  '"Righteous", cursive': righteous.style.fontFamily,
  '"Lora", serif': lora.style.fontFamily,
  '"Montserrat", sans-serif': montserrat.style.fontFamily,
  '"Pacifico", cursive': pacifico.style.fontFamily,
  '"Teko", sans-serif': teko.style.fontFamily,
  '"Raleway", sans-serif': raleway.style.fontFamily,
  '"Abril Fatface", serif': abrilFatface.style.fontFamily,
  '"Shadows Into Light", cursive': shadowsIntoLight.style.fontFamily,
  '"Bangers", cursive': bangers.style.fontFamily,
  '"Comfortaa", sans-serif': comfortaa.style.fontFamily,
  '"Cinzel", serif': cinzel.style.fontFamily,
  '"Satisfy", cursive': satisfy.style.fontFamily,
};

const missingQuotePressFamilies = QUOTE_PRESS_FONTS.filter((family) => !LOCAL_QUOTE_PRESS_FAMILIES[family]);
if (missingQuotePressFamilies.length > 0) {
  throw new Error(`Imprint fonts are not self-hosted: ${missingQuotePressFamilies.join(', ')}`);
}
export function localQuotePressFontFamily(family: string): string {
  return LOCAL_QUOTE_PRESS_FAMILIES[family] ?? family;
}

/** Referenced by the loader so Next keeps every Imprint @font-face. */
export const quotePressFontCss = QUOTE_PRESS_FONTS.map((family) => LOCAL_QUOTE_PRESS_FAMILIES[family] ?? '').join('|');
