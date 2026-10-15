/**
 * 通用「带过期时间」的本地缓存工具
 *
 * 用法：
 *   const cache = createCache<MyData>({ key: 'my_key', expireMs: TWO_HOURS })
 *   const data = await cache.getOrFetch(() => fetchMyData()) // 未过期读本地，过期才走接口
 */

export interface CacheOptions {
  /** localStorage 存储键名 */
  key: string
  /** 过期时长（毫秒） */
  expireMs: number
}

/** 实际写入 localStorage 的结构 */
export interface CacheEntry<T> {
  data: T
  lastUpdateTime: number
}

export interface DataCache<T> {
  /** 读取缓存数据（无缓存或解析失败返回 null） */
  get(): T | null
  /** 写入缓存，并记录当前时间 */
  set(data: T): void
  /** 判断缓存是否过期（无缓存也算过期） */
  isExpired(): boolean
  /** 删除缓存 */
  clear(): void
  /** 未过期直接返回本地数据（不走接口）；过期则调用 fetcher 拉取并写入缓存 */
  getOrFetch(fetcher: () => Promise<T>): Promise<T>
}

/** 两小时（毫秒）——常用过期时长的快捷常量 */
export const TWO_HOURS = 2 * 60 * 60 * 1000

/**
 * 创建一个带过期时间的缓存实例
 */
export function createCache<T>({ key, expireMs }: CacheOptions): DataCache<T> {
  /** 读取并校验原始缓存条目；结构异常时清掉并返回 null */
  function readEntry(): CacheEntry<T> | null {
    const str = localStorage.getItem(key)
    if (!str) return null
    try {
      const entry = JSON.parse(str) as Partial<CacheEntry<T>>
      // 校验时间戳，避免旧格式/脏数据导致过期判断失效
      if (typeof entry?.lastUpdateTime !== 'number') {
        localStorage.removeItem(key)
        return null
      }
      return entry as CacheEntry<T>
    } catch {
      localStorage.removeItem(key)
      return null
    }
  }

  function get(): T | null {
    const data = readEntry()?.data
    return data === undefined ? null : data
  }

  function set(data: T): void {
    const entry: CacheEntry<T> = {
      data,
      lastUpdateTime: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(entry))
  }

  function isExpired(): boolean {
    const entry = readEntry()
    if (!entry) return true // 无缓存 → 过期，需要拉取
    return Date.now() - entry.lastUpdateTime > expireMs
  }

  function clear(): void {
    localStorage.removeItem(key)
  }

  async function getOrFetch(fetcher: () => Promise<T>): Promise<T> {
    // 1. 缓存未过期：直接返回本地数据，不走接口
    if (!isExpired()) {
      const cached = get()
      if (cached !== null) return cached
    }
    // 2. 缓存过期（或数据缺失）：请求接口并写入缓存
    const data = await fetcher()
    set(data)
    return data
  }

  return { get, set, isExpired, clear, getOrFetch }
}
