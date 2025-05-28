<template>
  <div class="feedback-container">
    <div class="feedback-header">
      <h1>用户反馈管理</h1>
      <div class="header-actions">
        <button @click="exportToExcel" class="export-btn">
          导出数据
        </button>
      </div>
    </div>

    <div class="feedback-filters">
      <div class="filter-group">
        <label>时间范围：</label>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateChange"
        />
      </div>
      <div class="filter-group">
        <label>反馈类型：</label>
        <select v-model="feedbackType" @change="loadFeedbackData">
          <option value="all">全部</option>
          <option value="correct">准确</option>
          <option value="incorrect">不准确</option>
        </select>
      </div>
    </div>

    <div class="feedback-table">
      <table>
        <thead>
          <tr>
            <th>检测ID</th>
            <th>检测文本</th>
            <th>偏见类型</th>
            <th>置信度</th>
            <th>用户反馈</th>
            <th>反馈内容</th>
            <th>反馈时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in feedbackData" :key="item.id">
            <td>{{ item.record_id }}</td>
            <td class="text-cell">{{ item.text_content }}</td>
            <td>{{ item.bias_type }}</td>
            <td>{{ (item.confidence * 100).toFixed(2) }}%</td>
            <td>
              <span :class="['feedback-tag', item.is_correct ? 'correct' : 'incorrect']">
                {{ item.is_correct ? '准确' : '不准确' }}
              </span>
            </td>
            <td class="text-cell">{{ item.feedback_content || '-' }}</td>
            <td>{{ formatDate(item.feedback_time) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button 
        :disabled="currentPage === 1" 
        @click="changePage(currentPage - 1)"
      >
        上一页
      </button>
      <span>第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
      <button 
        :disabled="currentPage === totalPages" 
        @click="changePage(currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script>
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

export default {
  name: 'Feedback',
  data() {
    return {
      feedbackData: [],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      dateRange: [],
      feedbackType: 'all',
      isLoading: false
    }
  },
  created() {
    this.loadFeedbackData()
  },
  methods: {
    async loadFeedbackData() {
      this.isLoading = true
      try {
        const params = {
          page: this.currentPage,
          page_size: this.pageSize,
          feedback_type: this.feedbackType
        }

        if (this.dateRange && this.dateRange.length === 2) {
          params.start_date = this.formatDate(this.dateRange[0])
          params.end_date = this.formatDate(this.dateRange[1])
        }

        const result = await request({
          url: '/api/feedback/list',
          method: 'get',
          params
        })

        if (result.code === 0 || result.code === 200) {
          this.feedbackData = result.data.records
          this.totalPages = Math.ceil(result.data.total / this.pageSize)
        }
      } catch (error) {
        console.error('Error loading feedback data:', error)
        ElMessage.error('加载反馈数据失败')
      } finally {
        this.isLoading = false
      }
    },

    changePage(page) {
      this.currentPage = page
      this.loadFeedbackData()
    },

    handleDateChange() {
      this.currentPage = 1
      this.loadFeedbackData()
    },

    formatDate(date) {
      if (!date) return '-'
      const d = new Date(date)
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    async exportToExcel() {
      try {
        // 获取所有数据
        const result = await request({
          url: '/api/feedback/export',
          method: 'get'
        })

        if (result.code === 0 || result.code === 200) {
          const data = result.data

          // 准备Excel数据
          const excelData = data.map(item => ({
            '检测ID': item.record_id,
            '检测文本': item.text_content,
            '偏见类型': item.bias_type,
            '置信度': `${(item.confidence * 100).toFixed(2)}%`,
            '用户反馈': item.is_correct ? '准确' : '不准确',
            '反馈内容': item.feedback_content || '-',
            '反馈时间': this.formatDate(item.feedback_time)
          }))

          // 创建工作簿
          const ws = XLSX.utils.json_to_sheet(excelData)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, '用户反馈数据')

          // 导出文件
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          saveAs(blob, `用户反馈数据_${this.formatDate(new Date())}.xlsx`)
          
          ElMessage.success('导出成功')
        } else {
          throw new Error(result.message || '导出数据失败')
        }
      } catch (error) {
        console.error('Error exporting data:', error)
        ElMessage.error(error.message || '导出数据失败')
      }
    }
  }
}
</script>

<style scoped>
.feedback-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feedback-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.export-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-btn:hover {
  background-color: #45a049;
}

.feedback-filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #333;
}

.filter-group select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.feedback-table {
  margin-bottom: 20px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.text-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feedback-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.feedback-tag.correct {
  background-color: #e6f4ea;
  color: #1e7e34;
}

.feedback-tag.incorrect {
  background-color: #fbe9e7;
  color: #d32f2f;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background-color: #e9ecef;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  color: #666;
}
</style> 