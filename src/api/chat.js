import request from '@/utils/request'

// 检查文本偏见
export function checkBias(text) {
  return request({
    url: '/api/predict',
    method: 'post',
    data: { text }
  })
} 