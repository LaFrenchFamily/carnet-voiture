import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleForm } from './VehicleForm'

function setup() {
  const onSubmit = vi.fn()
  render(<VehicleForm onSubmit={onSubmit} submitLabel="Enregistrer" />)
  return { onSubmit, user: userEvent.setup() }
}

test('requires a nickname', async () => {
  const { onSubmit, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(screen.getByText('Le surnom est obligatoire')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('rejects a negative odometer', async () => {
  const { onSubmit, user } = setup()
  await user.type(screen.getByLabelText('Surnom'), 'Clio')
  await user.type(screen.getByLabelText('Kilométrage actuel'), '-5')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(screen.getByText('Kilométrage invalide')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('submits typed values', async () => {
  const { onSubmit, user } = setup()
  await user.type(screen.getByLabelText('Surnom'), 'Clio')
  await user.selectOptions(screen.getByLabelText('Énergie'), 'Diesel')
  await user.type(screen.getByLabelText('Kilométrage actuel'), '45 000')
  await user.type(screen.getByLabelText('Année'), '2018')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(onSubmit).toHaveBeenCalledWith({
    nickname: 'Clio', make: null, model: null, year: 2018, plate: null, fuelType: 'diesel', initialOdometer: 45000,
  })
})

test('lists fuel types in French', () => {
  setup()
  const options = screen.getAllByRole('option').map((o) => o.textContent)
  expect(options).toEqual(['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL', 'Autre'])
})
