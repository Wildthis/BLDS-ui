<template>
  <div class="login-container">
    <div class="login-box">
      <h2>偏见检测系统</h2>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-width="0px">
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="用户名"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                class="submit-button"
                @click="handleLogin"
              >登录</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-width="0px">
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="用户名"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="确认密码"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                class="submit-button"
                @click="handleRegister"
              >注册</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login, register } from '@/api/auth'

const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

// 注册表单
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 登录处理
async function handleLogin() {
  if (!loginFormRef.value) return
  
  try {
    console.log('开始登录流程...')
    await loginFormRef.value.validate()
    loading.value = true
    
    console.log('发送登录请求...')
    const res = await login(loginForm)
    console.log('登录响应:', res)
    
    if (res.code === 0 || res.code === 200) {
      console.log('登录成功，保存用户信息...')
      // 保存 token 和用户信息
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      console.log('用户信息:', res.data.user)
      ElMessage.success('登录成功')
      
      // 根据用户角色跳转到不同页面
      const targetPath = res.data.user.role === 'admin' ? '/charts' : '/chat'
      console.log('准备跳转到:', targetPath)
      
      try {
        console.log('开始路由跳转...')
        await router.push(targetPath)
        console.log('路由跳转成功')
      } catch (routerError) {
        console.error('路由跳转失败:', routerError)
        console.error('路由错误详情:', {
          message: routerError.message,
          stack: routerError.stack
        })
        ElMessage.error('页面跳转失败，请手动刷新页面')
      }
    } else {
      console.error('登录失败:', res.message)
      ElMessage.error(res.message || '登录失败')
    }
  } catch (error) {
    console.error('登录过程发生错误:', error)
    if (error.message) {
      console.error('错误信息:', error.message)
      ElMessage.error(error.message)
    } else {
      console.error('未知错误:', error)
      ElMessage.error('登录失败，请稍后重试')
    }
  } finally {
    loading.value = false
    console.log('登录流程结束')
  }
}

// 注册处理
async function handleRegister() {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    loading.value = true
    
    const res = await register({
      username: registerForm.username,
      password: registerForm.password
    })
    if (res.code === 0) {
      ElMessage.success('注册成功，请登录')
      activeTab.value = 'login'
      // 清空注册表单
      registerForm.username = ''
      registerForm.password = ''
      registerForm.confirmPassword = ''
    } else {
      ElMessage.error(res.message || '注册失败')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      console.error('注册失败:', error)
      ElMessage.error('注册失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.login-box:hover {
  transform: translateY(-5px);
}

.login-box h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #409EFF;
  font-size: 28px;
  font-weight: 600;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  height: 50px;
  line-height: 50px;
}

:deep(.el-tabs__item.is-active) {
  color: #409EFF;
}

:deep(.el-tabs__active-bar) {
  background-color: #409EFF;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409EFF inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409EFF inset;
}

:deep(.el-button--primary) {
  background-color: #409EFF;
  border-color: #409EFF;
  height: 44px;
  font-size: 16px;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  background-color: #66b1ff;
  border-color: #66b1ff;
  transform: translateY(-2px);
}

:deep(.el-button--primary:active) {
  background-color: #3a8ee6;
  border-color: #3a8ee6;
  transform: translateY(0);
}

.submit-button {
  width: 100%;
  margin-top: 10px;
}

:deep(.el-form-item__error) {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}
</style> 