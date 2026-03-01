import { useState, useRef } from 'react'
import { Button, Textarea } from '../common'

export default function ReferenceInput({ loading, onSubmit, onError, onSuccess }) {
  const [mode, setMode] = useState('file')
  const [text, setText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const acceptedTypes = '.pdf,.doc,.docx,.txt'
  const maxFileSize = 10 * 1024 * 1024 // 10MB
  const maxFiles = 10

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    validateAndAddFiles(files)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    validateAndAddFiles(files)
    // Reset input to allow selecting the same file again
    e.target.value = ''
  }

  const validateAndAddFiles = (files) => {
    const validExtensions = acceptedTypes.split(',')
    const validFiles = []
    const errors = []

    for (const file of files) {
      const extension = '.' + file.name.split('.').pop().toLowerCase()

      if (!validExtensions.includes(extension)) {
        errors.push(`${file.name}: Invalid file type`)
        continue
      }

      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max 10MB)`)
        continue
      }

      // Check for duplicates
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: Already added`)
        continue
      }

      validFiles.push(file)
    }

    if (selectedFiles.length + validFiles.length > maxFiles) {
      onError(`Maximum ${maxFiles} files allowed`)
      return
    }

    if (errors.length > 0) {
      onError(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    try {
      if (mode === 'file' && selectedFiles.length > 0) {
        await onSubmit({ type: 'files', data: selectedFiles })
        setSelectedFiles([]) // Clear after successful upload
      } else if (mode === 'text' && text.trim()) {
        await onSubmit({ type: 'text', data: text.trim() })
        setText('') // Clear after successful upload
      }
      onSuccess?.()
    } catch (error) {
      // Don't clear on error - let parent handle error display
      onError?.(error.response?.data?.error || error.message || 'Upload failed')
    }
  }

  const canSubmit = mode === 'file' ? selectedFiles.length > 0 : text.trim().length > 0

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">Reference Material</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Add reference material that will be used to generate questions. You can upload multiple files.
      </p>

      {/* Mode Toggle */}
      <div className="flex space-x-1 mb-4 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'file'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload Files
        </button>
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'text'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* File Upload */}
      {mode === 'file' && (
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, DOCX, or TXT (max 10MB each, up to {maxFiles} files)
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Input */}
      {mode === 'text' && (
        <Textarea
          placeholder="Paste your reference material here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[200px]"
        />
      )}

      <div className="mt-4 flex justify-end">
        <Button
          disabled={!canSubmit}
          loading={loading}
          onClick={handleSubmit}
        >
          Add Reference Material
        </Button>
      </div>
    </div>
  )
}
