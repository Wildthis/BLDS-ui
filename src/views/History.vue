<template>
  <div class="history-container">
    <div class="history-header">
      <h1>历史记录</h1>
      <div class="stats-cards">
        <div class="stat-card">
          <h3>总检测次数</h3>
          <p>{{ stats.total_detections || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>偏见文本数</h3>
          <p>{{ stats.biased_count || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>偏见类型数</h3>
          <p>{{ stats.bias_types_count || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="history-list">
      <div v-for="record in history" :key="record.id" class="history-item">
        <div class="record-header">
          <span class="detection-time">
            {{ new Date(record.detection_time).toLocaleString() }}
          </span>
          <span class="bias-type" :class="{ 'biased': record.is_biased }">
            {{ record.bias_type }}
          </span>
        </div>
        <div class="text-content">{{ record.text_content }}</div>
        <div class="record-footer">
          <span class="confidence">
            置信度: {{ (record.confidence * 100).toFixed(2) }}%
          </span>
          <div class="feedback-info" v-if="record.feedback">
            <span class="feedback-status" :class="{ 'correct': record.feedback.is_correct }">
              {{ record.feedback.is_correct ? '准确' : '不准确' }}
            </span>
            <span v-if="record.feedback.feedback_content" class="feedback-content">
              {{ record.feedback.feedback_content }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button @click="loadHistory(page - 1)" :disabled="page === 1">上一页</button>
      <span>第 {{ page }} 页</span>
      <button @click="loadHistory(page + 1)" :disabled="!hasMore">下一页</button>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'History',
  data() {
    return {
      history: [],
      page: 1,
      hasMore: true,
      stats: {}
    }
  },
  methods: {
    async loadHistory(page) {
      try {
        const result = await request({
          url: '/api/history',
          method: 'get',
          params: {
            page: page,
            page_size: 10
          }
        })
        if (result.code === 0) {
          this.history = result.data
          this.page = page
          this.hasMore = result.data.length === 10
        }
      } catch (error) {
        console.error('Error loading history:', error)
      }
    },

    async loadStats() {
      try {
        const result = await request({
          url: '/api/stats',
          method: 'get'
        })
        if (result.code === 0) {
          this.stats = result.data
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
  },
  mounted() {
    this.loadHistory(1)
    this.loadStats()
  }
}
</script>

<style scoped>
.history-container {
  height: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.history-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.history-header h1 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.stat-card h3 {
  margin: 0;
  font-size: 16px;
  color: #666;
}

.stat-card p {
  margin: 10px 0 0;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.history-item {
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.detection-time {
  color: #666;
  font-size: 14px;
}

.bias-type {
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #e9ecef;
  font-size: 14px;
}

.bias-type.biased {
  background-color: #ff6b6b;
  color: white;
}

.text-content {
  margin: 10px 0;
  color: #333;
  line-height: 1.5;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
}

.confidence {
  color: #666;
}

.feedback-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feedback-status {
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #e9ecef;
}

.feedback-status.correct {
  background-color: #4CAF50;
  color: white;
}

.feedback-content {
  color: #666;
  font-style: italic;
}

.pagination {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  border-top: 1px solid #eee;
}

.pagination button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background-color: #0056b3;
}

.pagination span {
  color: #666;
}
</style> 