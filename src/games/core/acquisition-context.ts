import { createContext } from 'react'
import type { AcquisitionService } from './acquisition'

export const AcquisitionContext = createContext<AcquisitionService | undefined>(undefined)
