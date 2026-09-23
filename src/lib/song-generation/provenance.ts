import type { GeneratedTakeProvenance } from '@/lib/song-generation/types';

export const GENERATED_IN_APP_LABEL = 'Generated in AKAsheet';

export function buildTakeProvenance(input: {
  recipeHash: string;
  compilerVersion: string;
  modelFamily: string;
  modelRevision: string;
}): GeneratedTakeProvenance {
  return {
    generatedInApp: true,
    recipeHash: input.recipeHash,
    compilerVersion: input.compilerVersion,
    modelFamily: input.modelFamily,
    modelRevision: input.modelRevision,
    disclosedAt: null,
  };
}

export function toPublicProvenance(
  prov: GeneratedTakeProvenance
): Pick<GeneratedTakeProvenance, 'generatedInApp' | 'recipeHash' | 'modelFamily'> {
  return {
    generatedInApp: prov.generatedInApp,
    recipeHash: prov.recipeHash,
    modelFamily: prov.modelFamily,
  };
}
