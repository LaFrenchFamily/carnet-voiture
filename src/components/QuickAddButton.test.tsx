import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { makeVehicle } from '@/test/factories'
import { QuickAddButton } from './QuickAddButton'

test('"Lire une facture" leads to the scan screen of the only vehicle', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<QuickAddButton vehicles={[makeVehicle({ id: 'v1' })]} />} />
        <Route path="/voitures/v1/entrees/lire" element={<p>Écran de lecture</p>} />
      </Routes>
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Ajouter' }))
  await user.click(screen.getByRole('button', { name: /Lire une facture/ }))
  expect(screen.getByText('Écran de lecture')).toBeInTheDocument()
})
