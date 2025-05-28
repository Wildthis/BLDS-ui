<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>DeepSeek 对话</h1>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" 
           :class="['message', message.type]">
        <div class="message-content">
          <div class="message-text markdown-body" v-html="formatMessage(message.content)"></div>
          
          <!-- 偏见检测结果 -->
          <div v-if="message.type === 'ai' && message.detection" class="detection-info">
            <div class="detection-header">
              <span class="detection-label">偏见检测结果：</span>
              <span :class="['bias-type', message.detection.is_biased ? 'biased' : 'not-biased']">
                {{ message.detection.bias_type }}
              </span>
              <span class="confidence">置信度：{{ (message.detection.confidence * 100).toFixed(1) }}%</span>
            </div>
            
            <!-- 反馈选项 -->
            <div class="feedback-options">
              <span class="feedback-label">检测是否准确？</span>
              <el-button-group>
                <el-button size="small" type="primary" @click="submitFeedback(message.detection.id, true)">
                  准确
                </el-button>
                <el-button size="small" type="danger" @click="showFeedbackDialog(message.detection.id)">
                  不准确
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈对话框 -->
    <el-dialog
      v-model="feedbackDialogVisible"
      title="提交反馈"
      width="500px"
    >
      <el-form :model="feedbackForm" label-width="80px">
        <el-form-item label="反馈内容">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入您的反馈内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="feedbackDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitFeedbackWithContent">
            提交
          </el-button>
        </span>
      </template>
    </el-dialog>

    <div class="chat-input">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="请输入您的问题..."
        @keyup.enter.native="sendMessage"
      />
      <el-button type="primary" @click="sendMessage" :loading="loading">
        发送
      </el-button>
    </div>
  </div>
</template>

<script>
import { checkBias } from '@/api/chat'
import { submitFeedback } from '@/api/feedback'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

export default {
  name: 'Chat',
  data() {
    return {
      inputMessage: '',
      loading: false,
      messages: [],
      currentStreamingMessage: null,
      accumulatedText: '',
      baseUrl: 'https://api.deepseek.com/v1',
      feedbackDialogVisible: false,
      feedbackForm: {
        detectionId: null,
        content: ''
      }
    }
  },
  methods: {
    formatMessage(text) {
      return DOMPurify.sanitize(marked(text))
    },

    async sendMessage() {
      if (!this.inputMessage.trim()) return
      
      // 添加用户消息
      this.messages.push({
        type: 'user',
        content: this.inputMessage
      })
      
      // 清空输入框
      const userMessage = this.inputMessage
      this.inputMessage = ''
      
      // 添加AI消息占位
      this.currentStreamingMessage = {
        type: 'ai',
        content: '',
        detection: null
      }
      this.messages.push(this.currentStreamingMessage)
      
      try {
        this.loading = true
        this.accumulatedText = ''
        
        // 调用 DeepSeek API
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: userMessage
              }
            ],
            stream: true
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `服务器错误 (${response.status})`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ''
                if (content) {
                  this.accumulatedText += content
                  this.currentStreamingMessage.content = this.accumulatedText
                  this.scrollToBottom()
                }
              } catch (e) {
                console.error('Error parsing chunk:', e)
              }
            }
          }
        }

        // 完成流式输出后，进行偏见检测
        try {
          const result = await request.post('/api/predict', {
            text: this.accumulatedText
          })
          
          console.log('Bias detection result:', result)
          
          if (result.code === 200) {
            // 更新检测结果
            this.currentStreamingMessage.detection = {
              id: result.data.record_id,
              bias_type: result.data.bias_type,
              is_biased: result.data.is_biased,
              confidence: result.data.confidence
            }
          } else {
            throw new Error(result.message || '检测失败')
          }
        } catch (error) {
          console.error('Error in bias detection:', error)
          ElMessage.error('偏见检测失败，请稍后重试')
        }
      } catch (error) {
        console.error('Error in chat:', error)
        ElMessage.error(error.message || '发送消息失败')
        // 移除失败的AI消息
        this.messages.pop()
      } finally {
        this.loading = false
        this.currentStreamingMessage = null
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    showFeedbackDialog(detectionId) {
      this.feedbackForm.detectionId = detectionId
      this.feedbackForm.content = ''
      this.feedbackDialogVisible = true
    },

    async submitFeedbackWithContent() {
      if (!this.feedbackForm.content.trim()) {
        ElMessage.warning('请输入反馈内容')
        return
      }

      try {
        const result = await submitFeedback({
          record_id: this.feedbackForm.detectionId,
          is_correct: false,
          feedback_content: this.feedbackForm.content
        })
        
        if (result.code === 200) {
          ElMessage.success('感谢您的反馈！')
          this.feedbackDialogVisible = false
        } else if (result.code === 404) {
          ElMessage.error('检测记录不存在，请刷新页面重试')
        } else {
          throw new Error(result.message || '提交反馈失败')
        }
      } catch (error) {
        console.error('Error submitting feedback:', error)
        ElMessage.error(error.message || '提交反馈失败')
      }
    },
    
    async submitFeedback(detectionId, isAccurate) {
      try {
        if (!detectionId) {
          ElMessage.error('检测记录ID不存在')
          return
        }
        
        const result = await submitFeedback({
          record_id: detectionId,
          is_correct: isAccurate
        })
        
        if (result.code === 200) {
          ElMessage.success('感谢您的反馈！')
        } else if (result.code === 404) {
          ElMessage.error('检测记录不存在，请刷新页面重试')
        } else {
          throw new Error(result.message || '提交反馈失败')
        }
      } catch (error) {
        console.error('Error submitting feedback:', error)
        ElMessage.error(error.message || '提交反馈失败')
      }
    },
    
    scrollToBottom() {
      const container = this.$refs.messagesContainer
      container.scrollTop = container.scrollHeight
    }
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.chat-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.ai {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #f0f2f5;
}

.message.user .message-content {
  background-color: #007bff;
  color: white;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #1a1a1a;
  line-height: 1.6;
}

.message.user .message-text {
  color: white;
}

.message.ai .message-text {
  color: #1a1a1a;
}

.message.ai .message-content.error {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
}

.message.ai .message-content.error .message-text {
  color: #ff4d4f;
}

.detection-info {
  margin-top: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.detection-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detection-label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.bias-type {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.bias-type.biased {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.bias-type.not-biased {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.confidence {
  color: #909399;
  font-size: 14px;
  background-color: #f4f4f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.feedback-options {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.feedback-label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
  background-color: #fff;
}

.chat-input .el-input {
  flex: 1;
}

.chat-input .el-button {
  align-self: flex-end;
}

:deep(.markdown-body) {
  background-color: transparent;
  font-size: 14px;
  color: #1a1a1a;
}

:deep(.markdown-body pre) {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  border: 1px solid #e1e4e8;
}

:deep(.markdown-body code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  color: #1a1a1a;
}

:deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
  color: #1a1a1a;
}

:deep(.markdown-body p) {
  margin: 0.5em 0;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #1a1a1a;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.markdown-body li) {
  margin: 0.25em 0;
}

:deep(.markdown-body blockquote) {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
}

:deep(.markdown-body table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

:deep(.markdown-body table tr) {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style> 