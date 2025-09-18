'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CitationCardProps {
  citation: {
    title: string;
    source: string;
    chapter?: string;
    section?: string;
    url?: string;
    type?: string;
  };
  variant?: 'default' | 'inline';
}

export function CitationCard({ citation, variant = 'default' }: CitationCardProps) {
  const formatCitation = () => {
    let formatted = citation.source;
    if (citation.chapter) {
      formatted += `, Chapter ${citation.chapter}`;
    }
    if (citation.section) {
      formatted += `, Section ${citation.section}`;
    }
    if (citation.title) {
      formatted += `, ${citation.title}`;
    }
    return formatted;
  };

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(formatCitation());
      toast({
        title: "Citation copied",
        description: "Citation has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy citation to clipboard",
        variant: "destructive",
      });
    }
  };

  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center space-x-2 p-2 bg-muted/50 rounded-md border">
        <FileText className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium">{formatCitation()}</span>
        {citation.url && (
          <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyCitation}
          className="h-6 w-6 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>{citation.title || 'Citation'}</span>
          </CardTitle>
          {citation.type && (
            <Badge variant="outline">{citation.type}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
            {formatCitation()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCitation}
              className="flex items-center space-x-1"
            >
              <Copy className="h-3 w-3" />
              <span>Copy Citation</span>
            </Button>
            {citation.url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View Source</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}