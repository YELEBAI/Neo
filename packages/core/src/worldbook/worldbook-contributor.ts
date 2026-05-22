import type { ContextContributor, ContextInput, ContextBlock } from '@neo-tavern/shared'

export class WorldbookContributor implements ContextContributor {
  id = 'worldbook'
  name = 'Worldbook Contributor'

  async contribute(_input: ContextInput): Promise<ContextBlock[]> {
    return []
  }
}
