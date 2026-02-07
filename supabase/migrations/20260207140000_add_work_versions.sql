-- Add work_versions table for iteration history

CREATE TABLE work_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,

  -- Version metadata
  version_number INTEGER NOT NULL,  -- 1 (oldest) → N-1 (current work is conceptually version N)
  title TEXT NOT NULL,              -- Version title (can differ from main work)
  notes TEXT,                       -- Optional user notes about this iteration

  -- Content (matches parent work_type)
  -- For image versions
  image_path TEXT,
  image_url TEXT,
  width INTEGER,
  height INTEGER,
  -- For essay versions
  content TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(work_id, version_number),

  -- Ensure content matches work type
  CHECK (
    (image_path IS NOT NULL AND image_url IS NOT NULL) OR
    (content IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_work_versions_work_id ON work_versions(work_id, version_number);
CREATE INDEX idx_work_versions_created_at ON work_versions(created_at DESC);

-- Enable RLS
ALTER TABLE work_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view work versions"
  ON work_versions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert versions for their own works"
  ON work_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_versions.work_id
      AND works.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own work versions"
  ON work_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_versions.work_id
      AND works.author_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON work_versions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
