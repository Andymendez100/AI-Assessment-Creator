import QuestionCard from './QuestionCard'
import { LoadingSpinner } from '../common'

export default function QuestionList({
  questions,
  loading,
  isPublished,
  onRegenerate,
  onRegenerateAnswer,
  onUpdate,
  onDelete,
}) {
  if (loading && questions.length === 0) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading questions..." />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg border border-border bg-card">
        <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-muted-foreground">No questions generated yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <QuestionCard
          key={question._id}
          question={question}
          index={index}
          isPublished={isPublished}
          onRegenerate={onRegenerate}
          onRegenerateAnswer={onRegenerateAnswer}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
