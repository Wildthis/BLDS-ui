<template>
  <div id="app">
    <el-container v-show="isLoggedIn">
      <el-header>
        <div class="header-content">
          <h2>偏见检测系统</h2>
          <div class="user-info">
            <span>{{ username }}</span>
            <el-button type="text" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="200px">
          <el-menu
            :router="true"
            :default-active="$route.path"
            class="el-menu-vertical"
          >
            <el-menu-item index="/chat">
              <el-icon><ChatDotRound /></el-icon>
              <span>偏见检测</span>
            </el-menu-item>
            
            <el-menu-item index="/feedback">
              <el-icon><ChatLineRound /></el-icon>
              <span>反馈管理</span>
            </el-menu-item>
            
            <el-menu-item v-if="isAdmin" index="/charts">
              <el-icon><TrendCharts /></el-icon>
              <span>统计分析</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
    
    <router-view v-show="!isLoggedIn" v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { logout } from '@/api/auth'
import { ChatDotRound, ChatLineRound, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isLoggedIn = computed(() => !!localStorage.getItem('token'))
const isAdmin = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role === 'admin'
})
const username = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.username || ''
})

async function handleLogout() {
  try {
    await logout()
    // 清除本地存储的 token 和用户信息
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // 重定向到登录页
    router.push('/login')
    ElMessage.success('退出成功')
  } catch (error) {
    console.error('退出失败:', error)
    ElMessage.error('退出失败，请稍后重试')
  }
}
</script>

<style>
#app {
  height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background: linear-gradient(90deg, #409EFF 0%, #66b1ff 100%);
  color: white;
  line-height: 60px;
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info span {
  color: white;
  font-size: 14px;
}

:deep(.el-button--text) {
  color: white;
  font-size: 14px;
  padding: 0 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--text:hover) {
  color: #ffd04b;
  transform: translateY(-1px);
}

.el-aside {
  background-color: white;
  border-right: 1px solid #e6e6e6;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s ease;
}

:deep(.el-menu-item:hover) {
  background-color: #ecf5ff;
  color: #409EFF;
}

:deep(.el-menu-item.is-active) {
  background-color: #ecf5ff;
  color: #409EFF;
  font-weight: 600;
}

:deep(.el-menu-item .el-icon) {
  color: #909399;
  transition: all 0.3s ease;
}

:deep(.el-menu-item:hover .el-icon),
:deep(.el-menu-item.is-active .el-icon) {
  color: #409EFF;
}

.el-main {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-x: hidden;
}

/* 添加过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式布局 */
@media screen and (max-width: 768px) {
  .el-aside {
    width: 64px !important;
  }
  
  .header-content h2 {
    font-size: 20px;
  }
  
  .user-info span {
    display: none;
  }
}
</style> 