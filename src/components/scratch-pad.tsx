'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotebookText, Trash2, Wand2, ChevronsUpDown } from 'lucide-react';
import type { CreativeTool } from '@/ai/flows/creative-effects';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-muted/30 border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 md:p-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col text-left">
                    <CardTitle className="font-headline text-lg flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                      <NotebookText className="h-5 w-5" /> Scratch Pad
                    </CardTitle>
                    <CardDescription className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground/60">Temporary Work Area</CardDescription>
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
          <CardContent className="p-4 md:p-6 md:pt-0">
            <ScrollArea className="h-96 w-full">
              <div className="space-y-4">
                <Textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Jot down rough ideas here. Saves automatically."
                  className="h-48 min-h-[12rem] w-full resize-none font-code tracking-wider text-xs bg-background/50"
                />
                {effectResults.length > 0 && <div className="border-t border-dashed pt-4 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Analysis History</p>
                  {effectResults.map((result, index) => (
                    <div key={index} className="group p-3 rounded-lg bg-background/50 border border-border">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <Wand2 className="h-3.5 w-3.5 text-indigo-500"/>
                            <p className="text-xs font-bold capitalize font-headline">{result.tool}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteEffect(index)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-code mb-2 truncate">Inputs: {formatInputs(result.inputs)}</p>
                      <div className="space-y-1">
                        {result.outputs.map((line, lineIndex) => (
                          <p key={lineIndex} className="text-xs font-code p-1.5 rounded hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border">{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

ScratchPad.displayName = 'ScratchPad';

export { ScratchPad };
