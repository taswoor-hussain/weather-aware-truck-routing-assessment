import { z } from 'zod'
import { CHECKPOINT_INTERVALS } from '../types'

export const tripFormSchema = z
  .object({
    origin: z.string().trim().min(1, 'Enter an origin.').max(120),
    destination: z.string().trim().min(1, 'Enter a destination.').max(120),
    departureLocal: z
      .string()
      .min(1, 'Choose a departure date and time.')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: 'Enter a valid departure date and time.',
      }),
    loadWeight: z
      .string()
      .min(1, 'Enter the load weight.')
      .refine((value) => /^\d+$/.test(value), 'Enter a whole number of pounds.')
      .transform(Number)
      .pipe(z.number().int().min(1, 'Load weight must be at least 1 lb.')),
    checkpointInterval: z
      .string()
      .transform(Number)
      .pipe(z.union(CHECKPOINT_INTERVALS.map((value) => z.literal(value)))),
  })
  .refine(
    (values) => values.origin.toLowerCase() !== values.destination.toLowerCase(),
    {
      message: 'Origin and destination must be different.',
      path: ['destination'],
    },
  )

export type TripFormInput = z.input<typeof tripFormSchema>
export type TripFormValues = z.output<typeof tripFormSchema>
