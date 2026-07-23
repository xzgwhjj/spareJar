<template>
  <view class="cpp">
    <!-- 导航头部 -->
    <view class="cpp-head">
      <view class="cpp-nav" @click="prev">‹</view>
      <text class="cpp-title">{{ headerLabel }}</text>
      <view class="cpp-nav" @click="next">›</view>
    </view>

    <!-- 日视图：月历网格 -->
    <view v-if="dim === 'day'" class="cpp-day">
      <view class="cpp-week">
        <text v-for="w in WEEK" :key="w" class="cpp-week-cell">{{ w }}</text>
      </view>
      <view class="cpp-grid">
        <view v-for="(c, i) in dayCells" :key="i" class="cpp-cell"
          :class="{ blank: c.blank, selected: c.selected, today: c.isToday }" @click="!c.blank && pick(c.key)">
          <template v-if="!c.blank">
            <text class="cpp-day-num">{{ c.day }}</text>
            <view class="cpp-sum">
              <text v-if="c.income > 0" class="cpp-amt inc">+{{ amt(c.income) }}</text>
              <text v-if="c.expense > 0" class="cpp-amt exp">-{{ amt(c.expense) }}</text>
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 月视图：1-12 宫格 -->
    <view v-else-if="dim === 'month'" class="cpp-month">
      <view class="cpp-grid-3">
        <view v-for="c in monthCells" :key="c.key" class="cpp-month-cell" :class="{ selected: c.selected }"
          @click="pick(c.key)">
          <text class="cpp-month-num">{{ c.m }}月</text>
          <view class="cpp-sum">
            <text v-if="c.income > 0" class="cpp-amt inc">+{{ amt(c.income) }}</text>
            <text v-if="c.expense > 0" class="cpp-amt exp">-{{ amt(c.expense) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 年视图：年份范围列表 -->
    <view v-else class="cpp-year">
      <view class="cpp-grid-3">
        <view v-for="c in yearCells" :key="c.y" class="cpp-year-cell" :class="{ selected: c.selected }"
          @click="pick(String(c.y))">
          <text class="cpp-year-num">{{ c.y }}</text>
          <view class="cpp-sum">
            <text v-if="c.income > 0" class="cpp-amt inc">+{{ amt(c.income) }}</text>
            <text v-if="c.expense > 0" class="cpp-amt exp">-{{ amt(c.expense) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  dim: { type: String, default: 'day' }, // 'day' | 'month' | 'year'
  modelValue: { type: String, default: '' },
  dayExpenseMap: { type: Object, default: () => ({}) },
  dayIncomeMap: { type: Object, default: () => ({}) },
  monthExpenseMap: { type: Object, default: () => ({}) },
  monthIncomeMap: { type: Object, default: () => ({}) },
  yearExpenseMap: { type: Object, default: () => ({}) },
  yearIncomeMap: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'change'])

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

const pad2 = (n) => (n < 10 ? `0${n}` : String(n))
const todayKey = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
})()

// 导航视图状态（与选中值解耦：翻月/翻年只改视图，不改选中）
const view = reactive({ y: 2026, m: 7, startYear: 2020 })

function syncViewFromValue() {
  if (props.dim === 'day') {
    const [y, m] = props.modelValue.split('-').map(Number)
    view.y = y
    view.m = m
  } else if (props.dim === 'month') {
    const [y] = props.modelValue.split('-').map(Number)
    view.y = y
  } else {
    const y = Number(props.modelValue) || new Date().getFullYear()
    view.startYear = y - 6 // 选中年居中，前后各约 6 年
  }
}
syncViewFromValue()
watch(() => [props.dim, props.modelValue], syncViewFromValue)

const headerLabel = computed(() => {
  if (props.dim === 'day') return `${view.y}年${view.m}月`
  if (props.dim === 'month') return `${view.y}年`
  return `${view.startYear} - ${view.startYear + 11}`
})

const dayCells = computed(() => {
  const y = view.y
  const m = view.m
  const first = new Date(y, m - 1, 1)
  const lead = (first.getDay() + 6) % 7 // 周一为一周起点
  const days = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push({ blank: true })
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad2(m)}-${pad2(d)}`
    cells.push({
      blank: false,
      day: d,
      key,
      expense: props.dayExpenseMap[key] || 0,
      income: props.dayIncomeMap[key] || 0,
      selected: key === props.modelValue,
      isToday: key === todayKey,
    })
  }
  return cells
})

const monthCells = computed(() => {
  const y = view.y
  const cells = []
  for (let mo = 1; mo <= 12; mo++) {
    const key = `${y}-${pad2(mo)}`
    cells.push({ m: mo, key, expense: props.monthExpenseMap[key] || 0, income: props.monthIncomeMap[key] || 0, selected: key === props.modelValue })
  }
  return cells
})

const yearCells = computed(() => {
  const cells = []
  for (let i = 0; i < 12; i++) {
    const y = view.startYear + i
    cells.push({ y, expense: props.yearExpenseMap[String(y)] || 0, income: props.yearIncomeMap[String(y)] || 0, selected: String(y) === props.modelValue })
  }
  return cells
})

function prev() {
  if (props.dim === 'day') {
    view.m--
    if (view.m < 1) {
      view.m = 12
      view.y--
    }
  } else if (props.dim === 'month') {
    view.y--
  } else {
    view.startYear -= 12
  }
}
function next() {
  if (props.dim === 'day') {
    view.m++
    if (view.m > 12) {
      view.m = 1
      view.y++
    }
  } else if (props.dim === 'month') {
    view.y++
  } else {
    view.startYear += 12
  }
}

function pick(key) {
  emit('update:modelValue', key)
  emit('change', key)
}

// 分 → 元，紧凑展示（整数去小数，过万用万）
function amt(fen) {
  const yuan = fen / 100
  if (yuan >= 10000) return (yuan / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return yuan.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
</script>

<style scoped lang="scss">
.cpp {
  --radius: 20rpx;
  margin-top: 8rpx;

  .cpp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 12rpx 16rpx;

    .cpp-title {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--ink);
    }

    .cpp-nav {
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      background: var(--g0);
      border: 2rpx solid var(--g2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      color: var(--ink2);
      font-weight: 700;

      &:active {
        background: var(--g1);
      }
    }
  }

  .cpp-week {
    display: flex;
    margin-bottom: 8rpx;

    .cpp-week-cell {
      flex: 1;
      text-align: center;
      font-size: 22rpx;
      color: var(--ink3);
    }
  }

  .cpp-grid {
    display: flex;
    flex-wrap: wrap;
  }

  // 格子下方的收/支汇总（收入绿、支出红，带 +-）
  .cpp-sum {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.15;
    margin-top: 2rpx;
  }

  .cpp-amt {
    font-size: 16rpx;
    font-weight: 600;
    white-space: nowrap;

    &.inc {
      color: var(--g5);
    }

    &.exp {
      color: var(--red-soft);
    }
  }

  .cpp-cell {
    width: calc(100% / 7);
    height: 100rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border-radius: var(--radius);

    &.blank {
      visibility: hidden;
    }

    .cpp-day-num {
      font-size: 26rpx;
      color: var(--ink);
      line-height: 1.2;
    }

    &.today {
      .cpp-day-num {
        color: var(--g5);
        font-weight: 800;
      }
    }

    &.selected {
      background: var(--brand-grad, linear-gradient(135deg, var(--g4), var(--g5)));

      .cpp-day-num {
        color: #fff;
        font-weight: 800;
      }

      .cpp-amt {
        color: #fff;
      }
    }

    &:not(.blank):active {
      background: var(--g1);
    }

    &.selected:not(.blank):active {
      background: var(--brand-grad, linear-gradient(135deg, var(--g4), var(--g5)));
    }
  }

  .cpp-grid-3 {
    // 复用 Uiverse date-nav-container 视觉：白色胶囊卡片 + 网格排布（非整行滚动）
    background: #fff;
    border-radius: 32rpx;
    padding: 24rpx 16rpx;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 20rpx 12rpx;
    box-shadow: 0 4rpx 16rpx rgba(15, 28, 20, 0.04);
  }

  .cpp-month-cell,
  .cpp-year-cell {
    // 对应 .day-item；4 列网格均分
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 0 0 auto;
    width: calc((100% - 36rpx) / 4);
    padding-top: 10rpx;

    .cpp-month-num,
    .cpp-year-num {
      // 对应 .day-number（胶囊上半，顶部圆角）
      display: flex;
      justify-content: center;
      align-items: center;
      width: 92rpx;
      font-size: 40rpx;
      font-weight: 600;
      height: 56rpx;
      color: var(--ink);
      background: transparent;
      border-radius: 40rpx 40rpx 20rpx 20rpx;
      box-sizing: border-box;
    }

    // 月份带「月」字（如 12月），单独收窄字号避免溢出
    .cpp-month-num {
      font-size: 30rpx;
      padding-top: 12rpx;
    }

    .cpp-year-num {
      font-size: 32rpx;
    }

    .cpp-sum {
      margin-top: 4rpx;
      border-radius: 20rpx;
    }

    &:active .cpp-month-num,
    &:active .cpp-year-num,
    &:active .cpp-sum {
      background: var(--g1);
    }

    &.selected {

      .cpp-month-num,
      .cpp-year-num,
      .cpp-sum {
        background: var(--g1);
      }

      .cpp-month-num,
      .cpp-year-num {
        color: var(--g5);
        font-weight: 800;
      }
    }
  }
}
</style>
