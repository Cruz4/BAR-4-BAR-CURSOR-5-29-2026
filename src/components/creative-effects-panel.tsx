'use client';

import React, { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wand2, ChevronsUpDown, Lock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, mergeDirection } from '@/lib/utils';
import type { Album, StyleProfile, Track, TrackSection } from '@/lib/types';
import { runCreativeEffect, type CreativeTool, type CreativeEffectsInput } from '@/ai/flows/creative-effects';
import { useUIState } from '@/hooks/use-ui-state';
import type { ScratchPadEffectResult } from './scratch-pad';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { withAiAuth } from '@/lib/ai-client';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from './studio-loader';
import { ProLockBadge, proLockShell, proLockIcon, proLockText } from '@/components/pro-lock';

export const FREE_CREATIVE_TOOLS: CreativeTool[] = ['simile', 'metaphor', 'sound-alike'];

interface CreativeEffectsPanelProps {
  track: Track;
  album: Album;
  styleProfile: StyleProfile;
  scratchPadRef: React.RefObject<{ addEffectResult: (result: ScratchPadEffectResult) => void; }>;
  activeSection: TrackSection | null | undefined;
  isPro?: boolean;
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

function isToolFree(tool: CreativeTool, isPro?: boolean) {
  return isPro || FREE_CREATIVE_TOOLS.includes(tool);
}

export function CreativeEffectsPanel({ track, album, styleProfile, scratchPadRef, activeSection, isPro = false, isOpen: controlledOpen, onOpenChange }: CreativeEffectsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<CreativeTool>('simile');
  const [isGenerating, startGeneration] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setGenerating } = useUIState();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [endWith, setEndWith] = useState('');
  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { getCost, buttonLabel, tooltip } = useInkCosts();

  const proTools = (Object.keys(TOOL_CONFIG) as CreativeTool[]).filter(t => !FREE_CREATIVE_TOOLS.includes(t));
  const selectedIsLocked = !isToolFree(selectedTool, isPro);

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
    if (selectedIsLocked) {
      toast({ variant: 'destructive', title: 'Studio Pro Required', description: 'Upgrade to unlock all Creative Effects.' });
      return;
    }
    const cost = getCost('runCreativeEffect');
    if (!deductInk(cost, 'runCreativeEffect', e)) return;

    const currentToolInputs = formStateRef.current[selectedTool];

    if (Object.values(currentToolInputs).some(val => val === '')) {
      toast({ variant: 'destructive', title: 'Missing Input', description: 'Please fill out all fields for the selected tool.' });
      refundInk(cost);
      return;
    }

    setGenerating(true, 'Running Effect...');
    startGeneration(async () => {
      try {
        const mergedDirection = mergeDirection(album.direction, track.direction);
        const priorLines = activeSection?.bars.map(b => b.text) || [];

        const input: CreativeEffectsInput = {
          userId: user?.id,
          userName: user?.displayName,
          mergedDirection,
          vibe: track.vibe,
          intents: track.intentRefs,
          styleProfile: { analysis: styleProfile.history[0]?.analysis || 'User has a neutral, balanced style.' },
          sectionContext: { name: activeSection?.type || 'verse', priorLines: priorLines, nextLines: [] },
          editorConstraints: { maxLineLen: 80, rhymePreset: 'none', endWith: endWith || null, startWith: null, mustRhyme: false },
          toolRequest: { tool: selectedTool, inputs: currentToolInputs as any },
        };

        const result = await runCreativeEffect(await withAiAuth(input));

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
  };

  const renderInputs = (tool: CreativeTool) => {
    const config = TOOL_CONFIG[tool];
    return Object.entries(config.inputs).map(([key, inputConfig]: [string, any]) => (
      <div key={key}>
        <Label htmlFor={`${tool}-${key}`} className="text-[10px] font-bold uppercase text-indigo-700">{inputConfig.label}</Label>
        {inputConfig.type === 'text' && (
          <Input id={`${tool}-${key}`} defaultValue={formStateRef.current[tool][key]} onChange={(e) => handleInputChange(tool, key, e.target.value)} className="h-8 bg-background/50" disabled={selectedIsLocked} />
        )}
        {inputConfig.type === 'slider' && (
          <div className="flex items-center gap-4 py-1">
             <Slider id={`${tool}-${key}`} defaultValue={[formStateRef.current[tool][key]]} min={inputConfig.min} max={inputConfig.max} step={inputConfig.step} onValueChange={(value) => handleInputChange(tool, key, value[0])} disabled={selectedIsLocked} />
            <span className="text-xs font-mono w-8">{formStateRef.current[tool][key].toFixed(1)}</span>
          </div>
        )}
        {inputConfig.type === 'select' && (
           <Select defaultValue={formStateRef.current[tool][key]} onValueChange={(value) => handleInputChange(tool, key, value)} disabled={selectedIsLocked}>
                <SelectTrigger className="h-8 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {inputConfig.options.map((opt: string) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                    ))}
                </SelectContent>
           </Select>
        )}
      </div>
    ));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-indigo-500/10 dark:bg-indigo-500/5 border-indigo-200/50">
        <CollapsibleTrigger asChild>
            <CardHeader className="flex-row items-center justify-between cursor-pointer p-4 md:p-6">
                <div className="flex flex-col text-left w-full">
                    <CardTitle className="font-headline text-lg flex items-center gap-2 uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                      <Wand2 className="h-5 w-5 shrink-0"/> Creative Effects
                    </CardTitle>
                    {!isPro && (
                      <div className="w-full flex justify-center mt-2 mb-1">
                        <ProLockBadge label="3 Free · Pro Unlocks All" />
                      </div>
                    )}
                    <CardDescription className="text-[9px] text-indigo-600/60 uppercase font-bold tracking-tight">Specialized Lyrical Tools</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronsUpDown className="h-4 w-4" /></Button>
            </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <CardContent className="space-y-4 p-4 md:p-6 md:pt-0 font-code">
            <div>
                <Label className="text-[10px] font-bold uppercase text-indigo-700/50">Select Tool</Label>
                <Select value={selectedTool} onValueChange={(value) => setSelectedTool(value as CreativeTool)}>
                    <SelectTrigger className="bg-background/50 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {(isPro ? Object.keys(TOOL_CONFIG) : FREE_CREATIVE_TOOLS).map((key) => (
                        <SelectItem key={key} value={key}>{TOOL_CONFIG[key as CreativeTool].label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className={cn("space-y-3 p-3 bg-background/50 rounded-lg border border-indigo-500/10", selectedIsLocked && "opacity-60 pointer-events-none")}>
                <div className="space-y-2">
                    {renderInputs(selectedTool)}
                </div>
                <div className="text-[10px] text-indigo-600/80 pt-2 border-t border-indigo-500/10 leading-relaxed">
                    <p className="font-bold">{TOOL_CONFIG[selectedTool].description}</p>
                    <p className="italic mt-0.5">{TOOL_CONFIG[selectedTool].howTo}</p>
                </div>
            </div>
            
            <div className={cn(selectedIsLocked && "opacity-60 pointer-events-none")}>
                <Label htmlFor="effect-end-with" className="text-[10px] font-bold uppercase text-indigo-700/70">End With (Optional)</Label>
                <Input id="effect-end-with" placeholder="e.g., the moonlight" value={endWith} onChange={(e) => setEndWith(e.target.value)} className="h-9 bg-background/50" disabled={selectedIsLocked} />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={(e) => handleRunEffect(e)} disabled={isGenerating || selectedIsLocked} size="lg" className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md">
                      {isGenerating ? <StudioLoader size="sm" /> : selectedIsLocked ? <Lock className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      {selectedIsLocked ? 'Upgrade to Run' : buttonLabel('runCreativeEffect')}
                  </Button>
                </TooltipTrigger>
                {!selectedIsLocked && (
                  <TooltipContent><p className="text-[10px] font-bold">{tooltip('runCreativeEffect')}</p></TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {!isPro && proTools.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className={cn('h-4 w-4', proLockIcon())} />
                  <p className={proLockText('text-[10px]')}>Studio Pro Effects</p>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">Free artists get Simile, Metaphor, and Sound-Alike. Upgrade to unlock the full lyrical toolkit.</p>
                <div className="space-y-2">
                  {proTools.map((tool) => {
                    const config = TOOL_CONFIG[tool];
                    return (
                      <div
                        key={tool}
                        className={cn(
                          'p-3 rounded-lg border border-dashed space-y-1.5',
                          proLockShell('md')
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Lock className={proLockIcon('h-3.5 w-3.5 shrink-0')} />
                          <p className="text-xs font-bold text-foreground">{config.label}</p>
                          <ProLockBadge label="Pro" className="ml-auto" />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed pl-5">{config.description}</p>
                        <p className="text-[9px] text-muted-foreground/70 italic pl-5">{config.howTo}</p>
                      </div>
                    );
                  })}
                </div>
                <Button asChild size="sm" className={cn('w-full font-bold text-[10px] uppercase border-0', proLockShell('md'), proLockText())}>
                  <Link href="/usage?tab=cloud">
                    <Sparkles className={cn('mr-2 h-3.5 w-3.5', proLockIcon())} /> Upgrade to Studio Pro
                  </Link>
                </Button>
              </div>
            )}
            </CardContent>
        </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}
