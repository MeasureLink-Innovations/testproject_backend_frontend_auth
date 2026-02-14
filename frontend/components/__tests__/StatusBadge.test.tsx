import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders idle status correctly', () => {
    render(<StatusBadge status="idle" />)
    const badge = screen.getByText('Idle')
    expect(badge).toBeInTheDocument()
    // Check if the parent span has the correct class
    expect(badge.closest('.status-badge')).toHaveClass('status-idle')
  })

  it('renders running status correctly', () => {
    render(<StatusBadge status="running" />)
    const badge = screen.getByText('Running')
    expect(badge).toBeInTheDocument()
    expect(badge.closest('.status-badge')).toHaveClass('status-running')
  })

  it('renders crashed status correctly', () => {
    render(<StatusBadge status="crashed" />)
    const badge = screen.getByText('Crashed')
    expect(badge).toBeInTheDocument()
    expect(badge.closest('.status-badge')).toHaveClass('status-crashed')
  })

  it('renders unreachable status correctly', () => {
    render(<StatusBadge status="unreachable" />)
    const badge = screen.getByText('Unreachable')
    expect(badge).toBeInTheDocument()
    expect(badge.closest('.status-badge')).toHaveClass('status-unreachable')
  })

  it('renders unknown status for invalid input', () => {
    render(<StatusBadge status="invalid-status" />)
    const badge = screen.getByText('Unknown')
    expect(badge).toBeInTheDocument()
    expect(badge.closest('.status-badge')).toHaveClass('status-unknown')
  })
})
