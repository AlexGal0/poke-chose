import { useTeamSource } from './useTeamSource'
import { saveDataSource } from '../sources/save'

export function useSaveTeam(enabled: boolean) {
  return useTeamSource(enabled ? saveDataSource : null)
}
