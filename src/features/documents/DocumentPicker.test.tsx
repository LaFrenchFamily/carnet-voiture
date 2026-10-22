import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileRejectedError } from '@/lib/upload'
import { DocumentPicker } from './DocumentPicker'

const pdf = new File(['%PDF'], 'facture.pdf', { type: 'application/pdf' })

function setup(upload: (f: File) => Promise<void>) {
  render(<DocumentPicker upload={upload} />)
  return userEvent.setup({ applyAccept: false })
}

test('offers the camera and a file chooser', () => {
  setup(vi.fn())
  const camera = screen.getByLabelText('Prendre une photo')
  expect(camera).toHaveAttribute('accept', 'image/*')
  expect(camera).toHaveAttribute('capture', 'environment')
  expect(screen.getByLabelText('Choisir un fichier')).toHaveAttribute(
    'accept', 'application/pdf,image/jpeg,image/png,image/heic,image/webp,.heic,.heif',
  )
})

test('shows why a file is refused, without retry', async () => {
  const user = setup(vi.fn().mockRejectedValue(new FileRejectedError('Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)')))
  await user.upload(screen.getByLabelText('Choisir un fichier'), new File(['x'], 'a.txt', { type: 'text/plain' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Format non pris en charge')
  expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument()
})

test('a failed upload can be retried with the same file', async () => {
  const upload = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
  const user = setup(upload)
  await user.upload(screen.getByLabelText('Choisir un fichier'), pdf)
  expect(await screen.findByRole('alert')).toHaveTextContent('L’envoi de la facture a échoué')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(upload).toHaveBeenCalledTimes(2)
  expect(upload).toHaveBeenLastCalledWith(pdf)
  expect(await screen.findByText('Facture ajoutée')).toBeInTheDocument()
})
