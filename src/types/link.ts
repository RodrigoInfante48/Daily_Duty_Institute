export interface LinkItem {
  id: string
  title: string
  subtitle?: string
  url: string
  icon: string
  order: number
  active: boolean
  createdAt: Date | null
}
