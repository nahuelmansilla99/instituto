ALTER TABLE user_progress ADD COLUMN "quizAnswers" JSONB; ALTER TABLE user_progress ADD COLUMN attempts_count INTEGER DEFAULT 0;
