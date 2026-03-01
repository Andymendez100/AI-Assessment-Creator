import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAssessmentStore from '../stores/useAssessmentStore'
import useUIStore from '../stores/useUIStore'
import AssessmentList from '../components/assessment/AssessmentList'
import { Button, Modal } from '../components/common'

export default function HomePage() {
  const navigate = useNavigate()
  const { assessments, loading, fetchAssessments, deleteAssessment, publishAssessment } = useAssessmentStore()
  const { showSuccess, showError } = useUIStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [assessmentToDelete, setAssessmentToDelete] = useState(null)

  useEffect(() => {
    fetchAssessments().catch(() => {
      showError('Failed to load assessments')
    })
  }, [])

  const handleEdit = (id) => {
    navigate(`/edit/${id}`)
  }

  const handleDelete = (id) => {
    setAssessmentToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await deleteAssessment(assessmentToDelete)
      showSuccess('Assessment deleted successfully')
    } catch (error) {
      showError('Failed to delete assessment')
    } finally {
      setShowDeleteConfirm(false)
      setAssessmentToDelete(null)
    }
  }

  const handlePublish = async (id) => {
    try {
      await publishAssessment(id)
      await fetchAssessments()
      showSuccess('Assessment published successfully!')
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to publish assessment')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-1">Manage your AI-generated assessments</p>
        </div>
        <Link to="/create">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Assessment
          </Button>
        </Link>
      </div>

      {/* Assessment List */}
      <AssessmentList
        assessments={assessments}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPublish={handlePublish}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Assessment?"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-muted-foreground">
          This action cannot be undone. All questions will be permanently deleted.
        </p>
      </Modal>
    </div>
  )
}
