/**
 * SSE (Server-Sent Events) utilities for streaming responses
 */

/**
 * Setup SSE response headers
 */
export const setupSSE = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
};

/**
 * Send an SSE event
 */
export const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Handle SSE errors - sends error event and ends response
 */
export const handleSSEError = (res, error, next) => {
  console.error('Streaming error:', error);
  if (!res.headersSent) {
    return next(error);
  }
  sendSSE(res, 'error', { message: error.message });
  res.end();
};

/**
 * Process a streaming generator and send SSE events
 * @param {Response} res - Express response object
 * @param {AsyncGenerator} generator - The streaming generator
 * @returns {Promise<any>} - The final result from the generator
 */
export const streamGenerator = async (res, generator) => {
  let result;
  for await (const chunk of generator) {
    if (chunk.type === 'chunk') {
      sendSSE(res, 'chunk', { content: chunk.content });
    } else if (chunk.type === 'complete') {
      result = chunk.data;
    }
  }
  return result;
};
