import createOpenAIClient from '../config/openai.js';
import { buildQuestionGenerationPrompt, buildRegenerateQuestionPrompt, buildRegenerateAnswerPrompt } from '../utils/prompts.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';

const SYSTEM_PROMPT = 'You are an expert assessment creator. Always respond with valid JSON only, no additional text or markdown.';

const parseJsonResponse = (content) => {
  if (!content || content.trim() === '') {
    throw new Error('Empty response from OpenAI');
  }

  // Try to extract JSON from the response (in case there's extra text)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse JSON match:', jsonMatch[0]);
      throw new Error(`Invalid JSON in response: ${e.message}`);
    }
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse response:', content);
    throw new Error(`Invalid JSON response: ${e.message}`);
  }
};

// Streaming version - yields chunks and returns final parsed result
export const generateQuestionsStream = async function* (config, referenceText, customPrompt, apiKey) {
  const openai = createOpenAIClient(apiKey);
  const prompt = buildQuestionGenerationPrompt(config, referenceText, customPrompt);

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 8000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        yield { type: 'chunk', content: delta };
      }
    }

    if (!fullContent) {
      throw new Error('OpenAI returned an empty response');
    }

    const parsed = parseJsonResponse(fullContent);

    yield {
      type: 'complete',
      data: {
        questions: parsed.questions,
        metadata: {
          model: MODEL,
          tokensUsed: 0, // Not available in streaming mode
        },
      },
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
};

// Streaming version for regenerating a question
export const regenerateQuestionStream = async function* (originalQuestion, referenceText, questionType, customPrompt, apiKey) {
  const openai = createOpenAIClient(apiKey);
  const prompt = buildRegenerateQuestionPrompt(originalQuestion, referenceText, questionType, customPrompt);

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        yield { type: 'chunk', content: delta };
      }
    }

    if (!fullContent) {
      throw new Error('OpenAI returned an empty response');
    }

    const parsed = parseJsonResponse(fullContent);
    yield { type: 'complete', data: parsed };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to regenerate question: ${error.message}`);
  }
};

// Streaming version for regenerating an answer
export const regenerateAnswerStream = async function* (questionText, options, answerIndex, isCorrect, customPrompt, referenceText, apiKey) {
  const openai = createOpenAIClient(apiKey);
  const prompt = buildRegenerateAnswerPrompt(questionText, options, answerIndex, isCorrect, customPrompt, referenceText);

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        yield { type: 'chunk', content: delta };
      }
    }

    if (!fullContent) {
      throw new Error('OpenAI returned an empty response');
    }

    const parsed = parseJsonResponse(fullContent);
    yield { type: 'complete', data: parsed };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to regenerate answer: ${error.message}`);
  }
};
