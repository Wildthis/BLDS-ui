import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || 'http://localhost:8080',
  timeout: 5000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    console.log('API响应:', res)
    
    // 如果响应成功（code === 0 或 code === 200），直接返回数据
    if (res.code === 0 || res.code === 200) {
      return res
    }
    
    // 处理错误情况
    ElMessage({
      message: res.message || 'Error',
      type: 'error',
      duration: 5 * 1000
    })
    
    // 401: 未登录或 token 过期
    if (res.code === 401) {
      // 清除本地存储的 token 和用户信息
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // 重定向到登录页
      router.push('/login')
    }
    
    return Promise.reject(new Error(res.message || 'Error'))
  },
  error => {
    console.error('Response error:', error)
    ElMessage({
      message: error.message || '请求失败',
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service 