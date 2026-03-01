import { useState } from 'react'
import { Button, Modal, Textarea } from '../common'

export default function QuestionCard({
  question,
  index,
  isPublished,
  onRegenerate,
  onRegenerateAnswer,
  onUpdate,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuestion, setEditedQuestion] = useState(question)
  const [actionLoading, setActionLoading] = useState(null)

  // Regenerate modal state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerateTarget, setRegenerateTarget] = useState(null) // 'question' | 'answer' | answerIndex
  const [regeneratePrompt, setRegeneratePrompt] = useState('')

  const handleSave = async () => {
    setActionLoading('save')
    try {
      await onUpdate(editedQuestion)
      setIsEditing(false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = () => {
    setEditedQuestion(question)
    setIsEditing(false)
  }

  const openRegenerateModal = (target) => {
    setRegenerateTarget(target)
    setRegeneratePrompt('')
    setShowRegenerateModal(true)
  }

  const handleRegenerate = async () => {
    setActionLoading(regenerateTarget)
    setShowRegenerateModal(false)
    try {
      if (regenerateTarget === 'question') {
        await onRegenerate(question._id, regeneratePrompt || undefined)
      } else if (typeof regenerateTarget === 'number') {
        // Regenerate specific answer
        await onRegenerateAnswer(question._id, regenerateTarget, regeneratePrompt || undefined)
      }
    } finally {
      setActionLoading(null)
      setRegeneratePrompt('')
      setRegenerateTarget(null)
    }
  }

  const isMultipleChoice = question.type === 'multiple_choice'

  const getRegenerateModalTitle = () => {
    if (regenerateTarget === 'question') return 'Regenerate Question'
    if (typeof regenerateTarget === 'number') {
      const letter = String.fromCharCode(65 + regenerateTarget)
      return `Regenerate Answer ${letter}`
    }
    return 'Regenerate'
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium">
              {index + 1}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isMultipleChoice ? 'Multiple Choice' : 'True/False'}
            </span>
          </div>
          {!isPublished && !isEditing && (
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openRegenerateModal('question')}
                loading={actionLoading === 'question'}
                title="Regenerate question"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => onDelete(question._id)}
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedQuestion.questionText}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, questionText: e.target.value })}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
            />

            {isMultipleChoice ? (
              <div className="space-y-2">
                {editedQuestion.options.map((option, i) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={option.isCorrect}
                      onChange={() => {
                        setEditedQuestion({
                          ...editedQuestion,
                          options: editedQuestion.options.map((o, idx) => ({
                            ...o,
                            isCorrect: idx === i,
                          })),
                        })
                      }}
                      className="h-4 w-4"
                    />
                    <input
                      value={option.text}
                      onChange={(e) => {
                        setEditedQuestion({
                          ...editedQuestion,
                          options: editedQuestion.options.map((o, idx) =>
                            idx === i ? { ...o, text: e.target.value } : o
                          ),
                        })
                      }}
                      className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={editedQuestion.correctAnswer === true}
                    onChange={() => setEditedQuestion({ ...editedQuestion, correctAnswer: true })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">True</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={editedQuestion.correctAnswer === false}
                    onChange={() => setEditedQuestion({ ...editedQuestion, correctAnswer: false })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">False</span>
                </label>
              </div>
            )}

            <textarea
              value={editedQuestion.explanation || ''}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, explanation: e.target.value })}
              placeholder="Explanation (optional)"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} loading={actionLoading === 'save'}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-foreground mb-4">{question.questionText}</p>

            {isMultipleChoice ? (
              <div className="space-y-2 mb-4">
                {question.options.map((option, i) => (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      option.isCorrect
                        ? 'bg-green-900/20 border-green-700/50 text-green-300'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                        option.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground'
                      }`}>
                        {option.isCorrect ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>
                      <span className={option.isCorrect ? 'text-foreground' : ''}>{option.text}</span>
                    </div>
                    {!isPublished && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-50 hover:opacity-100"
                        onClick={() => openRegenerateModal(i)}
                        loading={actionLoading === i}
                        title={`Regenerate answer ${String.fromCharCode(65 + i)}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${
                  question.correctAnswer
                    ? 'bg-green-900/20 text-green-300 border border-green-700/50'
                    : 'bg-red-900/20 text-red-300 border border-red-700/50'
                }`}>
                  Answer: {question.correctAnswer ? 'True' : 'False'}
                </span>
              </div>
            )}

            {question.explanation && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Explanation:</span> {question.explanation}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Regenerate Modal */}
      <Modal
        show={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        title={getRegenerateModalTitle()}
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowRegenerateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {regenerateTarget === 'question'
              ? 'Generate a new question based on the reference material.'
              : 'Generate a new answer option for this question.'}
          </p>
          <Textarea
            label="Custom instructions (optional)"
            placeholder={
              regenerateTarget === 'question'
                ? "e.g., Make it more challenging, focus on a specific concept..."
                : "e.g., Make this answer more plausible as a distractor..."
            }
            value={regeneratePrompt}
            onChange={(e) => setRegeneratePrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </Modal>
    </>
  )
}
