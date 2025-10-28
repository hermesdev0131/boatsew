-- Create message_reads table to track which messages have been read by which users
CREATE TABLE IF NOT EXISTS message_reads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  last_read_message_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_reads_user_order ON message_reads(user_id, order_id);

-- Add RLS policies
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own read tracking data
CREATE POLICY "Users can view their own read tracking"
  ON message_reads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own read tracking data
CREATE POLICY "Users can insert their own read tracking"
  ON message_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own read tracking data
CREATE POLICY "Users can update their own read tracking"
  ON message_reads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own read tracking data
CREATE POLICY "Users can delete their own read tracking"
  ON message_reads
  FOR DELETE
  USING (auth.uid() = user_id);
