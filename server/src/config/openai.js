import OpenAI from 'openai';

/**
 * Create an OpenAI client with the provided API key
 * @param {string} apiKey - The OpenAI API key from the request
 * @returns {OpenAI} - OpenAI client instance
 */
const createOpenAIClient = (apiKey) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Please add your API key in Settings.');
  }
  return new OpenAI({ apiKey });
};

export default createOpenAIClient;
