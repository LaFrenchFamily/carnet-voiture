import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderForm } from './ReminderForm'

function setup() {
  const onSubmit = vi.fn()
  render(<ReminderForm onSubmit={onSubmit} />)
  return { onSubmit, user: userEvent.setup() }
}

test('needs a date, an odometer or both', async () => {
  const { onSubmit, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(screen.getByText('Indiquez une date, un kilométrage, ou les deux')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('choosing the roadworthiness test prefills label and a 24-month recurrence', async () => {
  const { user } = setup()
  await user.selectOptions(screen.getByLabelText('Type'), 'Contrôle technique')
  expect(screen.getByLabelText('Libellé')).toHaveValue('Contrôle technique')
  expect(screen.getByLabelText('Répéter tous les (mois)')).toHaveValue('24')
})

test('choosing an oil change prefills 12 months and 15 000 km, still editable', async () => {
  const { onSubmit, user } = setup()
  await user.selectOptions(screen.getByLabelText('Type'), 'Vidange')
  expect(screen.getByLabelText('Répéter tous les (mois)')).toHaveValue('12')
  expect(screen.getByLabelText('Répéter tous les (km)')).toHaveValue('15000')
  await user.clear(screen.getByLabelText('Répéter tous les (km)'))
  await user.type(screen.getByLabelText('Répéter tous les (km)'), '20000')
  await user.type(screen.getByLabelText('Kilométrage limite'), '65000')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(onSubmit).toHaveBeenCalledWith({
    type: 'oil', label: 'Vidange', dueDate: null, dueOdometer: 65000, everyMonths: 12, everyKm: 20000,
  })
})
