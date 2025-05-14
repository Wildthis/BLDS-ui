import request from '@/utils/request'

export function submitFeedback(detectionId, isAccurate) {
  return request({
    url: '/api/feedback',
    method: 'post',
    data: {
      record_id: detectionId,
      is_correct: isAccurate
    }
  })
} 