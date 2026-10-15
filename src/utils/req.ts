import axios from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

// 创建实例
const service: AxiosInstance = axios.create({
  timeout: 15000,
})

// 请求拦截器：啥也不做，外部接口不需要token
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (err) => Promise.reject(err),
)

// 响应拦截器：直接返回原始response，不剥data，外部接口返回格式不统一
service.interceptors.response.use(
  (res: AxiosResponse) => {
    return res
  },
  (err) => {
    console.error('请求异常：', err)
    return Promise.reject(err)
  },
)

// 封装通用get方法
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return service.get<T>(url, config)
}

export default service
