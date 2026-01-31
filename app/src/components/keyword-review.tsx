'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * KeywordReview Component
 *
 * Displays unapproved (AI-generated) keywords for review.
 * Allows approving, editing, or deleting keywords.
 */

interface KeywordReviewProps {
  className?: string;
}

export function KeywordReview({ className }: KeywordReviewProps) {
  const [selectedProphet, setSelectedProphet] = useState<string>('all');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  // Get stats to show unreviewed count
  const stats = useQuery(api.prophetKeywords.stats);

  // Get all prophets for filter dropdown
  const prophets = useQuery(api.prophetKeywords.listProphets);

  // Get keywords for selected prophet (include unapproved)
  const keywords = useQuery(
    api.prophetKeywords.listByProphet,
    selectedProphet !== 'all'
      ? { prophetId: selectedProphet, includeUnapproved: true }
      : 'skip'
  );

  // Get all unapproved keywords when "all" is selected
  const searchResults = useQuery(
    api.prophetKeywords.search,
    selectedProphet === 'all'
      ? { query: '', includeUnapproved: true }
      : 'skip'
  );

  // Filter to only unapproved
  const unapprovedKeywords = useMemo(() => {
    const source = selectedProphet === 'all' ? searchResults : keywords;
    if (!source) return [];
    return source.filter((kw) => !kw.isApproved);
  }, [selectedProphet, keywords, searchResults]);

  // Mutations
  const approveKeyword = useMutation(api.prophetKeywords.approve);
  const bulkApprove = useMutation(api.prophetKeywords.bulkApprove);
  const removeKeyword = useMutation(api.prophetKeywords.remove);

  const handleApprove = async (keywordId: Id<'prophetKeywords'>) => {
    await approveKeyword({ keywordId });
  };

  const handleDelete = async (keywordId: Id<'prophetKeywords'>) => {
    await removeKeyword({ keywordId });
  };

  const handleBulkApprove = async () => {
    if (selectedKeywords.size === 0) return;
    const ids = Array.from(selectedKeywords) as Id<'prophetKeywords'>[];
    await bulkApprove({ keywordIds: ids });
    setSelectedKeywords(new Set());
  };

  const handleApproveAll = async () => {
    const ids = unapprovedKeywords.map((kw) => kw._id);
    await bulkApprove({ keywordIds: ids });
    setSelectedKeywords(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedKeywords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedKeywords(newSet);
  };

  const selectAll = () => {
    setSelectedKeywords(new Set(unapprovedKeywords.map((kw) => kw._id)));
  };

  const clearSelection = () => {
    setSelectedKeywords(new Set());
  };

  if (!stats) return null;

  if (stats.unapprovedCount === 0) {
    return (
      <Card className={cn('glass border-[#4A90C2]/20', className)}>
        <CardContent className="p-6 text-center">
          <p className="text-[#8fc1e3]">All keywords have been reviewed!</p>
          <p className="text-[#6ba8d4] text-sm mt-2">
            {stats.total} total keywords in database
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('glass border-[#4A90C2]/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#D4AF37] flex items-center gap-2">
            Review AI Keywords
            <span className="text-sm font-normal text-[#8fc1e3]">
              ({stats.unapprovedCount} pending)
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and bulk actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProphet} onValueChange={setSelectedProphet}>
            <SelectTrigger className="w-[200px] bg-[#002a42]/80 border-[#4A90C2]/30 text-white">
              <SelectValue placeholder="Filter by prophet" />
            </SelectTrigger>
            <SelectContent className="bg-[#002a42] border-[#4A90C2]/30">
              <SelectItem value="all" className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
                All Prophets
              </SelectItem>
              {prophets?.map((prophetId) => (
                <SelectItem
                  key={prophetId}
                  value={prophetId}
                  className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]"
                >
                  {prophetId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {selectedKeywords.size > 0 ? (
            <>
              <span className="text-[#8fc1e3] text-sm">
                {selectedKeywords.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                className="border-[#4A90C2]/30 text-[#8fc1e3] hover:bg-[#003B5C]"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve Selected
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                className="border-[#4A90C2]/30 text-[#8fc1e3] hover:bg-[#003B5C]"
              >
                Select All
              </Button>
              <Button
                size="sm"
                onClick={handleApproveAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve All ({unapprovedKeywords.length})
              </Button>
            </>
          )}
        </div>

        {/* Keywords list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {unapprovedKeywords.length === 0 ? (
            <p className="text-[#6ba8d4] text-center py-4">
              {selectedProphet === 'all'
                ? 'Loading keywords...'
                : 'No unapproved keywords for this prophet'}
            </p>
          ) : (
            unapprovedKeywords.map((kw) => (
              <div
                key={kw._id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  selectedKeywords.has(kw._id)
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                    : 'bg-[#001a2c]/60 border-[#4A90C2]/20 hover:border-[#4A90C2]/40'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelection(kw._id)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    selectedKeywords.has(kw._id)
                      ? 'bg-[#D4AF37] border-[#D4AF37]'
                      : 'border-[#4A90C2]/50 hover:border-[#D4AF37]/50'
                  )}
                >
                  {selectedKeywords.has(kw._id) && (
                    <svg className="w-3 h-3 text-[#001a2c]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}
                </button>

                {/* Word */}
                <span className="font-mono font-bold text-white min-w-[60px]">
                  {kw.word}
                </span>

                {/* Prophet */}
                <span className="text-[#D4AF37] text-xs bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                  {kw.prophetId}
                </span>

                {/* Clue */}
                <span className="flex-1 text-[#8fc1e3] text-sm truncate" title={kw.clue}>
                  {kw.clue}
                </span>

                {/* Relevance */}
                <span className="text-[#6ba8d4] text-xs">
                  {kw.relevance}%
                </span>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApprove(kw._id)}
                    className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(kw._id)}
                    className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
