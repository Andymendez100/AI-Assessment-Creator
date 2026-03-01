/**
 * RAG Service Client
 * Handles communication with the RAG API for document processing and retrieval
 */

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout wrapper
 */
const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Upload a file to RAG service for async processing
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{id: string, status: string, filename: string, message: string}>}
 */
export const uploadFileAsync = async (fileBuffer, filename, mimeType) => {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, filename);

  const response = await fetchWithTimeout(
    `${RAG_API_URL}/api/v1/files/async`,
    { method: 'POST', body: formData },
    60000, // 60s for uploads
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Upload text content directly to RAG service
 * @param {string} textContent - The text content to process
 * @param {string} title - Title/name for the document
 * @returns {Promise<{id: string, status: string, filename: string, message: string}>}
 */
export const uploadTextAsync = async (textContent, title = 'pasted-text.txt') => {
  const formData = new FormData();
  const blob = new Blob([textContent], { type: 'text/plain' });
  formData.append('file', blob, title);

  const response = await fetchWithTimeout(
    `${RAG_API_URL}/api/v1/files/async`,
    { method: 'POST', body: formData },
    60000, // 60s for uploads
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Check the processing status of an uploaded file
 * @param {string} fileId - The file ID returned from upload
 * @returns {Promise<{id: string, filename: string, status: string, progress: number, message: string}>}
 */
export const getFileStatus = async (fileId) => {
  const response = await fetchWithTimeout(`${RAG_API_URL}/api/v1/files/${fileId}/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Status check failed' }));
    throw new Error(error.detail || `Status check failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Poll for file processing completion
 * Status values: uploading, pending, processing, completed, failed
 * @param {string} fileId - The file ID to poll
 * @param {number} maxAttempts - Maximum polling attempts (default: 60)
 * @param {number} intervalMs - Polling interval in ms (default: 2000)
 * @returns {Promise<{status: string}>}
 */
export const waitForProcessing = async (fileId, maxAttempts = 60, intervalMs = 2000) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getFileStatus(fileId);

    // RAG service uses 'completed' when done
    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed' || status.status === 'error') {
      throw new Error(status.message || status.error || 'File processing failed');
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('File processing timed out');
};

/**
 * Query RAG service for relevant document context
 * @param {string} fileId - The file ID (collection_name) to query
 * @param {string} query - The search query
 * @param {number} topK - Number of chunks to return (default: 20)
 * @returns {Promise<{context: string, collection_name: string, query_mode: string}>}
 */
export const queryDocument = async (fileId, query, topK = 20) => {
  const response = await fetchWithTimeout(`${RAG_API_URL}/api/v1/retrieval/query/doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection_name: fileId,
      query: query,
      k: topK,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Query failed' }));
    throw new Error(error.detail || `Query failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Query RAG service and return the context string
 * @param {string} fileId - The file ID to query
 * @param {string} query - The search query
 * @param {number} topK - Number of chunks to return
 * @returns {Promise<string>} - The context string from RAG service
 */
export const getRelevantContext = async (fileId, query, topK = 20) => {
  const result = await queryDocument(fileId, query, topK);

  // RAG service returns { context: "...", collection_name: "...", query_mode: "..." }
  // The context is already a formatted string
  if (!result.context || result.context.length === 0) {
    return '';
  }

  return result.context;
};

/**
 * Delete a file from RAG service
 * @param {string} fileId - The file ID to delete
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileId) => {
  const response = await fetchWithTimeout(`${RAG_API_URL}/api/v1/files/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(error.detail || `Delete failed with status ${response.status}`);
  }
};

/**
 * Build a context-aware query based on assessment configuration
 * @param {Object} config - Assessment configuration
 * @returns {string} - Query string for RAG retrieval
 */
export const buildContextQuery = (config) => {
  const { questionCount, questionType } = config;

  let query = 'Key concepts, main topics, important facts, definitions, and details';

  if (questionType === 'true_false') {
    query += ' that can be verified as true or false';
  } else if (questionType === 'multiple_choice') {
    query += ' suitable for multiple choice questions with distinct answer options';
  }

  query += `. Focus on ${questionCount} different aspects or topics from the material.`;

  return query;
};

export default {
  uploadFileAsync,
  uploadTextAsync,
  getFileStatus,
  waitForProcessing,
  queryDocument,
  getRelevantContext,
  deleteFile,
  buildContextQuery,
};
