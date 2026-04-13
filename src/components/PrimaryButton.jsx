function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" className={`btn-primary ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default PrimaryButton
