function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button type="button" className={`btn-secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default SecondaryButton
