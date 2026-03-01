import AssessmentCard from './AssessmentCard'
import { LoadingSpinner } from '../common'

export default function AssessmentList({ assessments = [], loading, onEdit, onDelete, onPublish }) {
  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading assessments..." />
      </div>
    )
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-muted-foreground">No assessments yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Create your first assessment to get started</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assessments.map((assessment) => (
        <AssessmentCard
          key={assessment._id}
          assessment={assessment}
          onEdit={() => onEdit(assessment._id)}
          onDelete={() => onDelete(assessment._id)}
          onPublish={() => onPublish(assessment._id)}
        />
      ))}
    </div>
  )
}
