import { Input, Select, Textarea } from '../common'

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'mixed', label: 'Mixed' },
]

const answerCountOptions = [
  { value: '2', label: '2 options' },
  { value: '3', label: '3 options' },
  { value: '4', label: '4 options' },
  { value: '5', label: '5 options' },
  { value: '6', label: '6 options' },
]

export default function AssessmentConfig({ config, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...config, [field]: e.target.value })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">Assessment Configuration</h2>
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="Enter assessment title"
          value={config.title}
          onChange={handleChange('title')}
        />
        <Textarea
          label="Description (optional)"
          placeholder="Enter assessment description"
          value={config.description}
          onChange={handleChange('description')}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="number"
            label="Number of Questions"
            min="1"
            max="50"
            value={config.questionCount}
            onChange={handleChange('questionCount')}
          />
          <Select
            label="Question Type"
            options={questionTypeOptions}
            value={config.questionType}
            onChange={handleChange('questionType')}
          />
          {config.questionType !== 'true_false' && (
            <Select
              label="Answer Options"
              options={answerCountOptions}
              value={config.answerOptionsCount}
              onChange={handleChange('answerOptionsCount')}
            />
          )}
        </div>
        <Textarea
          label="Generation Instructions (optional)"
          placeholder="E.g., Focus on practical applications, make questions challenging, emphasize key concepts from chapter 3..."
          value={config.generationPrompt || ''}
          onChange={handleChange('generationPrompt')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground -mt-2">
          Provide custom instructions to guide the AI when generating questions
        </p>
      </div>
    </div>
  )
}
