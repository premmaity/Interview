import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('explains the product boundary and provides a registration path', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /turn interview nerves/i })).toBeInTheDocument()
    expect(screen.getByText(/coaching feedback is not a hiring decision/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /build my first round/i })).toHaveAttribute('href', '/register')
  })
})

