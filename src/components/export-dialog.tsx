
'use client';

import React, { useRef, useTransition, useState } from 'react';
import type { Album, Track } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
import { Download, FileText, Loader, FileJson } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album: Album;
  tracks: Track[]; 
  exportType?: 'album' | 'track';
}

interface ExportOptions {
    includeTrackNumbers: boolean;
    includeTrackTitles: boolean;
    includeSectionHeaders: boolean;
}

function formatLyricsForPreview(album: Album, tracks: Track[], options: ExportOptions, exportType: 'album' | 'track') {
  const isSingleTrack = exportType === 'track';
  return (
    <div id="pdf-preview-content" className="prose prose-sm max-w-none bg-white text-black p-8 font-sans">
       <style>{`
        #pdf-preview-content {
            font-family: 'Helvetica', 'Arial', sans-serif;
            background-color: white;
        }
        #pdf-preview-content h1, #pdf-preview-content h2, #pdf-preview-content h3 {
             font-family: 'Helvetica', 'Arial', sans-serif;
             font-weight: 700;
             color: black;
        }
        #pdf-preview-content h1 { font-size: 24px; }
        #pdf-preview-content h2 { font-size: 18px; margin-top: 2em; }
        #pdf-preview-content h3 { font-size: 14px; font-weight: bold; font-style: italic; margin-top: 1em; margin-bottom: 0.5em; }
        #pdf-preview-content p { font-size: 12px; margin: 0; line-height: 1.5; color: black; }
        #pdf-preview-content hr { margin: 2em 0; }
      `}</style>
      {!isSingleTrack && (
        <>
          <h1>{album.title}</h1>
          <p className="lead">{album.theme}</p>
          <hr />
        </>
      )}
      {Array.isArray(tracks) && tracks.map((track, trackIndex) => (
        <React.Fragment key={track.id}>
          {options.includeTrackTitles && <h2>{options.includeTrackNumbers && !isSingleTrack && `${trackIndex + 1}. `}{track.title}</h2>}
          {Array.isArray(track.sections) && track.sections.map(section => (
            <div key={section.id}>
              {options.includeSectionHeaders && <h3 className="capitalize font-bold italic mt-4 mb-2">[{section.type}]</h3>}
              {Array.isArray(section.bars) && section.bars.map(bar => (
                <p key={bar.idx} className="m-0">{bar.text || ' '}</p>
              ))}
            </div>
          ))}
          {!isSingleTrack && trackIndex < tracks.length -1 && <hr className="my-6" />}
        </React.Fragment>
      ))}
    </div>
  );
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

export function ExportDialog({ open, onOpenChange, album, tracks, exportType = 'album' }: ExportDialogProps) {
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

  const handleDownloadPdf = () => {
    startTransition(async () => {
        const input = previewRef.current;
        if (!input) return;
        const originalBackgroundColor = input.style.backgroundColor;
        input.style.backgroundColor = 'white';
        const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff', windowWidth: input.scrollWidth, windowHeight: input.scrollHeight, useCORS: true });
        input.style.backgroundColor = originalBackgroundColor;
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
        while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST'); heightLeft -= pageHeight; }
        pdf.save(`${(exportType === 'album' ? album.title : (tracks?.[0]?.title || 'export')).replace(/\s+/g, '_')}_lyrics.pdf`);
    });
  };

  const handleDownloadTxt = () => {
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
        <DialogHeader><DialogTitle className="font-headline">{exportType === 'album' ? `Export Album: "${album.title}"` : `Export Track: "${tracks?.[0]?.title}"`}</DialogTitle><DialogDescription>Choose your preferred format. Use `.json` for a re-importable backup.</DialogDescription></DialogHeader>
        <div className="flex items-center space-x-4 pb-4 border-b">
            <h4 className="text-sm font-medium">Include:</h4>
            {exportType === 'album' && <div className="flex items-center space-x-2"><Checkbox id="in" checked={exportOptions.includeTrackNumbers} onCheckedChange={(c) => handleOptionChange('includeTrackNumbers', !!c)} /><Label htmlFor="in">Numbers</Label></div>}
            <div className="flex items-center space-x-2"><Checkbox id="it" checked={exportOptions.includeTrackTitles} onCheckedChange={(c) => handleOptionChange('includeTrackTitles', !!c)} /><Label htmlFor="it">Titles</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="ish" checked={exportOptions.includeSectionHeaders} onCheckedChange={(c) => handleOptionChange('includeSectionHeaders', !!c)} /><Label htmlFor="ish">Sections</Label></div>
        </div>
        <div className="flex-grow min-h-0 bg-gray-300 p-4">
          <ScrollArea className="h-full rounded-md border bg-white shadow-lg">
            <div ref={previewRef} style={{ width: '210mm' }}>
              <div id="pdf-preview-content" className="prose prose-sm max-w-none bg-white text-black p-8 font-sans">
                <style>{`
                  #pdf-preview-content { font-family: 'Helvetica', 'Arial', sans-serif; background-color: white; }
                  #pdf-preview-content h1, #pdf-preview-content h2, #pdf-preview-content h3 { font-family: 'Helvetica', 'Arial', sans-serif; font-weight: 700; color: black; }
                  #pdf-preview-content h1 { font-size: 24px; }
                  #pdf-preview-content h2 { font-size: 18px; margin-top: 2em; }
                  #pdf-preview-content h3 { font-size: 14px; font-weight: bold; font-style: italic; margin-top: 1em; margin-bottom: 0.5em; }
                  #pdf-preview-content p { font-size: 12px; margin: 0; line-height: 1.5; color: black; }
                  #pdf-preview-content hr { margin: 2em 0; }
                `}</style>
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
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownloadJson} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <FileJson className="mr-2" />} JSON</Button>
          <Button variant="outline" onClick={handleDownloadTxt} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <FileText className="mr-2" />} TXT</Button>
          <Button onClick={handleDownloadPdf} disabled={isPending}>{isPending ? <Loader className="animate-spin mr-2"/> : <Download className="mr-2" />} PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

