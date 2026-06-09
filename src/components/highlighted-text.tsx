'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/14/2026) - Pixel-Parity Highlighter.
 * 
 * - Logic: Single-pass regex rendering to eliminate sub-pixel fragmentation drift.
 * - FIX (5/14): Added 'transparent' prop to support background rendering in editor vs foreground in Performer.
 */

import ColorHash from 'color-hash';
import React from 'react';

// Saturated highlight colors for maximum contrast with white text
const colorHash = new ColorHash({lightness: [0.35, 0.45, 0.55], saturation: [0.45, 0.55, 0.65]});

export function HighlightedText({ text, rhymeGroups, transparent = false }: { text: string; rhymeGroups: { words: string[] }[]; transparent?: boolean }) {
    if (!text) return null;
    if (!rhymeGroups || rhymeGroups.length === 0) {
        return <>{text}</>;
    }

    // Map words to their assigned group colors
    const wordMap = new Map<string, string>(); 
    rhymeGroups.forEach((group) => {
        const words = group.words;
        if (!words || words.length < 2) return;
        const color = colorHash.hex(words[0]);
        words.forEach(word => {
            if (word) {
                const cleanWord = word.toLowerCase().trim();
                if (cleanWord) wordMap.set(cleanWord, color);
            }
        });
    });

    // Create a regex to match any of the words in the map (whole words only)
    const rhymingWords = Array.from(wordMap.keys()).sort((a, b) => b.length - a.length);
    if (rhymingWords.length === 0) return <>{text}</>;

    // Escape special regex characters in the words
    const escapedWords = rhymingWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(\\b(?:${escapedWords.join('|')})\\b)`, 'gi');

    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                const cleanPart = part.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'?]/g, "").toLowerCase().trim();
                const highlightColor = wordMap.get(cleanPart);

                if (highlightColor) {
                    return (
                        <span 
                            key={index}
                            style={{ 
                                backgroundColor: highlightColor,
                                display: 'inline',
                                padding: '1px 4px',
                                margin: '0',
                                color: transparent ? 'transparent' : 'white',
                                borderRadius: '2px',
                                boxDecorationBreak: 'clone',
                                WebkitBoxDecorationBreak: 'clone'
                            }} 
                            className="font-bold select-none"
                        >
                            {part}
                        </span>
                    );
                }
                
                return <span key={index} className={transparent ? "text-transparent" : "text-inherit"}>{part}</span>;
            })}
        </>
    );
}
