<template>
  <div class="chat-container">
    <h1>AI Chat</h1>
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role, { 'biased': message.isBiased }]">
        <div class="message-content" v-if="message.role === 'user'">{{ message.content }}</div>
        <div class="message-content markdown-body" v-else v-html="renderMarkdown(message.content)"></div>
        <div class="bias-warning" v-if="message.isBiased">
          此内容包含{{ message.biasType }}偏见性信息，请仔细甄别
        </div>
      </div>
    </div>
    <div class="input-area">
      <textarea
        v-model="userInput"
        @keydown.enter.prevent="sendMessage"
        placeholder="Type your message here..."
        :disabled="isLoading"
      ></textarea>
      <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
        {{ isLoading ? 'Sending...' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const currentStream = ref(null)

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 渲染 markdown 并清理 HTML
const renderMarkdown = (content) => {
  return DOMPurify.sanitize(marked(content))
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const stopStream = () => {
  if (currentStream.value) {
    currentStream.value.close()
    currentStream.value = null
  }
}

// 检测文本偏见
const checkBias = async (text) => {
  try {
    console.log('Sending text for bias check:', text)
    // 调用 BLDS 项目的预测接口
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(text)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Bias detection result:', result)
    
    // 根据接口返回格式处理结果
    return {
      isBiased: result.data !== 'false', // 如果返回的不是 'false'，则认为存在偏见
      biasType: result.data === 'false' ? null : result.data // 如果是 'false'，则没有偏见类型
    }
  } catch (error) {
    console.error('Error checking bias:', error)
    // 在出错时返回默认值
    return {
      isBiased: false,
      biasType: null
    }
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const userMessage = userInput.value.trim()
  messages.value.push({ role: 'user', content: userMessage })
  userInput.value = ''
  await scrollToBottom()

  isLoading.value = true
  messages.value.push({ role: 'assistant', content: '', isBiased: false, biasType: null })

  // 停止之前的流
  stopStream()

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages.value.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantMessage = ''

    currentStream.value = {
      close: () => reader.cancel()
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '') continue
        if (line === 'data: [DONE]') continue

        try {
          const jsonStr = line.replace(/^data: /, '')
          const data = JSON.parse(jsonStr)
          
          if (data.choices && data.choices[0]?.delta?.content) {
            assistantMessage += data.choices[0].delta.content
            messages.value[messages.value.length - 1].content = assistantMessage
            await scrollToBottom()
          }
        } catch (e) {
          console.error('Error parsing stream data:', e)
        }
      }
    }

    // 在消息完成后检查偏见
    const biasResult = await checkBias(assistantMessage)
    messages.value[messages.value.length - 1].isBiased = biasResult.isBiased
    messages.value[messages.value.length - 1].biasType = biasResult.biasType
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      status: error.status
    })
    let errorMessage = 'Sorry, there was an error processing your request.'
    if (error.response) {
      console.error('Error response:', error.response.data)
      errorMessage = `Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`
    } else if (error.request) {
      console.error('Error request:', error.request)
      errorMessage = 'Network error. Please check your connection.'
    }
    messages.value[messages.value.length - 1].content = errorMessage
  } finally {
    isLoading.value = false
    currentStream.value = null
  }
}

onMounted(() => {
  scrollToBottom()
})

// 组件卸载时停止流
onUnmounted(() => {
  stopStream()
})
</script>

<style>
@import 'github-markdown-css/github-markdown.css';

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 15px;
  margin-bottom: 10px;
  position: relative;
}

.message.user {
  align-self: flex-end;
  background-color: #007bff;
  color: white;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f8f9fa;
  color: #212529;
  border: 1px solid #dee2e6;
}

.message.assistant.biased {
  border: 2px solid #dc3545;
  background-color: #fff5f5;
}

.bias-warning {
  margin-top: 8px;
  padding: 8px;
  background-color: #dc3545;
  color: white;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.message-content {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-content.markdown-body {
  background-color: transparent;
  padding: 0;
}

.markdown-body {
  font-size: 16px;
  line-height: 1.6;
  color: #212529;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  color: #212529;
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
  color: #212529;
}

.markdown-body pre {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  border: 1px solid #dee2e6;
}

.markdown-body code {
  background-color: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  color: #e83e8c;
}

.markdown-body blockquote {
  padding: 0 1em;
  color: #6c757d;
  border-left: 0.25em solid #dee2e6;
  margin: 0 0 16px 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
  color: #212529;
}

.markdown-body li {
  margin-top: 0.25em;
}

.markdown-body a {
  color: #007bff;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #dee2e6;
}

.markdown-body table tr {
  background-color: #fff;
  border-top: 1px solid #dee2e6;
}

.markdown-body table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
}

textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  height: 40px;
  font-family: inherit;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}
</style> 