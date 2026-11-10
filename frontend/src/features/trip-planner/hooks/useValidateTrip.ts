import { useMutation } from '@tanstack/react-query'
import { validateTrip } from '../api/tripApi'

export function useValidateTrip() {
  return useMutation({
    mutationFn: validateTrip,
  })
}
