import { useMutation } from '@tanstack/react-query'
import { planTrip } from '../api/tripApi'

export function usePlanTrip() {
  return useMutation({
    mutationFn: planTrip,
  })
}
