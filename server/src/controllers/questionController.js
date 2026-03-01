import Question from '../models/Question.js';
import Assessment from '../models/Assessment.js';
import { generateQuestionsStream, regenerateQuestionStream, regenerateAnswerStream } from '../services/openaiService.js';
import * as ragService from '../services/ragService.js';
import { setupSSE, sendSSE, handleSSEError, streamGenerator } from '../utils/sse.js';
import { RAG_ENABLED } from '../config/constants.js';

/**
 * Get reference text from a single document
 * Uses RAG to retrieve relevant context if available, otherwise falls back to full text
 */
const getDocumentText = async (referenceDocument, config, customPrompt) => {
  if (RAG_ENABLED && referenceDocument?.ragStatus === 'ready' && referenceDocument?.ragFileId) {
    try {
      const query = customPrompt ? `${customPrompt}. ${ragService.buildContextQuery(config)}` : ragService.buildContextQuery(config);

      const context = await ragService.getRelevantContext(referenceDocument.ragFileId, query, 10);

      if (context?.length > 0) {
        console.log(`Using RAG context (${context.length} chars) instead of full document (${referenceDocument.textContent.length} chars)`);
        return context;
      }
    } catch (error) {
      console.warn('RAG retrieval failed, falling back to full text:', error.message);
    }
  }

  return referenceDocument?.textContent || '';
};

/**
 * Get combined reference text from multiple documents
 */
const getReferenceText = async (referenceDocuments, config, customPrompt) => {
  if (!referenceDocuments || referenceDocuments.length === 0) {
    return '';
  }

  const texts = await Promise.all(referenceDocuments.map((doc) => getDocumentText(doc, config, customPrompt)));

  if (texts.length === 1) {
    return texts[0];
  }

  return texts
    .map((text, i) => {
      const doc = referenceDocuments[i];
      const title = doc.file?.originalName || `Document ${i + 1}`;
      return `--- ${title} ---\n${text}`;
    })
    .join('\n\n');
};

// Ensure options always have an id field
const normalizeOptions = (options) => {
  if (!options || !Array.isArray(options)) return [];
  return options.map((opt, index) => ({
    id: opt.id || String.fromCharCode(97 + index),
    text: opt.text || '',
    isCorrect: opt.isCorrect || false,
  }));
};

/**
 * Fetch assessment with reference documents populated
 */
const getAssessmentWithRef = (assessmentId) => {
  return Assessment.findById(assessmentId).populate('referenceDocuments');
};

/**
 * Fetch question with full assessment context
 */
const getQuestionWithContext = async (questionId) => {
  const question = await Question.findById(questionId);
  if (!question) return { question: null, assessment: null };

  const assessment = await Assessment.findById(question.assessment).populate('referenceDocuments');
  return { question, assessment };
};

/**
 * Create questions from AI result and save to assessment
 */
const saveGeneratedQuestions = async (assessmentId, result, assessment) => {
  await Question.deleteMany({ assessment: assessmentId });

  const questions = await Promise.all(
    result.questions.map((q, index) =>
      Question.create({
        assessment: assessmentId,
        order: index + 1,
        type: q.type,
        questionText: q.questionText,
        options: normalizeOptions(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }),
    ),
  );

  assessment.questions = questions.map((q) => q._id);
  assessment.metadata.generatedAt = new Date();
  assessment.metadata.generationModel = result.metadata.model;
  await assessment.save();

  return questions;
};

/**
 * Apply regenerated question data to existing question
 */
const applyRegeneratedQuestion = async (question, newQuestionData, assessmentId) => {
  question.questionText = newQuestionData.questionText;
  question.options = normalizeOptions(newQuestionData.options);
  question.correctAnswer = newQuestionData.correctAnswer;
  question.explanation = newQuestionData.explanation;
  question.regenerationCount += 1;
  question.isManuallyEdited = false;

  await question.save();
  await Assessment.findByIdAndUpdate(assessmentId, {
    $inc: { 'metadata.totalRegenerations': 1 },
  });

  return question;
};

/**
 * Apply regenerated answer to question option
 */
const applyRegeneratedAnswer = async (question, answerIndex, newText, assessmentId) => {
  const currentOpt = question.options[answerIndex];
  question.options[answerIndex] = {
    id: currentOpt.id || String.fromCharCode(97 + answerIndex),
    text: newText,
    isCorrect: currentOpt.isCorrect,
  };
  question.regenerationCount += 1;

  await question.save();
  await Assessment.findByIdAndUpdate(assessmentId, {
    $inc: { 'metadata.totalRegenerations': 1 },
  });

  return question;
};

// ==================== STREAMING ENDPOINTS ====================

export const generateQuestionsStreaming = async (req, res, next) => {
  try {
    const { assessmentId, prompt } = req.body;
    const apiKey = req.headers['x-openai-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'OpenAI API key is required. Please add your API key in Settings.' });
    }
    
    const assessment = await getAssessmentWithRef(assessmentId);

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    setupSSE(res);

    const referenceText = assessment.referenceDocuments?.length
      ? await getReferenceText(assessment.referenceDocuments, assessment.configuration, prompt)
      : '';
    const result = await streamGenerator(res, generateQuestionsStream(assessment.configuration, referenceText, prompt, apiKey));
    const questions = await saveGeneratedQuestions(assessmentId, result, assessment);

    sendSSE(res, 'complete', { questions, metadata: result.metadata });
    res.end();
  } catch (error) {
    handleSSEError(res, error, next);
  }
};

export const regenerateQuestionStreaming = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const apiKey = req.headers['x-openai-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'OpenAI API key is required. Please add your API key in Settings.' });
    }
    
    const { question, assessment } = await getQuestionWithContext(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    setupSSE(res);

    const referenceText = await getReferenceText(assessment?.referenceDocuments, assessment?.configuration, question.questionText);
    const newQuestion = await streamGenerator(res, regenerateQuestionStream(question.questionText, referenceText, question.type, prompt, apiKey));
    await applyRegeneratedQuestion(question, newQuestion, assessment._id);

    sendSSE(res, 'complete', { question });
    res.end();
  } catch (error) {
    handleSSEError(res, error, next);
  }
};

export const regenerateAnswerStreaming = async (req, res, next) => {
  try {
    const { answerIndex, prompt } = req.body;
    const apiKey = req.headers['x-openai-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'OpenAI API key is required. Please add your API key in Settings.' });
    }
    
    const { question, assessment } = await getQuestionWithContext(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    if (question.type !== 'multiple_choice') {
      return res.status(400).json({ success: false, error: 'Can only regenerate answers for multiple choice questions' });
    }
    if (answerIndex < 0 || answerIndex >= question.options.length) {
      return res.status(400).json({ success: false, error: 'Invalid answer index' });
    }

    setupSSE(res);

    const referenceText = await getReferenceText(assessment?.referenceDocuments, assessment?.configuration, question.questionText);
    const currentOption = question.options[answerIndex];
    const result = await streamGenerator(
      res,
      regenerateAnswerStream(question.questionText, question.options, answerIndex, currentOption.isCorrect, prompt, referenceText, apiKey),
    );
    await applyRegeneratedAnswer(question, answerIndex, result.text, assessment._id);

    sendSSE(res, 'complete', { question });
    res.end();
  } catch (error) {
    handleSSEError(res, error, next);
  }
};

// ==================== CRUD ENDPOINTS ====================

export const updateQuestion = async (req, res, next) => {
  try {
    const { questionText, options, correctAnswer, explanation } = req.body;
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    if (questionText) question.questionText = questionText;
    if (options) question.options = normalizeOptions(options);
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (explanation !== undefined) question.explanation = explanation;
    question.isManuallyEdited = true;

    await question.save();

    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    await Assessment.findByIdAndUpdate(question.assessment, {
      $pull: { questions: question._id },
    });

    await question.deleteOne();

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};
