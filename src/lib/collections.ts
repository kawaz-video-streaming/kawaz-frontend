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
