import { act, render, screen } from '@testing-library/react'
import { OfflineBanner } from './OfflineBanner'

test('shows a banner when the connection drops and hides it when back', () => {
  render(<OfflineBanner />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  act(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByRole('status')).toHaveTextContent('Hors ligne : les modifications ne peuvent pas être enregistrées')
  act(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
  })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
