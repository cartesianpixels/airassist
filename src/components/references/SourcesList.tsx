'use client';

import { SourceCard } from './SourceCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface Source {
  id: string;
  name: string;
  document_name?: string;
  source_type: string;
  resources?: Array<{
    title: string;
    url: string;
  }>;
  metadata?: any;
}

interface SourcesListProps {
  sources: Source[];
  title?: string;
  variant?: 'default' | 'compact' | 'collapsible';
  groupByType?: boolean;
}

export function SourcesList({
  sources,
  title = "References",
  variant = 'default',
  groupByType = false
}: SourcesListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  const groupedSources = groupByType
    ? sources.reduce((groups, source) => {
        const type = source.source_type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(source);
        return groups;
      }, {} as Record<string, Source[]>)
    : { 'All Sources': sources };

  if (variant === 'collapsible') {
    return (
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <Badge variant="secondary">{sources.length}</Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
              <CardDescription>
                Click to view additional resources and citations
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {Object.entries(groupedSources).map(([type, typeSources]) => (
                  <div key={type} className="space-y-2">
                    {groupByType && Object.keys(groupedSources).length > 1 && (
                      <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                        {type}
                      </h4>
                    )}
                    {typeSources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        variant="compact"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary">{sources.length}</Badge>
        </div>
        <div className="space-y-2">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              variant="compact"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2">
        <BookOpen className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">{sources.length}</Badge>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedSources).map(([type, typeSources]) => (
          <div key={type} className="space-y-3">
            {groupByType && Object.keys(groupedSources).length > 1 && (
              <h4 className="text-md font-medium text-foreground border-b pb-2">
                {type}
              </h4>
            )}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {typeSources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}