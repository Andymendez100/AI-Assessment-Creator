import { create } from 'zustand'

const useUIStore = create((set) => ({
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    return id
  },

  showSuccess: (message) => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type: 'success' }],
    }))
    return id
  },

  showError: (message) => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type: 'error' }],
    }))
    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

export default useUIStore
