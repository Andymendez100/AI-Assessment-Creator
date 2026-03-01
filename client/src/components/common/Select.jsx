import { forwardRef } from 'react'

const Select = forwardRef(({
  className = '',
  label,
  error,
  options = [],
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
          shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
