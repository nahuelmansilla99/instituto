ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS "quizAnswers" JSONB; 
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0;

-- Campos para extracción de texto en documentos y notas de presentación
ALTER TABLE lesson_documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE technical_sheets ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_notes TEXT;

-- Tabla de historial y control de cuota de IA
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_course_created 
ON ai_chat_messages (user_id, course_id, created_at);
