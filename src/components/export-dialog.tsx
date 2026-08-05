
'use client';

import React, { useRef, useTransition, useState } from 'react';
import Link from 'next/link';
import type { Album, Track } from '@/lib/types';
import jsPDF from 'jspdf';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Loader, FileJson, Lock } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album: Album;
  tracks: Track[];
  exportType?: 'album' | 'track';
  /** When false, preview only — downloads locked behind Pro upgrade. */
  allowDownload?: boolean;
}

interface ExportOptions {
  includeTrackNumbers: boolean;
  includeTrackTitles: boolean;
  includeSectionHeaders: boolean;
}

/** Shared typography for preview + PDF (PDF uses pt via jsPDF). */
const PDF_PREVIEW_STYLES = `
  #pdf-preview-content {
    font-family: 'Helvetica', 'Arial', sans-serif;
    background-color: white;
    width: 100%;
    box-sizing: border-box;
  }
  #pdf-preview-content h1, #pdf-preview-content h2, #pdf-preview-content h3 {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-weight: 700;
    color: black;
  }
  #pdf-preview-content h1 { font-size: 26px; margin-bottom: 0.35em; }
  #pdf-preview-content h2 { font-size: 20px; margin-top: 1.75em; margin-bottom: 0.35em; }
  #pdf-preview-content h3 {
    font-size: 15px;
    font-weight: bold;
    font-style: italic;
    margin-top: 1.1em;
    margin-bottom: 0.35em;
  }
  #pdf-preview-content p {
    font-size: 14px;
    margin: 0;
    line-height: 1.55;
    color: black;
    padding: 1px 0;
  }
  #pdf-preview-content hr { margin: 1.75em 0; border-color: #ccc; }
  #pdf-preview-content .lead { font-size: 14px; color: #333; margin-bottom: 0.5em; }
`;

const PDF_LAYOUT = {
  marginX: 16,
  marginTop: 18,
  marginBottom: 16,
  pageWidth: 210,
  pageHeight: 297,
  bodySize: 14,
  bodyLeading: 6.2,
  h1Size: 22,
  h2Size: 17,
  h3Size: 14,
  titleGap: 8,
  sectionGap: 5,
  trackGap: 10,
} as const;

type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

function generateLyricsPdf(
  album: Album,
  tracks: Track[],
  options: ExportOptions,
  exportType: 'album' | 'track'
): jsPDF {
  const isSingleTrack = exportType === 'track';
  const pdf = new jsPDF('p', 'mm', 'a4');
  const maxWidth = PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginX * 2;
  let y = PDF_LAYOUT.marginTop;

  const setStyle = (size: number, style: PdfFontStyle = 'normal') => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', style);
  };

  const newPage = () => {
    pdf.addPage();
    y = PDF_LAYOUT.marginTop;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom) {
      newPage();
    }
  };

  const addBlock = (
    text: string,
    size: number,
    style: PdfFontStyle,
    leading: number,
    gapBefore = 0
  ) => {
    if (gapBefore > 0) {
      ensureSpace(gapBefore);
      y += gapBefore;
    }
    setStyle(size, style);
    const lines: string[] = pdf.splitTextToSize(text || ' ', maxWidth);
    for (const line of lines) {
      ensureSpace(leading);
      pdf.text(line, PDF_LAYOUT.marginX, y);
      y += leading;
    }
  };

  const addLine = (text: string) => {
    addBlock(text, PDF_LAYOUT.bodySize, 'normal', PDF_LAYOUT.bodyLeading);
  };

  if (!isSingleTrack) {
    addBlock(album.title, PDF_LAYOUT.h1Size, 'bold', PDF_LAYOUT.titleGap);
    if (album.theme?.trim()) {
      addBlock(album.theme.trim(), PDF_LAYOUT.bodySize, 'normal', PDF_LAYOUT.bodyLeading, 2);
    }
    addBlock('', PDF_LAYOUT.bodySize, 'normal', PDF_LAYOUT.sectionGap, 4);
  }

  tracks.forEach((track, trackIndex) => {
    if (options.includeTrackTitles) {
      const titlePrefix =
        options.includeTrackNumbers && !isSingleTrack ? `${trackIndex + 1}. ` : '';
      addBlock(
        `${titlePrefix}${track.title}`,
        PDF_LAYOUT.h2Size,
        'bold',
        PDF_LAYOUT.titleGap,
        trackIndex > 0 || !isSingleTrack ? PDF_LAYOUT.trackGap : 0
      );
    }

    track.sections?.forEach((section) => {
      if (options.includeSectionHeaders) {
        addBlock(
          `[${section.type}]`,
          PDF_LAYOUT.h3Size,
          'bolditalic',
          PDF_LAYOUT.sectionGap,
          PDF_LAYOUT.sectionGap
        );
      }
      section.bars?.forEach((bar) => {
        addLine(bar.text?.trim() ? bar.text : '\u00a0');
      });
    });

    if (!isSingleTrack && trackIndex < tracks.length - 1) {
      ensureSpace(PDF_LAYOUT.trackGap);
      y += PDF_LAYOUT.trackGap;
    }
  });

  return pdf;
}

function formatLyricsForTxt(album: Album, tracks: Track[], options: ExportOptions, exportType: 'album' | 'track') {
  const isSingleTrack = exportType === 'track';
  let output = '';

  if (!isSingleTrack) {
    output += `${album.title}\n`;
    output += `${album.theme}\n`;
    output += '====================\n\n';
  }

  if (Array.isArray(tracks)) {
    tracks.forEach((track, trackIndex) => {
        if (options.includeTrackTitles) {
            output += `${options.includeTrackNumbers && !isSingleTrack ? `${trackIndex + 1}. ` : ''}${track.title}\n\n`;
        }
        if (Array.isArray(track.sections)) {
            track.sections.forEach(section => {
            if (options.includeSectionHeaders) {
                output += `[${section.type}]\n`;
            }
            if (Array.isArray(section.bars)) {
                section.bars.forEach(bar => {
                    output += `${bar.text}\n`;
                });
            }
            output += '\n';
            });
        }
        if (!isSingleTrack) {
            output += '--------------------\n\n';
        }
    });
  }

  return output;
}

export function ExportDialog({
  open,
  onOpenChange,
  album,
  tracks,
  exportType = 'album',
  allowDownload = true,
}: ExportDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
      includeTrackNumbers: true,
      includeTrackTitles: true,
      includeSectionHeaders: true,
  });

  const handleOptionChange = (option: keyof ExportOptions, value: boolean) => {
    setExportOptions(prev => ({...prev, [option]: value}));
  }

  const handleLockedDownload = () => {
    onOpenChange(false);
  };

  const handleDownloadPdf = () => {
    if (!allowDownload) {
      handleLockedDownload();
      return;
    }
    startTransition(async () => {
      const pdf = generateLyricsPdf(album, tracks, exportOptions, exportType);
      const baseName = (exportType === 'album' ? album.title : (tracks?.[0]?.title || 'export')).replace(/\s+/g, '_');
      pdf.save(`${baseName}_lyrics.pdf`);
    });
  };

  const handleDownloadTxt = () => {
    if (!allowDownload) {
      handleLockedDownload();
      return;
    }
     startTransition(() => {
        const textContent = formatLyricsForTxt(album, tracks, exportOptions, exportType);
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(exportType === 'album' ? album.title : (tracks?.[0]?.title || 'export')).replace(/\s+/g, '_')}_lyrics.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
     });
  };

  const handleDownloadJson = () => {
    if (!allowDownload) {
      handleLockedDownload();
      return;
    }
    startTransition(() => {
        const dataToExport = exportType === 'album' ? album : tracks[0];
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(exportType === 'album' ? album.title : (tracks?.[0]?.title || 'export')).replace(/\s+/g, '_')}_bar4bar.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {allowDownload
              ? exportType === 'album'
                ? `Export Album: "${album.title}"`
                : `Export Track: "${tracks?.[0]?.title}"`
              : `Preview Export: "${tracks?.[0]?.title || album.title}"`}
          </DialogTitle>
          <DialogDescription>
            {allowDownload
              ? 'Choose your preferred format. Use `.json` for a re-importable backup.'
              : 'Preview your export layout. Downloads unlock with Studio Pro — your lyrics stay saved in the demo vault.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-4 pb-4 border-b">
            <h4 className="text-sm font-medium">Include:</h4>
            {exportType === 'album' && <div className="flex items-center space-x-2"><Checkbox id="in" checked={exportOptions.includeTrackNumbers} onCheckedChange={(c) => handleOptionChange('includeTrackNumbers', !!c)} /><Label htmlFor="in">Numbers</Label></div>}
            <div className="flex items-center space-x-2"><Checkbox id="it" checked={exportOptions.includeTrackTitles} onCheckedChange={(c) => handleOptionChange('includeTrackTitles', !!c)} /><Label htmlFor="it">Titles</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="ish" checked={exportOptions.includeSectionHeaders} onCheckedChange={(c) => handleOptionChange('includeSectionHeaders', !!c)} /><Label htmlFor="ish">Sections</Label></div>
        </div>
        <div className="flex-grow min-h-0 bg-gray-300 p-4 relative">
          {!allowDownload && (
            <div
              className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-md"
              aria-hidden
            >
              <span className="rotate-[-24deg] text-4xl font-black uppercase tracking-widest text-black/10 select-none">
                Pro Preview
              </span>
            </div>
          )}
          <ScrollArea className="h-full rounded-md border bg-white shadow-lg">
            <div ref={previewRef} style={{ width: '210mm', minHeight: '297mm' }}>
              <div id="pdf-preview-content" className="prose prose-sm max-w-none bg-white text-black px-8 py-10 font-sans">
                <style>{PDF_PREVIEW_STYLES}</style>
                {exportType === 'album' && (
                  <>
                    <h1>{album.title}</h1>
                    <p className="lead">{album.theme}</p>
                    <hr />
                  </>
                )}
                {Array.isArray(tracks) && tracks.map((track, trackIndex) => (
                  <React.Fragment key={track.id}>
                    {exportOptions.includeTrackTitles && <h2>{exportOptions.includeTrackNumbers && exportType === 'album' && `${trackIndex + 1}. `}{track.title}</h2>}
                    {Array.isArray(track.sections) && track.sections.map(section => (
                      <div key={section.id}>
                        {exportOptions.includeSectionHeaders && <h3 className="capitalize font-bold italic mt-4 mb-2">[{section.type}]</h3>}
                        {Array.isArray(section.bars) && section.bars.map(bar => (
                          <p key={bar.idx} className="m-0">{bar.text || ' '}</p>
                        ))}
                      </div>
                    ))}
                    {exportType === 'album' && trackIndex < tracks.length -1 && <hr className="my-6" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {allowDownload ? (
            <>
              <Button variant="outline" onClick={handleDownloadJson} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <FileJson className="mr-2" />} JSON</Button>
              <Button variant="outline" onClick={handleDownloadTxt} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <FileText className="mr-2" />} TXT</Button>
              <Button onClick={handleDownloadPdf} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <Download className="mr-2" />} PDF</Button>
            </>
          ) : (
            <Button asChild className="w-full sm:w-auto font-bold uppercase text-[10px] tracking-widest">
              <Link href="/usage?tab=cloud" onClick={() => onOpenChange(false)}>
                <Lock className="mr-2 h-4 w-4" />
                Export this track — Go Pro
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

