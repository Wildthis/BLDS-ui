<template>
  <div class="charts-container">
    <div class="charts-header">
      <h1>数据统计</h1>
      <div class="date-filter">
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
    </div>

    <div class="charts-content">
      <div class="chart-card">
        <h2>偏见类型分布</h2>
        <div ref="pieChart" class="chart"></div>
      </div>
      <div class="chart-card">
        <h2>偏见率趋势</h2>
        <div ref="lineChart" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import request from '@/utils/request'

export default {
  name: 'Charts',
  data() {
    return {
      dateRange: [],
      pieChart: null,
      lineChart: null,
      isLoading: false
    }
  },
  mounted() {
    this.initCharts()
    this.loadData()
  },
  beforeUnmount() {
    if (this.pieChart) {
      this.pieChart.dispose()
    }
    if (this.lineChart) {
      this.lineChart.dispose()
    }
  },
  methods: {
    initCharts() {
      // 初始化饼图
      this.pieChart = echarts.init(this.$refs.pieChart)
      this.pieChart.setOption({
        title: {
          text: '偏见类型分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['种族偏见', '地域偏见', '性别偏见', '无偏见']
        },
        series: [
          {
            name: '偏见类型',
            type: 'pie',
            radius: '50%',
            data: [],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      })

      // 初始化折线图
      this.lineChart = echarts.init(this.$refs.lineChart)
      this.lineChart.setOption({
        title: {
          text: '偏见率趋势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}%'
          }
        },
        series: [
          {
            name: '偏见率',
            type: 'line',
            data: [],
            smooth: true,
            markPoint: {
              data: [
                { type: 'max', name: '最大值' },
                { type: 'min', name: '最小值' }
              ]
            }
          }
        ]
      })

      // 监听窗口大小变化
      window.addEventListener('resize', this.handleResize)
    },

    handleResize() {
      this.pieChart?.resize()
      this.lineChart?.resize()
    },

    async loadData() {
      this.isLoading = true
      try {
        const params = {}
        if (this.dateRange && this.dateRange.length === 2) {
          params.start_date = this.formatDate(this.dateRange[0])
          params.end_date = this.formatDate(this.dateRange[1])
        }

        const result = await request({
          url: '/api/stats/charts',
          method: 'get',
          params
        })

        if (result.code === 0) {
          this.updateCharts(result.data)
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
        alert('加载统计数据失败')
      } finally {
        this.isLoading = false
      }
    },

    updateCharts(data) {
      // 更新饼图数据
      const pieData = [
        { value: data.race || 0, name: '种族偏见' },
        { value: data.region || 0, name: '地域偏见' },
        { value: data.gender || 0, name: '性别偏见' },
        { value: data.false || 0, name: '无偏见' }
      ]
      this.pieChart.setOption({
        series: [{
          data: pieData
        }]
      })

      // 更新折线图数据
      if (data.trend && Array.isArray(data.trend)) {
        this.lineChart.setOption({
          xAxis: {
            data: data.trend.map(item => item.date)
          },
          series: [{
            data: data.trend.map(item => (item.bias_rate * 100).toFixed(2))
          }]
        })
      } else {
        // 如果没有趋势数据，显示空图表
        this.lineChart.setOption({
          xAxis: {
            data: []
          },
          series: [{
            data: []
          }]
        })
      }
    },

    handleDateChange() {
      this.loadData()
    },

    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toISOString().split('T')[0]
    }
  }
}
</script>

<style scoped>
.charts-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.charts-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-filter label {
  font-weight: 500;
  color: #333;
}

.charts-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-card h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  text-align: center;
}

.chart {
  height: 400px;
  width: 100%;
}
</style> 