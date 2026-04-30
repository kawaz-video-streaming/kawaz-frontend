import type { CollectionListItem } from '../types/api'

export interface CollectionTreeEntry {
  item: CollectionListItem
  depth: number
}

export const buildTopographicList = (collections: CollectionListItem[]): CollectionTreeEntry[] => {
  const byParent = new Map<string | undefined, CollectionListItem[]>()
  for (const col of collections) {
    const key = col.collectionId ?? undefined
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(col)
  }

  const result: CollectionTreeEntry[] = []

  const walk = (parentId: string | undefined, depth: number) => {
    for (const col of byParent.get(parentId) ?? []) {
      result.push({ item: col, depth })
      walk(col._id, depth + 1)
    }
  }

  walk(undefined, 0)
  return result
}

export interface SeasonGroup {
  key: string
  label: string
  seasons: CollectionListItem[]
}

export const buildSeasonGroups = (collections: CollectionListItem[]): SeasonGroup[] => {
  const titleById = new Map(collections.map((c) => [c._id, c.title]))
  const groups = new Map<string, { label: string; seasons: CollectionListItem[] }>()

  collections
    .filter((c) => c.kind === 'season')
    .forEach((season) => {
      const groupKey = season.collectionId ?? '__ungrouped__'
      const groupLabel = season.collectionId
        ? (titleById.get(season.collectionId) ?? 'Unknown Show')
        : 'Unnested Seasons'
      if (!groups.has(groupKey)) groups.set(groupKey, { label: groupLabel, seasons: [] })
      groups.get(groupKey)!.seasons.push(season)
    })

  return [...groups.entries()]
    .map(([key, { label, seasons }]) => ({
      key,
      label,
      seasons: [...seasons].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
