'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { NotebookText, Trash2, Wand2, ChevronsUpDown, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CreativeTool } from '@/ai/flows/creative-effects';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { studioAccentPanel, studioPanelCaption } from '@/lib/studio-panel-styles';

const TEXT_STORAGE_KEY = 'bar4bar-scratchpad-text';
const EFFECTS_STORAGE_KEY = 'bar4bar-scratchpad-effects';

export interface ScratchPadEffectResult {
  tool: CreativeTool;
  inputs: any;
  outputs: string[];
}

interface ScratchPadProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ScratchPad = forwardRef<{ addEffectResult: (result: ScratchPadEffectResult) => void }, ScratchPadProps>(({ isOpen: controlledOpen, onOpenChange }, ref) => {
  const [text, setText] = useState('');
  const [effectResults, setEffectResults] = useState<ScratchPadEffectResult[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    try {
      const savedText = localStorage.getItem(TEXT_STORAGE_KEY);
      if (savedText) setText(savedText);
      const savedEffects = localStorage.getItem(EFFECTS_STORAGE_KEY);
      if (savedEffects) setEffectResults(JSON.parse(savedEffects));
    } catch (error) {
      console.warn('Could not access localStorage for scratch pad.');
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setText(newContent);
    try {
      localStorage.setItem(TEXT_STORAGE_KEY, newContent);
    } catch (error) {
      console.warn('Could not access localStorage for scratch pad.');
    }
  };

  const addEffectResult = (result: ScratchPadEffectResult) => {
    setEffectResults(prev => {
      const newResults = [result, ...prev].slice(0, 20);
      try {
        localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(newResults));
      } catch (error) {
        console.warn('Could not save effect results to localStorage.');
      }
      return newResults;
    });
  };

  useImperativeHandle(ref, () => ({ addEffectResult }));
  
  const handleDeleteEffect = (indexToDelete: number) => {
    setEffectResults(prev => {
      const newResults = prev.filter((_, index) => index !== indexToDelete);
       try {
        localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(newResults));
      } catch (error) {
        console.warn('Could not save effect results to localStorage.');
      }
      return newResults;
    })
  };
  
  const handleClearAllEffects = () => {
    setEffectResults([]);
    try {
        localStorage.removeItem(EFFECTS_STORAGE_KEY);
    } catch (error) {
        console.warn('Could not clear effect results from localStorage.');
    }
  };

  const formatInputs = (inputs: any): string => {
    return Object.entries(inputs)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
  };

  const handleCopyLine = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: 'Copied to clipboard' });
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-studio-panel className={studioAccentPanel('muted')}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 md:p-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col text-left min-w-0 pr-1">
                    <CardTitle className="font-headline text-lg flex items-center gap-2 uppercase tracking-widest text-foreground/90">
                      <NotebookText className="h-5 w-5" /> Scratch Pad
                    </CardTitle>
                    <p
                      data-studio-caption
                      className={cn(
                        studioPanelCaption,
                        isOpen ? 'text-[10px] leading-snug break-words' : 'text-[9px] leading-none truncate'
                      )}
                      title="Paste here, then onto the sheet"
                    >
                      {isOpen ? 'Paste here, then onto the sheet' : 'Scratch notes'}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                  {effectResults.length > 0 && (
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleClearAllEffects(); }}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Clear all results</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  )}
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 md:p-6 md:pt-0 min-w-0">
            <div className="h-96 w-full min-w-0 overflow-y-auto studio-scrollbar pr-1">
              <div className="w-full min-w-0 max-w-full space-y-4">
                <Textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Jot down rough ideas here. Saves automatically."
                  className="h-48 min-h-[12rem] w-full min-w-0 resize-none font-code tracking-wider text-xs bg-background/50"
                />
                {effectResults.length > 0 && (
                  <div className="border-t border-dashed pt-4 space-y-4 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Analysis History</p>
                    {effectResults.map((result, index) => (
                      <div
                        key={index}
                        className="group min-w-0 w-full p-3 rounded-lg bg-background/50 border border-border overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Wand2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            <p className="text-xs font-bold capitalize font-headline truncate">{result.tool}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteEffect(index)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-code mb-2 break-words whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
                          Inputs: {formatInputs(result.inputs)}
                        </p>
                        <div className="space-y-1.5 min-w-0">
                          {result.outputs.map((line, lineIndex) => {
                            const copyKey = `${index}-${lineIndex}`;
                            const copied = copiedKey === copyKey;
                            return (
                              <div
                                key={lineIndex}
                                className="group/line flex items-start gap-1 min-w-0 rounded border border-transparent hover:border-border hover:bg-muted/60 transition-colors pl-2 pr-0.5 py-1.5"
                              >
                                <p className="flex-1 min-w-0 text-xs font-code break-words whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] select-text">
                                  {line}
                                </p>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 mt-0.5 text-muted-foreground hover:text-primary opacity-70 group-hover/line:opacity-100"
                                        onClick={() => void handleCopyLine(line, copyKey)}
                                        aria-label="Copy result"
                                      >
                                        {copied ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs">
                                      Copy line
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

ScratchPad.displayName = 'ScratchPad';

export { ScratchPad };
