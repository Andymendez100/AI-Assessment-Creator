import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAssessmentStore from '../stores/useAssessmentStore'
import useUIStore from '../stores/useUIStore'
import AssessmentConfig from '../components/assessment/AssessmentConfig'
import ReferenceInput from '../components/reference/ReferenceInput'
import QuestionList from '../components/questions/QuestionList'
import { Button } from '../components/common'
import { uploadApi } from '../api/client'

const steps = [
  { number: 1, label: 'Configure' },
  { number: 2, label: 'Reference (Optional)' },
  { number: 3, label: 'Generate & Edit' },
]

export default function CreateAssessmentPage() {
  const navigate = useNavigate()
  const {
    currentAssessment,
    loading,
    createAssessment,
    generateQuestions,
    fetchAssessment,
    publishAssessment,
    uploadFile,
    uploadFiles,
    submitText,
    regenerateQuestion,
    regenerateAnswer,
    updateQuestion,
    deleteQuestion,
  } = useAssessmentStore()
  const { showSuccess, showError } = useUIStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [referenceDocIds, setReferenceDocIds] = useState([])
  const [uploadedDocs, setUploadedDocs] = useState([]) // Track individual doc status
  const pollIntervalRef = useRef(null)
  const [config, setConfig] = useState({
    title: '',
    description: '',
    questionCount: 10,
    questionType: 'multiple_choice',
    answerOptionsCount: '4',
    generationPrompt: '',
  })

  // Poll for RAG status when references are uploaded
  useEffect(() => {
    const docsNeedingPoll = uploadedDocs.filter(
      doc => doc.ragStatus && doc.ragStatus !== 'ready' && doc.ragStatus !== 'failed'
    )

    if (docsNeedingPoll.length > 0) {
      pollIntervalRef.current = setInterval(async () => {
        const updates = await Promise.all(
          docsNeedingPoll.map(async (doc) => {
            try {
              const { data } = await uploadApi.getRagStatus(doc.id)
              return { id: doc.id, ragStatus: data.ragStatus, ragError: data.ragError }
            } catch (error) {
              console.error('Failed to poll RAG status:', error)
              return null
            }
          })
        )

        setUploadedDocs(prev => prev.map(doc => {
          const update = updates.find(u => u?.id === doc.id)
          if (update) {
            return { ...doc, ragStatus: update.ragStatus, ragError: update.ragError }
          }
          return doc
        }))

        // Check if all done
        const allDone = updates.every(u => !u || u.ragStatus === 'ready' || u.ragStatus === 'failed')
        if (allDone) {
          clearInterval(pollIntervalRef.current)
        }
      }, 2000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [uploadedDocs])

  const canProceedToStep2 = config.title.trim().length > 0 && config.questionCount > 0
  const hasReferenceDocuments = referenceDocIds.length > 0
  const isRagProcessing = uploadedDocs.some(
    doc => doc.ragStatus === 'pending' || doc.ragStatus === 'processing'
  )

  const handleReferenceSubmit = async (reference) => {
    if (reference.type === 'files') {
      const result = await uploadFiles(reference.data)
      const newDocs = result.documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        ragStatus: doc.ragStatus
      }))
      setReferenceDocIds(prev => [...prev, ...newDocs.map(d => d.id)])
      setUploadedDocs(prev => [...prev, ...newDocs])

      if (result.errors?.length > 0) {
        showError(`Some files failed: ${result.errors.map(e => e.fileName).join(', ')}`)
      }
      showSuccess(`${result.documents.length} file(s) added successfully!`)
    } else {
      const result = await submitText(reference.data)
      setReferenceDocIds(prev => [...prev, result.id])
      setUploadedDocs(prev => [...prev, {
        id: result.id,
        fileName: 'Pasted text',
        ragStatus: result.ragStatus
      }])
      showSuccess('Reference material added successfully!')
    }
  }

  const handleReferenceError = (error) => {
    showError(error)
  }

  const createAndGenerate = async () => {
    try {
      const assessment = await createAssessment({
        title: config.title,
        description: config.description,
        configuration: {
          questionCount: parseInt(config.questionCount),
          questionType: config.questionType,
          answerOptionsCount: parseInt(config.answerOptionsCount),
        },
        referenceDocumentIds: referenceDocIds,
      })

      await generateQuestions(assessment._id, config.generationPrompt)
      await fetchAssessment(assessment._id)

      showSuccess('Questions generated successfully!')
      setCurrentStep(3)
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to generate questions')
    }
  }

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

  const publishAndFinish = async () => {
    try {
      await publishAssessment(currentAssessment._id)
      showSuccess('Assessment published successfully!')
      navigate('/')
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to publish assessment')
    }
  }

  const saveAsDraft = () => {
    showSuccess('Assessment saved as draft')
    navigate('/')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Create Assessment</h1>
        <p className="text-muted-foreground mt-1">
          Generate questions from your reference material using AI
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-sm transition-colors ${
                    currentStep >= step.number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.number ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 rounded ${
                    currentStep > step.number ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <div>
            <AssessmentConfig config={config} onChange={setConfig} />
            <div className="mt-6 flex justify-end">
              <Button disabled={!canProceedToStep2} onClick={() => setCurrentStep(2)}>
                Continue
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Reference Material */}
        {currentStep === 2 && (
          <div>
            <ReferenceInput
              loading={loading}
              onSubmit={handleReferenceSubmit}
              onError={handleReferenceError}
            />

            {/* Uploaded Documents List with RAG Status */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {uploadedDocs.length} reference{uploadedDocs.length !== 1 ? 's' : ''} uploaded
                </p>
                {uploadedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      doc.ragStatus === 'ready' || doc.ragStatus === null
                        ? 'bg-green-900/20 border border-green-700/50'
                        : doc.ragStatus === 'failed'
                        ? 'bg-red-900/20 border border-red-700/50'
                        : 'bg-yellow-900/20 border border-yellow-700/50'
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      {doc.ragStatus === 'pending' || doc.ragStatus === 'processing' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent mr-2 flex-shrink-0" />
                      ) : doc.ragStatus === 'failed' ? (
                        <svg className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm truncate ${
                        doc.ragStatus === 'ready' || doc.ragStatus === null
                          ? 'text-green-300'
                          : doc.ragStatus === 'failed'
                          ? 'text-red-300'
                          : 'text-yellow-300'
                      }`}>
                        {doc.fileName}
                      </span>
                    </div>
                    <span className={`text-xs ml-2 flex-shrink-0 ${
                      doc.ragStatus === 'ready' ? 'text-green-400' :
                      doc.ragStatus === 'failed' ? 'text-red-400' :
                      doc.ragStatus === 'pending' || doc.ragStatus === 'processing' ? 'text-yellow-400' :
                      'text-muted-foreground'
                    }`}>
                      {doc.ragStatus === 'ready' ? 'RAG ready' :
                       doc.ragStatus === 'failed' ? 'RAG failed' :
                       doc.ragStatus === 'pending' || doc.ragStatus === 'processing' ? 'Processing...' :
                       'Ready'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!hasReferenceDocuments && (
              <div className="mt-4 p-4 rounded-lg bg-amber-900/20 border border-amber-700/50">
                <p className="text-sm text-amber-300">
                  No reference material added. Questions will be generated based on your configuration and custom prompt only.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <Button
                loading={loading}
                disabled={isRagProcessing}
                onClick={createAndGenerate}
              >
                {isRagProcessing ? 'Waiting for RAG...' : 'Generate Questions'}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generated Questions */}
        {currentStep === 3 && (
          <div>
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">{config.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentAssessment?.questions?.length || 0} questions generated
                  </p>
                </div>
                <Button variant="secondary" loading={loading} onClick={createAndGenerate}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate All
                </Button>
              </div>
            </div>

            <QuestionList
              questions={currentAssessment?.questions || []}
              loading={loading}
              onRegenerate={handleRegenerateQuestion}
              onRegenerateAnswer={handleRegenerateAnswer}
              onUpdate={handleUpdateQuestion}
              onDelete={handleDeleteQuestion}
            />

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={saveAsDraft}>
                Save as Draft
              </Button>
              <Button variant="success" loading={loading} onClick={publishAndFinish}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish Assessment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
