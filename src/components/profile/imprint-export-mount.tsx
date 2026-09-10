'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { ensureImprintKeyframesInjected } from '@/lib/profile/imprint-keyframes';
import type { QuotePressConfig } from '@/lib/profile/quote-press';

export const IMPRINT_EXPORT_MOUNT_WIDTH_PX = 576;

export type ImprintExportMountParams = {
  text: string;
  config?: QuotePressConfig | null;
  creatorSlug?: string;
};

export type ImprintExportSession = {
  host: HTMLDivElement;
  root: Root;
  card: HTMLElement;
  motionRoot: HTMLElement;
};

async function waitForRenderedCard(motionRoot: HTMLElement): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const card = motionRoot.querySelector<HTMLElement>('[data-imprint-card]');
    if (card) {
      const rect = card.getBoundingClientRect();
      if (rect.width >= 48 && rect.height >= 48) return card;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Imprint card did not render for export.');
}

function ExportImprintTree({
  params,
  onReady,
  onError,
}: {
  params: ImprintExportMountParams;
  onReady: (card: HTMLElement, motionRoot: HTMLElement) => void;
  onError: (error: Error) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
  }, [params.text, params.config, params.creatorSlug]);

  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    const report = async () => {
      const motionRoot = rootRef.current;
      if (!motionRoot || reportedRef.current) return;

      try {
        motionRoot.setAttribute('data-imprint-motion', 'live');
        await document.fonts.ready;
        const card = await waitForRenderedCard(motionRoot);
        if (cancelled) return;

        card.style.overflow = 'visible';
        card.style.maxHeight = 'none';
        card.style.height = 'auto';

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
        await new Promise((r) => setTimeout(r, 180));

        if (cancelled) return;
        reportedRef.current = true;
        onReadyRef.current(card, motionRoot);
      } catch (err) {
        onErrorRef.current(err instanceof Error ? err : new Error('Imprint export mount failed.'));
      }
    };

    void report();
    return () => {
      cancelled = true;
    };
  }, [params.text, params.config, params.creatorSlug]);

  return (
    <QuotePressCard
      ref={rootRef}
      text={params.text}
      config={params.config}
      creatorSlug={params.creatorSlug}
      withMentions
    />
  );
}

export async function mountImprintForExport(
  params: ImprintExportMountParams
): Promise<ImprintExportSession> {
  ensureImprintKeyframesInjected();
  await document.fonts.ready;

  const host = document.createElement('div');
  host.setAttribute('data-imprint-export-mount', 'true');
  // Same off-screen capture host pattern as foil cards — must stay visible to rasterize.
  host.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    `width:${IMPRINT_EXPORT_MOUNT_WIDTH_PX}px`,
    'max-width:none',
    'padding:0',
    'margin:0',
    'box-sizing:border-box',
    'pointer-events:none',
    'z-index:2147483646',
    'opacity:1',
    'overflow:visible',
  ].join(';');
  document.body.appendChild(host);

  const root = createRoot(host);

  return await new Promise<ImprintExportSession>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Imprint export mount timed out.'));
    }, 15_000);

    root.render(
      <ExportImprintTree
        params={params}
        onReady={(card, motionRoot) => {
          window.clearTimeout(timeout);
          resolve({ host, root, card, motionRoot });
        }}
        onError={(error) => {
          window.clearTimeout(timeout);
          root.unmount();
          host.remove();
          reject(error);
        }}
      />
    );
  });
}

export function unmountImprintExport(session: ImprintExportSession) {
  session.root.unmount();
  session.host.remove();
}
