import { IBM_Plex_Mono, Inter, Noto_Color_Emoji, Roboto_Slab } from 'next/font/google';

/** Self-hosted. The browser does not call fonts.googleapis.com. */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-roboto-slab',
  preload: false,
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const notoColorEmoji = Noto_Color_Emoji({
  subsets: ['emoji'],
  weight: '400',
  display: 'swap',
  variable: '--font-noto-emoji',
  preload: false,
});

export const siteFontVariables = [
  inter.variable,
  robotoSlab.variable,
  ibmPlexMono.variable,
  notoColorEmoji.variable,
].join(' ');
