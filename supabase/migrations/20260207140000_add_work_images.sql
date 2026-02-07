-- Add work_images table for multi-image support
CREATE TABLE work_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  image_url text NOT NULL,
  width int,
  height int,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index for work_id lookups
CREATE INDEX idx_work_images_work_id ON work_images(work_id);

-- Add index for ordering
CREATE INDEX idx_work_images_work_id_order ON work_images(work_id, display_order);

-- Enable RLS
ALTER TABLE work_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read" ON work_images FOR SELECT USING (true);

CREATE POLICY "Owner insert" ON work_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_id
    AND works.author_id = auth.uid()
  ));

CREATE POLICY "Owner delete" ON work_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_id
    AND works.author_id = auth.uid()
  ));
