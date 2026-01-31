"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ClueOption {
  id?: string;
  clue: string;
  type: string; // "analogy", "dictionary", "simple", "phrase", "idiom", "sneaky"
  islamic: boolean;
  source?: string; // "imported", "ai-generated", "manual"
  isApproved?: boolean;
}

interface ClueSelectorProps {
  word: string;
  clues: ClueOption[];
  selectedClueIndex: number;
  onSelectClue: (index: number) => void;
  onGenerateMore?: () => void;
  onApproveClue?: (index: number) => void;
  isGenerating?: boolean;
  showApproval?: boolean;
}

const clueTypeColors: Record<string, string> = {
  simple: "bg-green-100 text-green-800",
  dictionary: "bg-blue-100 text-blue-800",
  analogy: "bg-purple-100 text-purple-800",
  phrase: "bg-orange-100 text-orange-800",
  idiom: "bg-yellow-100 text-yellow-800",
  sneaky: "bg-red-100 text-red-800",
};

export function ClueSelector({
  word,
  clues,
  selectedClueIndex,
  onSelectClue,
  onGenerateMore,
  onApproveClue,
  isGenerating = false,
  showApproval = false,
}: ClueSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedClueIndex);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : clues.length - 1;
    setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < clues.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
  };

  const handleSelect = () => {
    onSelectClue(currentIndex);
  };

  const handleApprove = () => {
    if (onApproveClue) {
      onApproveClue(currentIndex);
    }
  };

  if (clues.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold text-lg">{word}</span>
          {onGenerateMore && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateMore}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Generate Clues
            </Button>
          )}
        </div>
        <p className="text-slate-500 text-sm">No clues available for this word.</p>
      </div>
    );
  }

  const currentClue = clues[currentIndex];

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-lg text-indigo-900">{word}</span>
          <Badge variant="outline" className="text-xs">
            {currentIndex + 1} / {clues.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {currentClue.islamic && (
            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
              ☪ Islamic
            </Badge>
          )}
          <Badge className={`text-xs ${clueTypeColors[currentClue.type] || "bg-slate-100"}`}>
            {currentClue.type}
          </Badge>
          {currentClue.source === "ai-generated" && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
      </div>

      {/* Clue Display with Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-h-[60px] flex items-center justify-center px-4 bg-slate-50 rounded-lg">
          <p className="text-center text-slate-800">{currentClue.clue}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="shrink-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          {onGenerateMore && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateMore}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              More
            </Button>
          )}
          {showApproval && !currentClue.isApproved && (
            <Button size="sm" variant="outline" onClick={handleApprove}>
              Approve
            </Button>
          )}
        </div>

        <Button
          size="sm"
          onClick={handleSelect}
          className={
            currentIndex === selectedClueIndex
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }
        >
          <Check className="h-4 w-4 mr-1" />
          {currentIndex === selectedClueIndex ? "Selected" : "Use This Clue"}
        </Button>
      </div>

      {/* Clue Dots Navigation */}
      <div className="flex justify-center gap-1 mt-3">
        {clues.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex
                ? "bg-indigo-600"
                : index === selectedClueIndex
                  ? "bg-emerald-400"
                  : "bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Go to clue ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// Multi-word clue selector for the Clues step in puzzle builder
interface MultiWordClueSelectorProps {
  words: {
    word: string;
    number: number;
    direction: "across" | "down";
    clues: ClueOption[];
    selectedClueIndex: number;
  }[];
  onSelectClue: (wordIndex: number, clueIndex: number) => void;
  onGenerateClues?: (wordIndex: number) => void;
  isGenerating?: boolean;
  generatingWord?: string;
}

export function MultiWordClueSelector({
  words,
  onSelectClue,
  onGenerateClues,
  isGenerating = false,
  generatingWord,
}: MultiWordClueSelectorProps) {
  return (
    <div className="space-y-4">
      {words.map((wordData, wordIndex) => (
        <div key={`${wordData.direction}-${wordData.number}`}>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={
                wordData.direction === "across"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700"
              }
            >
              {wordData.number} {wordData.direction.toUpperCase()}
            </Badge>
          </div>
          <ClueSelector
            word={wordData.word}
            clues={wordData.clues}
            selectedClueIndex={wordData.selectedClueIndex}
            onSelectClue={(clueIndex) => onSelectClue(wordIndex, clueIndex)}
            onGenerateMore={
              onGenerateClues ? () => onGenerateClues(wordIndex) : undefined
            }
            isGenerating={isGenerating && generatingWord === wordData.word}
          />
        </div>
      ))}
    </div>
  );
}
