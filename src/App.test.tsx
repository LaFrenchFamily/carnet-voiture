import { render, screen } from '@testing-library/react'
import App from './App'

test('shows the app title', () => {
  render(<App />)
  expect(screen.getByText('Carnet de Voiture')).toBeInTheDocument()
})
