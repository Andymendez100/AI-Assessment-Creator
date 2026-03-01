import { Button } from '../common'
import { statusStyles, getQuestionTypeLabel, formatDate } from '../../utils/formatting'

export default function AssessmentCard({ assessment, onEdit, onDelete, onPublish }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:border-muted-foreground/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-card-foreground mb-1">
            {assessment.title}
          </h3>
          {assessment.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {assessment.description}
            </p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-md border capitalize ml-3 ${statusStyles[assessment.status]}`}>
          {assessment.status}
        </span>
      </div>

      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{assessment.questions?.length || assessment.configuration?.questionCount || 0} questions</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>{getQuestionTypeLabel(assessment.configuration?.questionType)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(assessment.createdAt, { shortMonth: true })}</span>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
        {assessment.status === 'draft' && (
          <Button size="sm" variant="success" onClick={onPublish}>
            Publish
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onEdit}>
          {assessment.status === 'draft' ? 'Edit' : 'View'}
        </Button>
        {assessment.status === 'draft' && (
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
