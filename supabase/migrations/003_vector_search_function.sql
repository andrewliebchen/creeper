-- Create RPC function for vector similarity search
-- This function searches document_chunks by embedding similarity

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    dc.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR d.user_id = user_id_filter)
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create similar function for meeting snippets if needed
CREATE OR REPLACE FUNCTION match_meeting_snippets(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  transcript text,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.transcript,
    1 - (ms.embedding <=> query_embedding) AS similarity,
    ms.created_at
  FROM meeting_snippets ms
  WHERE
    ms.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR ms.user_id = user_id_filter)
    AND (1 - (ms.embedding <=> query_embedding)) >= match_threshold
  ORDER BY ms.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

