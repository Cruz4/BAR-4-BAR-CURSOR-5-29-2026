'use client';

import React from 'react';
import type { Direction, DnaPreset, StyleMetrics } from '@/lib/types';
import {
  CREATIVE_DNA_FIELDS,
  STRAIN_TARGETS,
  DEFAULT_STYLE_METRICS,
  getStrainDestinationTheme,
  getStrainInjectTooltip,
  getVaultFieldInjectTooltip,
  getVaultPresetStrains,
} from '@/lib/dna-strands';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type DnaVaultPresetDetailsProps = {
  preset: DnaPreset;
  compact?: boolean;
  onInjectMappingField: (field: keyof Direction, value: string | undefined) => void;
  onInjectStrain: (title: string, content: string | string[]) => void;
  onInjectStyle?: (analysis: string, metrics?: StyleMetrics) => void;
};

function StrainRow({
  label,
  value,
  onInject,
  injectLabel,
  compact,
  themeKey,
}: {
  label: string;
  value: string | string[];
  onInject?: () => void;
  injectLabel?: string;
  compact?: boolean;
  themeKey?: string;
}) {
  const text = Array.isArray(value) ? value.join(', ') : value;
  const theme = themeKey ? getStrainDestinationTheme(themeKey) : null;
  const isEmpty = !text || text === 'N/A';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded border',
        compact ? 'p-2.5' : 'p-3',
        theme ? theme.cardBg : 'bg-background/20',
        theme ? theme.cardBorder : 'border-white/5'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-widest',
            theme ? theme.title : 'text-muted-foreground'
          )}
        >
          {label}
        </p>
        {onInject && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 shrink-0',
                  theme ? cn(theme.inject, theme.injectHover) : 'text-primary hover:bg-primary/20'
                )}
                onClick={onInject}
                disabled={isEmpty}
                aria-label={injectLabel ?? `Inject ${label}`}
              >
                <Zap className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[240px] text-xs leading-snug">
              {injectLabel ?? `Inject ${label}`}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge
              key={v}
              variant="outline"
              className={cn(
                'text-[10px] uppercase py-0.5 px-2',
                theme ? cn(theme.badgeBg, theme.badgeBorder, theme.badgeText) : 'border-white/20 text-primary'
              )}
            >
              {v}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground leading-relaxed font-code whitespace-pre-wrap break-words italic">
          {isEmpty ? 'N/A' : `"${text}"`}
        </p>
      )}
    </div>
  );
}

export function DnaVaultPresetDetails({
  preset,
  compact = false,
  onInjectMappingField,
  onInjectStrain,
  onInjectStyle,
}: DnaVaultPresetDetailsProps) {
  const presetStrains = getVaultPresetStrains(preset);
  const styleAnalysis = preset.styleAnalysis?.trim() || preset.analysis?.styleAnalysis?.trim();
  const styleMetrics = preset.styleMetrics ?? preset.analysis?.styleMetrics ?? DEFAULT_STYLE_METRICS;
  const styleTheme = getStrainDestinationTheme('Style');
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('space-y-4', compact ? 'text-sm' : '')}>
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">
            Creative DNA (Hub)
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Mapped into the 5 direction questions for synthesis.
          </p>
          {CREATIVE_DNA_FIELDS.map(({ key, label }) => {
            const value = preset.mapping?.[key] as string | undefined;
            return (
              <StrainRow
                key={key}
                label={label}
                value={value?.trim() ? value : 'N/A'}
                compact={compact}
                themeKey="Themes"
                injectLabel={getVaultFieldInjectTooltip(key)}
                onInject={value?.trim() ? () => onInjectMappingField(key, value) : undefined}
              />
            );
          })}
        </div>

        {presetStrains.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Extraction Strains
            </p>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Motifs, structure, style, and narrative DNA — each ⚡ injects to its target section.
            </p>
            {presetStrains.map(({ title, content }) => {
              if (title === 'Style') return null;
              const canInject = !!STRAIN_TARGETS[title];
              return (
                <StrainRow
                  key={title}
                  label={title}
                  value={content}
                  compact={compact}
                  themeKey={title}
                  injectLabel={canInject ? getStrainInjectTooltip(title) : undefined}
                  onInject={
                    canInject
                      ? () => onInjectStrain(title, content as string | string[])
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}

        {styleAnalysis && (
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <p className={cn('text-[10px] font-bold uppercase tracking-widest', styleTheme.title)}>
              Style DNA
            </p>
            <div
              className={cn(
                'flex flex-col gap-2.5 rounded border',
                compact ? 'p-2.5' : 'p-3',
                styleTheme.cardBg,
                styleTheme.cardBorder
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-[10px] font-bold uppercase', styleTheme.title)}>Style DNA</p>
                {onInjectStyle && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn('h-7 w-7', styleTheme.inject, styleTheme.injectHover)}
                        onClick={() => onInjectStyle(styleAnalysis, styleMetrics)}
                        aria-label="Load style into Style DNA panel"
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[240px] text-xs">
                      Load style into Style DNA panel
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase">
                <div className="space-y-1">
                  <span className={cn('opacity-70', styleTheme.title)}>Vocab</span>
                  <Progress value={styleMetrics.vocabularyScore} className="h-1.5 bg-fuchsia-500/10" />
                </div>
                <div className="space-y-1">
                  <span className={cn('opacity-70', styleTheme.title)}>Rhyme</span>
                  <Progress value={styleMetrics.rhymeComplexity} className="h-1.5 bg-fuchsia-500/10" />
                </div>
              </div>
              <p className={cn('text-[10px] font-bold uppercase', styleTheme.pill)}>
                Cadence: {styleMetrics.cadenceMap}
              </p>
              <p className="text-xs text-foreground font-code italic leading-relaxed whitespace-pre-wrap break-words">
                "{styleAnalysis}"
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
