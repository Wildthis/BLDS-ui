import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import Chat from '@/views/Chat.vue'
import History from '../views/History.vue'
import Feedback from '@/views/Feedback.vue'
import Charts from '@/views/Charts.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'history',
    component: History,
    meta: { requiresAuth: true }
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: Feedback,
    meta: { requiresAuth: true }
  },
  {
    path: '/charts',
    name: 'Charts',
    component: Charts,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/',
    redirect: '/chat'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  console.log('路由守卫触发:', {
    to: to.path,
    from: from.path,
    requiresAuth: to.meta.requiresAuth,
    requiresAdmin: to.meta.requiresAdmin
  })
  
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  console.log('当前用户状态:', {
    hasToken: !!token,
    userRole: user.role
  })
  
  if (to.meta.requiresAuth && !token) {
    console.log('需要登录但未登录，重定向到登录页')
    next('/login')
  } else if (to.meta.requiresAdmin && user.role !== 'admin') {
    console.log('需要管理员权限但不是管理员，重定向到聊天页')
    next('/chat')
  } else if (to.path === '/login' && token) {
    console.log('已登录用户访问登录页，重定向到对应页面')
    next(user.role === 'admin' ? '/charts' : '/chat')
  } else {
    console.log('允许导航到目标页面')
    next()
  }
})

export default router