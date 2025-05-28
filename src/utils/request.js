import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const service = axios.create({
    baseURL: 'http://localhost:8080',  // API的base_url
    timeout: 15000,  // 请求超时时间
    withCredentials: true,  // 允许携带cookie
    headers: {
        'Content-Type': 'application/json'
    }
})

// request拦截器
service.interceptors.request.use(
    config => {
        // 从localStorage获取token
        const token = localStorage.getItem('token')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    error => {
        console.log('Request error:', error)
        return Promise.reject(error)
    }
)

// response拦截器
service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code === 0 || res.code === 200) {
            return res
        } else {
            ElMessage({
                message: res.message || 'Error',
                type: 'error',
                duration: 5 * 1000
            })
            return Promise.reject(new Error(res.message || 'Error'))
        }
    },
    error => {
        console.log('Response error:', error)
        ElMessage({
            message: error.message || '请求失败',
            type: 'error',
            duration: 5 * 1000
        })
        return Promise.reject(error)
    }
)

export default service 