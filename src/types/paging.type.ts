
export interface Paging {
  start: number
  count: number
  total: number
  links: any[]
}

export interface PagedList<T> {
  paging: PagingResponse
  elements: T[]
}

export interface PagingResponse {
  offset: number
  count: number
  total: number
}

