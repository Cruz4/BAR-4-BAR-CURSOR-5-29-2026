'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wand2, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, mergeDirection } from '@/lib/utils';
import {
  studioAccentPanel,
  studioPanelCaption,
  studioPanelField,
  studioPanelInner,
  studioPanelLabel,
} from '@/lib/studio-panel-styles';

function effectsSubtitleClass(expanded: boolean) {
  return cn(
    studioPanelCaption,
    expanded ? 'text-[10px] leading-snug break-words' : 'text-[9px] leading-none truncate'
  );
}
import type { Album, StyleProfile, Track, TrackSection } from '@/lib/types';
import type { CreativeTool, CreativeEffectsInput } from '@/ai/flows/creative-effects';
import { lazyRunCreativeEffect } from '@/lib/lazy-ai-flows';
import { useUIState } from '@/hooks/use-ui-state';
import type { ScratchPadEffectResult } from './scratch-pad';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { useTouchInkRunner } from '@/hooks/use-touch-ink-runner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { withAiAuth } from '@/lib/ai-client';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from './studio-loader';
import { buildAlbumAlreadyUsed } from '@/lib/album-already-used';
import { isAlbumDnaActive } from '@/lib/co-writer-rules';

interface CreativeEffectsPanelProps {
  track: Track;
  album: Album;
  styleProfile: StyleProfile;
  scratchPadRef: React.RefObject<{ addEffectResult: (result: ScratchPadEffectResult) => void; }>;
  activeSection: TrackSection | null | undefined;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TOOL_CONFIG: Record<CreativeTool, { label: string; description: string; howTo: string; inputs: any }> = {
  'simile': { 
    label: 'Simile', 
    description: 'Generates comparisons using "like" or "as" to create vivid imagery.',
    howTo: 'Enter a concept (e.g., "my ambition", "the city") into the Subject field.',
    inputs: { subject: { type: 'text', label: 'Subject' } } 
  },
  'metaphor': { 
    label: 'Metaphor', 
    description: 'Generates a direct comparison between two unlike things without using "like" or "as".',
    howTo: 'Enter a Subject (e.g., "her voice") and what it is a metaphor For (e.g., "a storm").',
    inputs: { subject: { type: 'text', label: 'Subject' }, metaphorFor: { type: 'text', label: 'Is a metaphor for' } } 
  },
  'sound-alike': { 
    label: 'Sound-Alike', 
    description: 'Finds words that sound similar (homophones/near-rhymes) for clever wordplay.', 
    howTo: 'Enter a Word to flip (e.g., "reign" to get plays on "rain"). Use Looseness to control how far it strays.',
    inputs: { word: { type: 'text', label: 'Word' }, looseness: { type: 'slider', label: 'Looseness', min: 0, max: 1, step: 0.1 } } 
  },
  'twist': { 
    label: 'Twist', 
    description: 'Takes a common phrase and gives it an unexpected, poetic, or surreal twist.',
    howTo: 'Provide a Seed Phrase (e.g., "kill two birds with one stone"). Use Surrealism to adjust how abstract the twist is.',
    inputs: { seedPhrase: { type: 'text', label: 'Seed Phrase' }, surrealism: { type: 'slider', label: 'Surrealism', min: 0, max: 1, step: 0.1 } } 
  },
  'image-chain': { 
    label: 'Image Chain', 
    description: 'Creates a chain of thematically connected images, starting from a single concept.',
    howTo: 'Enter a Root Concept (e.g., "night") to brainstorm a sequence of visual ideas. Adjust the chain Length.',
    inputs: { rootConcept: { type: 'text', label: 'Root Concept' }, chainLength: { type: 'slider', label: 'Length', min: 3, max: 12, step: 1 } } 
  },
  'pov': {
    label: 'Point of View',
    description: 'Writes about a topic from a completely different perspective.',
    howTo: 'Enter a Topic (e.g., "heartbreak") and select a Perspective from the dropdown to generate lines from that viewpoint.',
    inputs: {
      topic: { type: 'text', label: 'Topic' },
      perspective: { type: 'select', label: 'Perspective', options: ['memory', 'future self', 'object', 'enemy', 'lover', 'city', 'universe'] },
    },
  },
  'alliteration': { 
    label: 'Alliteration', 
    description: 'Generates musical lines where multiple words start with the same letter.', 
    howTo: 'Provide a start Letter (e.g., "S") and a general Theme (e.g., "success") to get alliterative lines.',
    inputs: { seedLetter: { type: 'text', label: 'Letter' }, theme: { type: 'text', label: 'Theme' } } 
  },
  'acronym': { 
    label: 'Acronym', 
    description: 'Treats a word as an acronym and expands it into a meaningful phrase.', 
    howTo: 'Enter a single Word (e.g., "DREAM"). The AI will generate a phrase where each word starts with those letters.',
    inputs: { word: { type: 'text', label: 'Word' } } 
  },
  'blend': { 
    label: 'Blend', 
    description: 'Mixes two different concepts to create a fresh metaphor or a new hybrid idea.',
    howTo: 'Enter two ideas into Concept A (e.g., "a ghost") and Concept B (e.g., "a melody") to get blended lyrical ideas.',
    inputs: { conceptA: { type: 'text', label: 'Concept A' }, conceptB: { type: 'text', label: 'Concept B' } } 
  },
};

const ALL_CREATIVE_TOOLS = Object.keys(TOOL_CONFIG) as CreativeTool[];

export function CreativeEffectsPanel({ track, album, styleProfile, scratchPadRef, activeSection, isOpen: controlledOpen, onOpenChange }: CreativeEffectsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<CreativeTool>('simile');
  const [isGenerating, startGeneration] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setGenerating } = useUIState();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [endWith, setEndWith] = useState('');
  const { refundInk, addUsageLog } = useUsage();
  const { getEffectiveCost, buttonLabel, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const formStateRef = useRef<Record<string, any>>({
    'simile': { subject: '' },
    'metaphor': { subject: '', metaphorFor: '' },
    'sound-alike': { word: '', looseness: 0.5 },
    'twist': { seedPhrase: '', surrealism: 0.5 },
    'image-chain': { rootConcept: '', chainLength: 5 },
    'pov': { topic: '', perspective: 'object' },
    'alliteration': { seedLetter: '', theme: '' },
    'acronym': { word: '' },
    'blend': { conceptA: '', conceptB: '' },
  });

  const handleInputChange = (tool: CreativeTool, field: string, value: any) => {
    formStateRef.current[tool][field] = value;
  };

  const handleRunEffect = (e: any) => {
    const cost = getEffectiveCost('runCreativeEffect');
    runWithInk(`runCreativeEffect-${selectedTool}`, cost, 'runCreativeEffect', e, () => {
      const currentToolInputs = formStateRef.current[selectedTool];

      if (Object.values(currentToolInputs).some((val) => val === '')) {
        toast({ variant: 'destructive', title: 'Missing Input', description: 'Please fill out all fields for the selected tool.' });
        refundInk(cost);
        return;
      }

      setGenerating(true, 'Running Effect...');
      startGeneration(async () => {
      try {
        const mergedDirection = mergeDirection(album.direction, track.direction);
        const priorLines = activeSection?.bars.map(b => b.text) || [];
        const albumUsed = isAlbumDnaActive(track, album)
          ? buildAlbumAlreadyUsed(album, track.id)
          : null;

        const input: CreativeEffectsInput = {
          userId: user?.id,
          userName: user?.displayName,
          mergedDirection,
          vibe: track.vibe ?? { genre: 'General', tempoBPM: 90, feeling: ['neutral'] },
          intents: track.checkedIntents?.length ? track.checkedIntents : track.intentRefs ?? [],
          styleProfile: { analysis: styleProfile.history[0]?.analysis || 'User has a neutral, balanced style.' },
          sectionContext: { name: activeSection?.type || 'verse', priorLines: priorLines, nextLines: [] },
          editorConstraints: { maxLineLen: 80, rhymePreset: 'none', endWith: endWith || null, startWith: null, mustRhyme: false },
          toolRequest: { tool: selectedTool, inputs: currentToolInputs as any },
          albumAlreadyUsed: albumUsed?.promptBlock,
          albumRepetitionContext: albumUsed?.repetitionContext,
          albumAvoidEndWords: albumUsed?.avoidEndWords,
        };

        const result = await lazyRunCreativeEffect(await withAiAuth(input));

        if (!result.options || result.options.length === 0) throw new Error('The AI did not return any suggestions.');
        
        addUsageLog({ flowName: 'runCreativeEffect', inkCost: cost, status: 'success', details: `Tool: ${selectedTool}` });
        
        const effectResult: ScratchPadEffectResult = {
            tool: selectedTool,
            inputs: currentToolInputs,
            outputs: result.options,
        };

        scratchPadRef.current?.addEffectResult(effectResult);
        toast({ title: 'Effect Complete!', description: `Results for '${TOOL_CONFIG[selectedTool].label}' added to Scratch Pad.` });

      } catch (error) {
        addUsageLog({ flowName: 'runCreativeEffect', inkCost: 0, status: 'error', details: (error as Error).message });
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Failed to Run Effect', description: (error as Error).message });
      } finally {
        setGenerating(false);
      }
    });
    });
  };

  const renderInputs = (tool: CreativeTool) => {
    const config = TOOL_CONFIG[tool];
    return Object.entries(config.inputs).map(([key, inputConfig]: [string, any]) => (
      <div key={key}>
        <Label htmlFor={`${tool}-${key}`} className={studioPanelLabel}>{inputConfig.label}</Label>
        {inputConfig.type === 'text' && (
          <Input id={`${tool}-${key}`} defaultValue={formStateRef.current[tool][key]} onChange={(e) => handleInputChange(tool, key, e.target.value)} className={cn('h-8 text-[12px]', studioPanelField)} />
        )}
        {inputConfig.type === 'slider' && (
          <div className="flex items-center gap-4 py-1">
             <Slider id={`${tool}-${key}`} defaultValue={[formStateRef.current[tool][key]]} min={inputConfig.min} max={inputConfig.max} step={inputConfig.step} onValueChange={(value) => handleInputChange(tool, key, value[0])} />
            <span className="text-[12px] font-mono w-8 text-foreground/90">{formStateRef.current[tool][key].toFixed(1)}</span>
          </div>
        )}
        {inputConfig.type === 'select' && (
           <Select defaultValue={formStateRef.current[tool][key]} onValueChange={(value) => handleInputChange(tool, key, value)}>
                <SelectTrigger className={cn('h-8 text-[12px]', studioPanelField)}><SelectValue /></SelectTrigger>
                <SelectContent>
                    {inputConfig.options.map((opt: string) => (
                        <SelectItem key={opt} value={opt} className="capitalize text-[12px]">{opt}</SelectItem>
                    ))}
                </SelectContent>
           </Select>
        )}
      </div>
    ));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card data-tour="creative-effects" data-creative-effects data-studio-panel className={studioAccentPanel('indigo')}>
        <CollapsibleTrigger asChild>
            <CardHeader className="flex-row items-center justify-between cursor-pointer p-4 md:p-6">
                <div className="flex flex-col w-full min-w-0 pr-1">
                    <CardTitle className="font-headline text-lg flex items-center gap-2 uppercase tracking-widest text-indigo-600 dark:text-indigo-400 text-left">
                      <Wand2 className="h-5 w-5 shrink-0"/> Creative Effects
                    </CardTitle>
                    <p
                      className={cn('text-left pl-7', effectsSubtitleClass(isOpen))}
                      title="Pick one — what it does is under the picker"
                    >
                      {isOpen ? 'Pick one — what it does is under the picker' : 'Lyric tools'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronsUpDown className="h-4 w-4" /></Button>
            </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <CardContent className="space-y-4 p-4 md:p-6 md:pt-0 font-code text-[12px] text-foreground">
            <div>
                <Label className={studioPanelLabel}>Select Tool</Label>
                <Select value={selectedTool} onValueChange={(value) => setSelectedTool(value as CreativeTool)}>
                    <SelectTrigger className={cn('h-9 text-[12px]', studioPanelField)}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {ALL_CREATIVE_TOOLS.map((key) => (
                        <SelectItem key={key} value={key} className="text-[12px]">{TOOL_CONFIG[key].label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className={cn('space-y-3', studioPanelInner, 'border-indigo-500/20 dark:border-indigo-500/20')}>
                <div className="space-y-2">
                    {renderInputs(selectedTool)}
                </div>
                <div className="text-[11px] text-foreground pt-2 border-t border-border/60 leading-relaxed">
                    <p className="font-bold">{TOOL_CONFIG[selectedTool].description}</p>
                    <p className="italic mt-0.5 text-muted-foreground">{TOOL_CONFIG[selectedTool].howTo}</p>
                </div>
            </div>
            
            <div>
                <Label htmlFor="effect-end-with" className={studioPanelLabel}>End With (Optional)</Label>
                <Input id="effect-end-with" placeholder="e.g., the moonlight" value={endWith} onChange={(e) => setEndWith(e.target.value)} className={cn('h-9 text-[12px]', studioPanelField)} />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={(e) => handleRunEffect(e)} disabled={isGenerating} size="lg" className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md">
                      {isGenerating ? <StudioLoader size="sm" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      {buttonLabel('runCreativeEffect')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-[10px] font-bold">{tooltip('runCreativeEffect')}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            </CardContent>
        </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}
