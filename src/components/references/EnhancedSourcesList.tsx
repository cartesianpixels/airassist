"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  EyeOff,
  Zap,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedSourceCard } from "./EnhancedSourceCard";

interface EnhancedSource {
  id: string;
  title?: string;
  display_name?: string;
  name?: string;
  content?: string;
  document_type?: string;
  source_type?: string;
  metadata?: any;
  similarity?: number;
  content_topic?: string;
  semantic_focus?: string;
  keywords?: string[];
  parent_document_id?: string;
  resources?: Array<{
    title: string;
    url: string;
  }>;
}

interface EnhancedSourcesListProps {
  sources: EnhancedSource[];
  title?: string;
  variant?: 'default' | 'compact' | 'collapsible' | 'detailed';
  groupByTopic?: boolean;
  showSimilarity?: boolean;
  showContent?: boolean;
  maxSources?: number;
  sortBy?: 'similarity' | 'title' | 'topic';
  sortOrder?: 'asc' | 'desc';
}

type SortOption = 'similarity' | 'title' | 'topic';
type ViewMode = 'grid' | 'list';

const getTopicDisplayName = (topic: string): string => {
  if (!topic) return 'General';

  return topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getTopicIcon = (topic: string) => {
  const topicLower = topic?.toLowerCase() || '';

  if (topicLower.includes('wake') || topicLower.includes('turbulence')) {
    return <Zap className="w-4 h-4 text-red-500" />;
  }
  if (topicLower.includes('separation') || topicLower.includes('minima')) {
    return <Target className="w-4 h-4 text-orange-500" />;
  }
  return <BookOpen className="w-4 h-4 text-blue-500" />;
};

const getTopicPriority = (topic: string): number => {
  const topicLower = topic?.toLowerCase() || '';

  if (topicLower.includes('wake') || topicLower.includes('turbulence')) return 10;
  if (topicLower.includes('separation') || topicLower.includes('minima')) return 9;
  if (topicLower.includes('approach')) return 8;
  if (topicLower.includes('departure')) return 7;
  if (topicLower.includes('emergency')) return 6;
  return 5;
};

export function EnhancedSourcesList({
  sources,
  title = "Sources & References",
  variant = 'default',
  groupByTopic = true,
  showSimilarity = true,
  showContent = false,
  maxSources,
  sortBy = 'similarity',
  sortOrder = 'desc'
}: EnhancedSourcesListProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentSortBy, setCurrentSortBy] = React.useState<SortOption>(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = React.useState<'asc' | 'desc'>(sortOrder);
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [showContentPreview, setShowContentPreview] = React.useState(showContent);
  const [topicFilter, setTopicFilter] = React.useState<string>('all');

  if (!sources || sources.length === 0) {
    return null;
  }

  // Normalize sources and apply filtering
  const normalizedSources = sources.map(source => ({
    ...source,
    title: source.display_name || source.title || source.name || 'Untitled',
    topic: source.content_topic || source.semantic_focus || source.document_type || source.source_type || 'general',
    similarity: source.similarity || 0
  }));

  // Apply topic filter
  const filteredSources = topicFilter === 'all'
    ? normalizedSources
    : normalizedSources.filter(source => source.topic === topicFilter);

  // Sort sources
  const sortedSources = [...filteredSources].sort((a, b) => {
    let comparison = 0;

    switch (currentSortBy) {
      case 'similarity':
        comparison = (b.similarity || 0) - (a.similarity || 0);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'topic':
        const topicA = getTopicPriority(a.topic);
        const topicB = getTopicPriority(b.topic);
        comparison = topicB - topicA;
        break;
    }

    return currentSortOrder === 'desc' ? comparison : -comparison;
  });

  // Apply max sources limit
  const displaySources = maxSources ? sortedSources.slice(0, maxSources) : sortedSources;

  // Group by topic if enabled
  const groupedSources = groupByTopic
    ? displaySources.reduce((groups, source) => {
        const topic = source.topic;
        if (!groups[topic]) {
          groups[topic] = [];
        }
        groups[topic].push(source);
        return groups;
      }, {} as Record<string, typeof displaySources>)
    : { 'All Sources': displaySources };

  // Get unique topics for filter
  const uniqueTopics = Array.from(new Set(normalizedSources.map(s => s.topic)))
    .sort((a, b) => getTopicPriority(b) - getTopicPriority(a));

  const handleSort = (newSortBy: SortOption) => {
    if (currentSortBy === newSortBy) {
      setCurrentSortOrder(currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCurrentSortBy(newSortBy);
      setCurrentSortOrder('desc');
    }
  };

  // Statistics
  const avgSimilarity = displaySources.length > 0
    ? displaySources.reduce((sum, s) => sum + (s.similarity || 0), 0) / displaySources.length
    : 0;

  const highRelevanceCount = displaySources.filter(s => (s.similarity || 0) >= 0.8).length;

  if (variant === 'collapsible') {
    return (
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary">{displaySources.length}</Badge>
                      {avgSimilarity > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Avg: {(avgSimilarity * 100).toFixed(1)}%
                        </Badge>
                      )}
                      {highRelevanceCount > 0 && (
                        <Badge variant="outline" className="text-xs text-emerald-600">
                          {highRelevanceCount} high relevance
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription>
                Click to view {displaySources.length} sources with detailed information and content previews
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  {/* Topic Filter */}
                  {uniqueTopics.length > 1 && (
                    <div className="flex items-center space-x-1">
                      <Filter className="w-4 h-4" />
                      <select
                        value={topicFilter}
                        onChange={(e) => setTopicFilter(e.target.value)}
                        className="text-sm bg-background border rounded px-2 py-1"
                      >
                        <option value="all">All Topics</option>
                        {uniqueTopics.map(topic => (
                          <option key={topic} value={topic}>
                            {getTopicDisplayName(topic)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sort Controls */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant={currentSortBy === 'similarity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSort('similarity')}
                      className="text-xs h-8"
                    >
                      Relevance
                      {currentSortBy === 'similarity' && (
                        currentSortOrder === 'desc' ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                    <Button
                      variant={currentSortBy === 'topic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSort('topic')}
                      className="text-xs h-8"
                    >
                      Topic
                      {currentSortBy === 'topic' && (
                        currentSortOrder === 'desc' ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Content Preview Toggle */}
                  <Button
                    variant={showContentPreview ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowContentPreview(!showContentPreview)}
                    className="text-xs h-8"
                  >
                    {showContentPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>

                  {/* View Mode Toggle */}
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="text-xs h-8"
                  >
                    <Grid className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="text-xs h-8"
                  >
                    <List className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Sources */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${topicFilter}-${currentSortBy}-${currentSortOrder}-${viewMode}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {Object.entries(groupedSources).map(([topic, topicSources]) => (
                    <div key={topic} className="mb-6 last:mb-0">
                      {groupByTopic && Object.keys(groupedSources).length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center space-x-2 mb-3 pb-2 border-b"
                        >
                          {getTopicIcon(topic)}
                          <h4 className="text-sm font-semibold text-foreground">
                            {getTopicDisplayName(topic)}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {topicSources.length}
                          </Badge>
                          {topicSources.some(s => s.similarity) && (
                            <Badge variant="outline" className="text-xs">
                              Avg: {(topicSources.reduce((sum, s) => sum + (s.similarity || 0), 0) / topicSources.length * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </motion.div>
                      )}

                      <div className={cn(
                        "space-y-3",
                        viewMode === 'grid' && "grid gap-3 md:grid-cols-2 lg:grid-cols-3 space-y-0"
                      )}>
                        {topicSources.map((source, index) => (
                          <EnhancedSourceCard
                            key={source.id}
                            source={source}
                            variant={variant === 'collapsible' && viewMode === 'list' ? 'compact' : 'default'}
                            showSimilarity={showSimilarity}
                            showContent={showContentPreview}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {maxSources && sortedSources.length > maxSources && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {maxSources} of {sortedSources.length} sources
                    <span className="ml-2 text-xs">
                      ({sortedSources.length - maxSources} more available)
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{displaySources.length}</Badge>
              {avgSimilarity > 0 && (
                <Badge variant="outline" className="text-xs">
                  Avg: {(avgSimilarity * 100).toFixed(1)}%
                </Badge>
              )}
              {highRelevanceCount > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-600">
                  {highRelevanceCount} high relevance
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant={showContentPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowContentPreview(!showContentPreview)}
          >
            {showContentPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-4">
        {Object.entries(groupedSources).map(([topic, topicSources]) => (
          <div key={topic} className="space-y-3">
            {groupByTopic && Object.keys(groupedSources).length > 1 && (
              <div className="flex items-center space-x-2 pb-2 border-b">
                {getTopicIcon(topic)}
                <h4 className="text-md font-medium text-foreground">
                  {getTopicDisplayName(topic)}
                </h4>
                <Badge variant="secondary">{topicSources.length}</Badge>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topicSources.map((source, index) => (
                <EnhancedSourceCard
                  key={source.id}
                  source={source}
                  variant="default"
                  showSimilarity={showSimilarity}
                  showContent={showContentPreview}
                  index={index}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}