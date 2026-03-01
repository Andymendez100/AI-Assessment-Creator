// Shared formatting utilities

export const statusStyles = {
  draft: 'bg-amber-900/30 text-amber-400 border-amber-700/50',
  published: 'bg-green-900/30 text-green-400 border-green-700/50',
  archived: 'bg-muted text-muted-foreground border-border',
}

export const getQuestionTypeLabel = (type) => {
  if (type === 'multiple_choice') return 'Multiple Choice'
  if (type === 'true_false') return 'True/False'
  return 'Mixed'
}

export const formatDate = (date, options = {}) => {
  const { includeTime = false, shortMonth = false } = options

  const formatOptions = {
    month: shortMonth ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
  }

  return new Date(date).toLocaleDateString('en-US', formatOptions)
}
