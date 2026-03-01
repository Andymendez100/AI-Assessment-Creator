import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Unwrap { success, data } responses automatically
api.interceptors.response.use((response) => {
  if (response.data && response.data.data !== undefined) {
    response.data = response.data.data
  }
  return response
})

// Helper function for SSE streaming requests
const createStreamingRequest = (url, body, onChunk, onComplete, onError) => {
  const controller = new AbortController()

  fetch(`/api${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stream request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let currentEvent = null

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))

              if (currentEvent === 'chunk' && onChunk) {
                onChunk(data.content)
              } else if (currentEvent === 'complete' && onComplete) {
                onComplete(data)
              } else if (currentEvent === 'error' && onError) {
                onError(new Error(data.message))
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
            currentEvent = null
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError' && onError) {
        onError(error)
      }
    })

  // Return abort function
  return () => controller.abort()
}

export const assessmentApi = {
  getAll: () => api.get('/assessments'),
  getById: (id) => api.get(`/assessments/${id}`),
  create: (data) => api.post('/assessments', data),
  delete: (id) => api.delete(`/assessments/${id}`),
  publish: (id) => api.patch(`/assessments/${id}/publish`),
  generateQuestionsStream: (id, prompt, onChunk, onComplete, onError) =>
    createStreamingRequest('/questions/generate/stream', { assessmentId: id, prompt }, onChunk, onComplete, onError),
}

export const questionApi = {
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
  regenerateStream: (id, prompt, onChunk, onComplete, onError) =>
    createStreamingRequest(`/questions/${id}/regenerate/stream`, { prompt }, onChunk, onComplete, onError),
  regenerateAnswerStream: (id, answerIndex, prompt, onChunk, onComplete, onError) =>
    createStreamingRequest(`/questions/${id}/regenerate-answer/stream`, { answerIndex, prompt }, onChunk, onComplete, onError),
}

export const uploadApi = {
  file: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  files: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return api.post('/upload/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  text: (text) => api.post('/upload/text', { text }),
  getRagStatus: (id) => api.get(`/upload/${id}/rag-status`),
}

export default api
