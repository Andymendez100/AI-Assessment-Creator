import { forwardRef } from 'react'

const Input = forwardRef(({
  className = '',
  type = 'text',
  label,
  error,
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        type={type}
        ref={ref}
        className={`
          flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm
          shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium
          placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
