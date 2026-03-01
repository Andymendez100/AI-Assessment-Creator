import express from 'express';
import {
  generateQuestionsStreaming,
  regenerateQuestionStreaming,
  regenerateAnswerStreaming,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';

const router = express.Router();

// Streaming endpoints (SSE)
router.post('/generate/stream', generateQuestionsStreaming);
router.post('/:id/regenerate/stream', regenerateQuestionStreaming);
router.post('/:id/regenerate-answer/stream', regenerateAnswerStreaming);

// CRUD endpoints
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
