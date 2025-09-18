"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  FileText,
  Building,
  Globe,
  BookOpen,
  Eye,
  Copy,
  ExternalLink,
  Info,
  Hash,
  MapPin,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EnhancedSource {
  id: string;
  title: string;
  content?: string;
  document_type?: string;
  metadata?: any;
  similarity?: number;
  content_topic?: string;
  semantic_focus?: string;
  keywords?: string[];
  parent_document_id?: string;
  display_name?: string;
  // Legacy fields for compatibility
  name?: string;
  source_type?: string;
  document_name?: string;
  resources?: Array<{
    title: string;
    url: string;
  }>;
}

interface EnhancedSourceCardProps {
  source: EnhancedSource;
  variant?: 'default' | 'compact' | 'detailed';
  showSimilarity?: boolean;
  showContent?: boolean;
  index?: number;
}

const getSourceIcon = (type: string) => {
  const iconType = type?.toLowerCase() || '';

  if (iconType.includes('chapter') || iconType.includes('section')) {
    return <BookOpen className="w-4 h-4" />;
  }
  if (iconType.includes('wake') || iconType.includes('turbulence')) {
    return <Zap className="w-4 h-4" />;
  }
  if (iconType.includes('separation') || iconType.includes('minima')) {
    return <Target className="w-4 h-4" />;
  }
  if (iconType.includes('regulatory') || iconType.includes('authority')) {
    return <Building className="w-4 h-4" />;
  }
  if (iconType.includes('database') || iconType.includes('knowledge')) {
    return <Globe className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
};

const getTopicColor = (topic: string) => {
  const topicLower = topic?.toLowerCase() || '';

  if (topicLower.includes('wake') || topicLower.includes('turbulence')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
  }
  if (topicLower.includes('separation') || topicLower.includes('minima')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  }
  if (topicLower.includes('approach') || topicLower.includes('departure')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }
  if (topicLower.includes('emergency') || topicLower.includes('priority')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800';
};

const getSimilarityColor = (similarity: number) => {
  if (similarity >= 0.85) return 'text-emerald-600 dark:text-emerald-400';
  if (similarity >= 0.75) return 'text-blue-600 dark:text-blue-400';
  if (similarity >= 0.65) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-slate-600 dark:text-slate-400';
};

const smartTruncate = (text: string, maxLength: number = 150): { truncated: string; hasMore: boolean } => {
  if (!text || text.length <= maxLength) {
    return { truncated: text || '', hasMore: false };
  }

  // Find the last complete sentence within the limit
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  // Use sentence boundary if available, otherwise word boundary
  const cutoff = lastSentence > maxLength * 0.7 ? lastSentence + 1 : lastSpace;

  return {
    truncated: cutoff > 0 ? text.substring(0, cutoff) : truncated,
    hasMore: true
  };
};

const formatChapterSection = (title: string): { chapter: string; section: string; displayTitle: string } => {
  // Extract chapter and section information
  const chapterMatch = title.match(/Chapter\s+(\d+)/i);
  const sectionMatch = title.match(/Section\s+(\d+)/i);

  let chapter = '';
  let section = '';
  let displayTitle = title;

  if (chapterMatch) {
    chapter = `Ch. ${chapterMatch[1]}`;
    if (sectionMatch) {
      section = `§${sectionMatch[1]}`;
      displayTitle = title.replace(/Chapter\s+\d+\s*-?\s*Section\s+\d+/i, '').trim();
      if (!displayTitle) {
        displayTitle = `Chapter ${chapterMatch[1]}, Section ${sectionMatch[1]}`;
      }
    } else {
      displayTitle = title.replace(/Chapter\s+\d+/i, '').trim();
      if (!displayTitle) {
        displayTitle = `Chapter ${chapterMatch[1]}`;
      }
    }
  }

  return { chapter, section, displayTitle };
};

export function EnhancedSourceCard({
  source,
  variant = 'default',
  showSimilarity = true,
  showContent = false,
  index = 0
}: EnhancedSourceCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Normalize source data from different formats
  const title = source.display_name || source.title || source.name || 'Untitled';
  const type = source.document_type || source.source_type || 'document';
  const topic = source.content_topic || source.semantic_focus || type;
  const similarity = source.similarity || 0;
  const content = source.content || '';
  const keywords = source.keywords || [];

  const { chapter, section, displayTitle } = formatChapterSection(title);
  const { truncated, hasMore } = smartTruncate(content, 200);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        description: "Source content copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        description: "Failed to copy content",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleCopyReference = async () => {
    const reference = `${title}${similarity ? ` (Similarity: ${(similarity * 100).toFixed(1)}%)` : ''}`;
    try {
      await navigator.clipboard.writeText(reference);
      toast({
        description: "Reference copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        description: "Failed to copy reference",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="group flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getSourceIcon(topic)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      {chapter && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {chapter}
                        </Badge>
                      )}
                      {section && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {section}
                        </Badge>
                      )}
                      {showSimilarity && similarity > 0 && (
                        <span className={cn("text-xs font-medium", getSimilarityColor(similarity))}>
                          {(similarity * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-foreground truncate mt-1">
                      {displayTitle}
                    </p>

                    {topic && (
                      <Badge
                        variant="secondary"
                        className={cn("text-xs mt-1", getTopicColor(topic))}
                      >
                        {topic.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyReference();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>

                  {source.resources && source.resources.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0"
                    >
                      <a
                        href={source.resources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </TooltipTrigger>

            <TooltipContent side="bottom" className="max-w-md p-4">
              <div className="space-y-2">
                <div className="font-medium">{title}</div>

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keywords.slice(0, 5).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}

                {content && (
                  <div className="text-sm text-muted-foreground border-t pt-2">
                    {truncated}
                    {hasMore && <span className="text-primary"> ...</span>}
                  </div>
                )}

                {similarity > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Relevance Score: <span className={getSimilarityColor(similarity)}>
                      {(similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="flex-shrink-0 text-muted-foreground">
                {getSourceIcon(topic)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {chapter && (
                    <Badge variant="outline" className="text-xs font-mono">
                      <Hash className="w-3 h-3 mr-1" />
                      {chapter}
                    </Badge>
                  )}
                  {section && (
                    <Badge variant="outline" className="text-xs font-mono">
                      <MapPin className="w-3 h-3 mr-1" />
                      {section}
                    </Badge>
                  )}
                  {showSimilarity && similarity > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getSimilarityColor(similarity))}
                    >
                      <Target className="w-3 h-3 mr-1" />
                      {(similarity * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>

                <h4 className="font-medium text-foreground leading-tight">
                  {displayTitle}
                </h4>
              </div>
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyReference}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy reference</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {content && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyContent}
                        className="h-8 w-8 p-0"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy content</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Topic and Keywords */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {topic && (
              <Badge
                variant="secondary"
                className={cn("text-xs", getTopicColor(topic))}
              >
                {topic.replace(/_/g, ' ')}
              </Badge>
            )}

            {keywords.slice(0, 3).map((keyword, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}

            {keywords.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      +{keywords.length - 3} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {keywords.slice(3).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Content Preview */}
          {(showContent || variant === 'detailed') && content && (
            <div className="mt-3 p-3 bg-muted/30 rounded-md">
              <div className="text-sm text-muted-foreground">
                {isExpanded ? content : truncated}
                {hasMore && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-0 h-auto text-primary ml-1"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Resources */}
          {source.resources && source.resources.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex flex-wrap gap-2">
                {source.resources.map((resource, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 text-xs"
                  >
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">
                        {resource.title}
                      </span>
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}