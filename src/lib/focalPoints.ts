const KEY = 'kawaz_focal_points'

const load = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const getFocalPoint = (id: string): string =>
  load()[id] ?? '50% 50%'

export const setFocalPoint = (id: string, value: string) => {
  const all = load()
  all[id] = value
  localStorage.setItem(KEY, JSON.stringify(all))
}
