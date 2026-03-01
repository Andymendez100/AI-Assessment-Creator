import { create } from 'zustand'
import { assessmentApi, questionApi, uploadApi } from '../api/client'

const useAssessmentStore = create((set, get) => ({
  assessments: [],
  currentAssessment: null,
  loading: false,
  error: null,
  streamingContent: '', // For showing streaming progress
  isStreaming: false,

  fetchAssessments: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await assessmentApi.getAll()
      set({ assessments: data || [], loading: false })
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch assessments', loading: false })
      throw error
    }
  },

  fetchAssessment: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await assessmentApi.getById(id)
      set({ currentAssessment: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to fetch assessment', loading: false })
      throw error
    }
  },

  createAssessment: async (assessmentData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await assessmentApi.create(assessmentData)
      set({ currentAssessment: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to create assessment', loading: false })
      throw error
    }
  },

  // Streaming version of generateQuestions
  generateQuestions: (assessmentId, prompt) => {
    return new Promise((resolve, reject) => {
      set({ loading: true, isStreaming: true, streamingContent: '', error: null })

      const abort = assessmentApi.generateQuestionsStream(
        assessmentId,
        prompt,
        // onChunk - called for each streamed chunk
        (content) => {
          set((state) => ({ streamingContent: state.streamingContent + content }))
        },
        // onComplete - called when generation is done
        (data) => {
          set((state) => ({
            currentAssessment: state.currentAssessment ? {
              ...state.currentAssessment,
              questions: data.questions,
            } : null,
            loading: false,
            isStreaming: false,
            streamingContent: '',
          }))
          resolve(data)
        },
        // onError - called if there's an error
        (error) => {
          set({
            error: error.message || 'Failed to generate questions',
            loading: false,
            isStreaming: false,
            streamingContent: '',
          })
          reject(error)
        }
      )

      // Store abort function for potential cancellation
      set({ abortStream: abort })
    })
  },

  publishAssessment: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await assessmentApi.publish(id)
      const currentAssessment = get().currentAssessment
      if (currentAssessment?._id === id) {
        set({ currentAssessment: data })
      }
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to publish assessment', loading: false })
      throw error
    }
  },

  deleteAssessment: async (id) => {
    set({ loading: true, error: null })
    try {
      await assessmentApi.delete(id)
      set((state) => ({
        assessments: state.assessments.filter((a) => a._id !== id),
        loading: false,
      }))
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to delete assessment', loading: false })
      throw error
    }
  },

  updateQuestion: async (questionId, data) => {
    set({ loading: true, error: null })
    try {
      const { data: updatedQuestion } = await questionApi.update(questionId, data)
      set((state) => ({
        currentAssessment: state.currentAssessment ? {
          ...state.currentAssessment,
          questions: state.currentAssessment.questions.map((q) =>
            q._id === questionId ? updatedQuestion : q
          ),
        } : null,
        loading: false,
      }))
      return updatedQuestion
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to update question', loading: false })
      throw error
    }
  },

  deleteQuestion: async (questionId) => {
    set({ loading: true, error: null })
    try {
      await questionApi.delete(questionId)
      set((state) => ({
        currentAssessment: state.currentAssessment ? {
          ...state.currentAssessment,
          questions: state.currentAssessment.questions.filter((q) => q._id !== questionId),
        } : null,
        loading: false,
      }))
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to delete question', loading: false })
      throw error
    }
  },

  // Streaming version of regenerateQuestion
  regenerateQuestion: (questionId, prompt) => {
    return new Promise((resolve, reject) => {
      set({ loading: true, isStreaming: true, streamingContent: '', error: null })

      const abort = questionApi.regenerateStream(
        questionId,
        prompt,
        // onChunk
        (content) => {
          set((state) => ({ streamingContent: state.streamingContent + content }))
        },
        // onComplete
        (data) => {
          set((state) => ({
            currentAssessment: state.currentAssessment ? {
              ...state.currentAssessment,
              questions: state.currentAssessment.questions.map((q) =>
                q._id === questionId ? data.question : q
              ),
            } : null,
            loading: false,
            isStreaming: false,
            streamingContent: '',
          }))
          resolve(data.question)
        },
        // onError
        (error) => {
          set({
            error: error.message || 'Failed to regenerate question',
            loading: false,
            isStreaming: false,
            streamingContent: '',
          })
          reject(error)
        }
      )

      set({ abortStream: abort })
    })
  },

  // Streaming version of regenerateAnswer
  regenerateAnswer: (questionId, answerIndex, prompt) => {
    return new Promise((resolve, reject) => {
      set({ loading: true, isStreaming: true, streamingContent: '', error: null })

      const abort = questionApi.regenerateAnswerStream(
        questionId,
        answerIndex,
        prompt,
        // onChunk
        (content) => {
          set((state) => ({ streamingContent: state.streamingContent + content }))
        },
        // onComplete
        (data) => {
          set((state) => ({
            currentAssessment: state.currentAssessment ? {
              ...state.currentAssessment,
              questions: state.currentAssessment.questions.map((q) =>
                q._id === questionId ? data.question : q
              ),
            } : null,
            loading: false,
            isStreaming: false,
            streamingContent: '',
          }))
          resolve(data.question)
        },
        // onError
        (error) => {
          set({
            error: error.message || 'Failed to regenerate answer',
            loading: false,
            isStreaming: false,
            streamingContent: '',
          })
          reject(error)
        }
      )

      set({ abortStream: abort })
    })
  },

  // Cancel ongoing stream
  cancelStream: () => {
    const { abortStream } = get()
    if (abortStream) {
      abortStream()
      set({ loading: false, isStreaming: false, streamingContent: '', abortStream: null })
    }
  },

  uploadFile: async (file) => {
    set({ loading: true, error: null })
    try {
      const { data } = await uploadApi.file(file)
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to upload file', loading: false })
      throw error
    }
  },

  uploadFiles: async (files) => {
    set({ loading: true, error: null })
    try {
      const { data } = await uploadApi.files(files)
      set({ loading: false })
      return data // { documents: [...], errors?: [...] }
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to upload files', loading: false })
      throw error
    }
  },

  submitText: async (text) => {
    set({ loading: true, error: null })
    try {
      const { data } = await uploadApi.text(text)
      set({ loading: false })
      return data
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to submit text', loading: false })
      throw error
    }
  },

  clearCurrentAssessment: () => set({ currentAssessment: null }),
  clearError: () => set({ error: null }),
}))

export default useAssessmentStore
