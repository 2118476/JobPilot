// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Onboarding from './Onboarding'

afterEach(cleanup)

beforeAll(() => {
  // framer-motion queries matchMedia for reduced-motion; jsdom lacks it
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList)
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  )

describe('Onboarding', () => {
  it('renders the setup wizard', () => {
    renderPage()
    expect(screen.getByText(/set up your profile/i)).toBeTruthy()
  })

  it('blocks continuing without a name', () => {
    renderPage()
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText(/please enter your name/i)).toBeTruthy()
  })

  it('advances to the skills step once a name is entered', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('e.g. Jane Smith'), { target: { value: 'Test Person' } })
    fireEvent.click(screen.getByText('Continue'))
    expect(await screen.findByPlaceholderText('Add a skill…')).toBeTruthy()
  })
})
