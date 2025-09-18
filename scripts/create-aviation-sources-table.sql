-- Create aviation_sources table
CREATE TABLE IF NOT EXISTS public.aviation_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    document_name text,
    source_type text NOT NULL,
    resources jsonb,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT aviation_sources_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aviation_sources_name ON public.aviation_sources USING btree (name);
CREATE INDEX IF NOT EXISTS idx_aviation_sources_type ON public.aviation_sources USING btree (source_type);
CREATE INDEX IF NOT EXISTS idx_aviation_sources_document ON public.aviation_sources USING btree (document_name);
CREATE INDEX IF NOT EXISTS idx_aviation_sources_metadata ON public.aviation_sources USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_aviation_sources_resources ON public.aviation_sources USING gin (resources);

-- Create trigger for updated_at
CREATE TRIGGER update_aviation_sources_updated_at
    BEFORE UPDATE ON public.aviation_sources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();