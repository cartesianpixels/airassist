'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Globe, Building } from 'lucide-react';

interface SourceCardProps {
  source: {
    id: string;
    name: string;
    document_name?: string;
    source_type: string;
    resources?: Array<{
      title: string;
      url: string;
    }>;
    metadata?: any;
  };
  variant?: 'default' | 'compact';
}

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'Regulatory Authority':
      return <Building className="h-4 w-4" />;
    case 'Knowledge Base':
    case 'Database':
      return <Globe className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getSourceTypeColor = (sourceType: string) => {
  switch (sourceType) {
    case 'document':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'Regulatory Authority':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'Knowledge Base':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'Database':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export function SourceCard({ source, variant = 'default' }: SourceCardProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getSourceIcon(source.source_type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {source.name}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className={`text-xs ${getSourceTypeColor(source.source_type)}`}>
                {source.source_type}
              </Badge>
              {source.document_name && (
                <span className="text-xs text-muted-foreground">
                  {source.document_name}
                </span>
              )}
            </div>
          </div>
        </div>
        {source.resources && source.resources.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex-shrink-0"
          >
            <a
              href={source.resources[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getSourceIcon(source.source_type)}
            <CardTitle className="text-lg">{source.name}</CardTitle>
          </div>
          <Badge className={getSourceTypeColor(source.source_type)}>
            {source.source_type}
          </Badge>
        </div>
        {source.document_name && (
          <CardDescription className="text-sm text-muted-foreground">
            Document: {source.document_name}
          </CardDescription>
        )}
      </CardHeader>

      {source.resources && source.resources.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Resources:</h4>
            <div className="space-y-2">
              {source.resources.map((resource, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full justify-start"
                >
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{resource.title}</span>
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}