import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useAssessmentStore from '../stores/useAssessmentStore'
import useUIStore from '../stores/useUIStore'
import QuestionList from '../components/questions/QuestionList'
import { Button, LoadingSpinner } from '../components/common'
import { statusStyles, getQuestionTypeLabel, formatDate } from '../utils/formatting'

// Component to show streaming progress
function StreamingIndicator({ content, onCancel }) {
  return (
    <div className="rounded-lg border border-primary/50 bg-primary/5 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-3" />
          <span className="text-foreground font-medium">Generating with AI...</span>
        </div>
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {content && (
        <div className="bg-background rounded-md p-4 max-h-64 overflow-y-auto">
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function EditAssessmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentAssessment,
    loading,
    isStreaming,
    streamingContent,
    fetchAssessment,
    generateQuestions,
    publishAssessment,
    regenerateQuestion,
    regenerateAnswer,
    updateQuestion,
    deleteQuestion,
    cancelStream,
  } = useAssessmentStore()
  const { showSuccess, showError } = useUIStore()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        await fetchAssessment(id)
      } catch (error) {
        showError('Failed to load assessment')
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }
    loadAssessment()
  }, [id])

  const isPublished = currentAssessment?.status === 'published'

  const handleRegenerateQuestion = async (questionId, prompt) => {
    try {
      await regenerateQuestion(questionId, prompt)
      showSuccess('Question regenerated!')
    } catch (error) {
      showError('Failed to regenerate question')
    }
  }

  const handleRegenerateAnswer = async (questionId, answerIndex, prompt) => {
    try {
      await regenerateAnswer(questionId, answerIndex, prompt)
      showSuccess('Answer regenerated!')
    } catch (error) {
      showError('Failed to regenerate answer')
    }
  }

  const handleUpdateQuestion = async (question) => {
    try {
      await updateQuestion(question._id, {
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      })
      showSuccess('Question updated!')
    } catch (error) {
      showError('Failed to update question')
    }
  }

  const handleDeleteQuestion = async (questionId) => {
    try {
      await deleteQuestion(questionId)
      showSuccess('Question deleted')
    } catch (error) {
      showError('Failed to delete question')
    }
  }

  const regenerateAll = async () => {
    try {
      await generateQuestions(currentAssessment._id)
      showSuccess('All questions regenerated!')
    } catch (error) {
      showError('Failed to regenerate questions')
    }
  }

  const handlePublish = async () => {
    try {
      await publishAssessment(currentAssessment._id)
      showSuccess('Assessment published successfully!')
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to publish assessment')
    }
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading assessment..." />
      </div>
    )
  }

  if (!currentAssessment) {
    return null
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground text-sm font-medium flex items-center mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Assessments
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-foreground">{currentAssessment.title}</h1>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-md border capitalize ${statusStyles[currentAssessment.status]}`}
              >
                {currentAssessment.status}
              </span>
            </div>
            {currentAssessment.description && (
              <p className="text-muted-foreground mt-1">{currentAssessment.description}</p>
            )}
          </div>

          {!isPublished && (
            <div className="flex space-x-2">
              <Button variant="secondary" loading={loading && !isStreaming} disabled={isStreaming} onClick={regenerateAll}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate All
              </Button>
              <Button variant="success" loading={loading && !isStreaming} disabled={isStreaming} onClick={handlePublish}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Info */}
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Questions</span>
            <span className="font-medium text-foreground">
              {currentAssessment.questions?.length || 0}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Type</span>
            <span className="font-medium text-foreground">
              {getQuestionTypeLabel(currentAssessment.configuration?.questionType)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Created</span>
            <span className="font-medium text-foreground">
              {formatDate(currentAssessment.createdAt, { includeTime: true })}
            </span>
          </div>
          {currentAssessment.publishedAt && (
            <div>
              <span className="text-muted-foreground block">Published</span>
              <span className="font-medium text-foreground">
                {formatDate(currentAssessment.publishedAt, { includeTime: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Published Notice */}
      {isPublished && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6 flex items-center">
          <svg className="w-5 h-5 text-muted-foreground mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-muted-foreground">
            This assessment is published. Changes are limited to protect data integrity.
          </p>
        </div>
      )}

      {/* Streaming Progress Indicator */}
      {isStreaming && (
        <StreamingIndicator content={streamingContent} onCancel={cancelStream} />
      )}

      {/* Questions */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Questions</h2>
      </div>

      <QuestionList
        questions={currentAssessment.questions || []}
        loading={loading}
        isPublished={isPublished}
        onRegenerate={handleRegenerateQuestion}
        onRegenerateAnswer={handleRegenerateAnswer}
        onUpdate={handleUpdateQuestion}
        onDelete={handleDeleteQuestion}
      />
    </div>
  )
}
