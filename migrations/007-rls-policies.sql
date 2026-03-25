-- Migration 007: Row Level Security policies
-- Apply after enabling Supabase Auth.
-- The service_role key bypasses RLS by default — use it only in the backend API.

-- ============================================================
-- clients_final
-- ============================================================

ALTER TABLE clients_final ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own client row
CREATE POLICY "Users can view own client" ON clients_final
  FOR SELECT USING (user_id = auth.uid());

-- Policy: users can only update their own client row
CREATE POLICY "Users can update own client" ON clients_final
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- rag_documents
-- ============================================================

ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own documents
CREATE POLICY "Users can view own documents" ON rag_documents
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM clients_final WHERE user_id = auth.uid())
  );

-- Policy: users can insert their own documents
CREATE POLICY "Users can insert own documents" ON rag_documents
  FOR INSERT WITH CHECK (
    client_id IN (SELECT client_id FROM clients_final WHERE user_id = auth.uid())
  );

-- Policy: users can delete their own documents
CREATE POLICY "Users can delete own documents" ON rag_documents
  FOR DELETE USING (
    client_id IN (SELECT client_id FROM clients_final WHERE user_id = auth.uid())
  );

-- Service role bypasses RLS (for the API backend)
-- This is already the default in Supabase when using service_role key
