import request from '@/utils/request'

export function checkBias(text) {
  return request({
    url: '/api/predict',
    method: 'post',
    data: { text }
  })
} 