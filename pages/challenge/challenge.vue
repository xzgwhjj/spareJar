<template>
  <view class="challenge-page" data-cmp="ChallengePage">
    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false" style="height:calc(100% - 74px);z-index:2;">
      <!-- 顶部 -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">挑战中心</text>
          <text class="topbar-title">🏆 余钱罐挑战</text>
        </view>
        <view class="streak-badge badge-pulse">
          <text>🔥 连击 {{ streakDays }} 天</text>
        </view>
      </view>

      <!-- 每日挑战 -->
      <view class="glass-hero card-in-1" style="margin:16px;padding:20px;">
        <view class="challenge-header">
          <text class="ch-icon">📅</text>
          <view>
            <text class="ch-title">每日挑战</text>
            <text class="ch-sub">今日限额 {{ formatFen(dailyChallenge.limit) }}</text>
          </view>
          <text class="ch-status" :class="dailyChallenge.success ? 'success' : 'fail'">
            {{ dailyChallenge.success ? '✅ 达成' : '❌ 超支' }}
          </text>
        </view>

        <block v-if="dailyChallenge.has">
          <view class="ring-label">
            <text class="ring-spent">{{ formatFen(dailyChallenge.consumed) }}</text>
            <text class="ring-remain">剩余 {{ formatFen(Math.max(0, dailyChallenge.limit - dailyChallenge.consumed)) }}</text>
          </view>
          <view class="daily-bar">
            <view class="daily-fill" :style="{ width: Math.min(dailyChallenge.consumed / Math.max(1, dailyChallenge.limit) * 100, 100) + '%', background: dailyChallenge.success ? 'linear-gradient(90deg,#89e59c,#25cc5d)' : '#ff6b6b' }" />
          </view>
        </block>
        <view v-else class="ch-empty">
          <text>设置日限额后开启每日挑战</text>
        </view>

        <!-- 7日热力图 -->
        <text class="section-subtitle">最近 7 天</text>
        <view class="heatmap">
          <view v-for="(d, i) in history7" :key="i" class="heat-day">
            <view class="heat-bar" :class="d.is_success ? 'success' : 'fail'" :style="{ height: (d.base_limit > 0 ? Math.min(d.consumed / d.base_limit, 1.2) * 42 : (d.is_success ? 42 : 6)) + 'px' }" />
            <text class="heat-label">{{ d.date }}</text>
          </view>
        </view>
      </view>

      <!-- 月度挑战 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <view class="section-title-row">
          <text class="section-title">📆 月度挑战</text>
          <text class="add-target" @click="openTargetSheet('monthly')">+ 设目标</text>
        </view>
        <view v-if="!monthlyChallenges.length" class="ch-empty"><text>本月还没有挑战目标，点「设目标」开启</text></view>
        <view v-for="mc in monthlyChallenges" :key="mc._id" class="challenge-card" style="margin-top:12px;">
          <view class="ch-card-header">
            <text class="ch-card-title">{{ mc.ledger_id ? '绑定账本挑战' : '本月消费挑战' }}</text>
            <text class="ch-card-status" :class="mc.status === 'completed' ? (mc.is_success ? 'success' : 'fail') : 'pending'">
              {{ mc.status === 'completed' ? (mc.is_success ? '已达标' : '未达成') : '进行中' }}
            </text>
          </view>
          <view v-if="mc.target_amount > 0" class="ch-card-bar">
            <view class="ch-card-fill" :style="{ width: Math.min(mc.consumed_amount / Math.max(1, mc.target_amount) * 100, 100) + '%', background: mc.consumed_amount > mc.target_amount ? '#ff6b6b' : 'linear-gradient(90deg,#89e59c,#25cc5d)' }" />
          </view>
          <view class="ch-card-meta">
            <text>{{ mc.target_amount > 0 ? formatFen(mc.consumed_amount) + ' / ' + formatFen(mc.target_amount) : '目标未设置' }}</text>
            <text @click="openTargetSheet('monthly')" style="color:#25cc5d;">编辑</text>
          </view>
        </view>
      </view>

      <!-- 年度挑战 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 16px;padding:18px;">
        <view class="section-title-row">
          <text class="section-title">🎯 年度挑战</text>
          <text class="add-target" @click="openTargetSheet('yearly')">+ 设目标</text>
        </view>
        <view v-if="!yearlyChallenges.length" class="ch-empty"><text>今年还没有挑战目标，点「设目标」开启</text></view>
        <view v-for="yc in yearlyChallenges" :key="yc._id" class="challenge-card" style="margin-top:12px;">
          <view class="ch-card-header">
            <text class="ch-card-title">{{ yc.ledger_id ? '绑定账本挑战' : (yc.period_key + ' 年度挑战') }}</text>
            <text class="ch-card-status" :class="yc.status === 'completed' ? (yc.is_success ? 'success' : 'fail') : 'pending'">
              {{ yc.status === 'completed' ? (yc.is_success ? '已达标' : '未达成') : '进行中' }}
            </text>
          </view>
          <view v-if="yc.target_amount > 0" class="ch-card-bar">
            <view class="ch-card-fill" :style="{ width: Math.min(yc.consumed_amount / Math.max(1, yc.target_amount) * 100, 100) + '%', background: yc.consumed_amount > yc.target_amount ? '#ff6b6b' : 'linear-gradient(90deg,#89e59c,#25cc5d)' }" />
          </view>
          <view class="ch-card-meta">
            <text>{{ yc.target_amount > 0 ? formatFen(yc.consumed_amount) + ' / ' + formatFen(yc.target_amount) : '目标未设置' }}</text>
            <text @click="openTargetSheet('yearly')" style="color:#25cc5d;">编辑</text>
          </view>
        </view>
      </view>

      <!-- 徽章墙 -->
      <view class="glass-mid card-in-1" style="margin:0 16px 24px;padding:18px;">
        <text class="section-title">🎖️ 徽章成就</text>
        <view v-if="!achievementsList.length" class="ch-empty"><text>完成记账、设限额、连续打卡即可点亮徽章</text></view>
        <view class="badge-grid">
          <view v-for="b in achievementsList" :key="b.code" class="badge-item" :class="{ unlocked: b.unlocked }" @click="openPoster(b)">
            <view class="badge-icon-box" :class="tierOf(b)">
              <text class="badge-emoji">{{ b.unlocked ? badgeEmoji(b) : '🔒' }}</text>
            </view>
            <text class="badge-name">{{ b.name }}</text>
            <text class="badge-tier">{{ b.unlocked ? '已解锁' : '未解锁' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 设置目标弹窗 -->
    <view v-if="showTargetSheet" class="sheet-overlay" @click="showTargetSheet = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">{{ targetType === 'monthly' ? '设置月度挑战目标' : '设置年度挑战目标' }}</text>
        <text class="sheet-sub">周期内总消费不超过该金额即达标</text>
        <input class="sheet-input" v-model="targetAmountYuan" type="digit" placeholder="目标金额（元）" />
        <text class="sheet-label">绑定账本（可选，仅统计该账本消费）</text>
        <picker class="sheet-picker" :range="ledgerOptions" range-key="label" @change="onLedgerPick">
          <view class="sheet-picker-text">{{ ledgerLabel }}</view>
        </picker>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @click="showTargetSheet = false">取消</view>
          <view class="sheet-btn" @click="confirmTarget">保存</view>
        </view>
      </view>
    </view>

    <!-- 分享海报弹层 -->
    <view v-if="showPoster" class="sheet-overlay" @click="showPoster = false">
      <view class="poster-sheet" @click.stop>
        <view class="poster-card">
          <text class="poster-emoji">{{ posterAch ? badgeEmoji(posterAch) : '🏆' }}</text>
          <text class="poster-name">{{ posterAch ? posterAch.name : '' }}</text>
          <text class="poster-desc">{{ posterAch ? (posterAch.description || '') : '' }}</text>
          <view class="poster-streak"><text>🔥 连续挑战 {{ streakDays }} 天</text></view>
          <text class="poster-brand">余钱罐 · 把省下的钱攒成惊喜</text>
        </view>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @click="showPoster = false">关闭</view>
          <view class="sheet-btn" @click="savePoster">保存海报</view>
        </view>
      </view>
    </view>

    <canvas canvas-id="posterCanvas" :style="{ position: 'fixed', left: '-9999px', top: '0', width: '300px', height: '420px' }" />

    <!-- TabBar -->
    <TabBar :current="3" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/tabbar/tabbar.vue'
import { useUserStore } from '@/stores/user.js'
import { listLedgers } from '@/api/sparejar.js'
import { formatFen, yuanToFen } from '@/utils/money.js'
import { formatMonthKey, formatYearKey } from '@/utils/date.js'

const store = useUserStore()
const toast = (title, icon = 'none') => uni.showToast({ title, icon })

const summary = computed(() => store.state.challenges)
const achievementsList = computed(() => store.state.achievements || [])
const streakDays = computed(() => store.currentStreak.value)

const dailyChallenge = computed(() => {
  const s = summary.value
  if (s && s.daily) {
    const limit = s.daily.base_limit_snapshot || 0
    return { consumed: s.daily.consumed_amount || 0, limit, success: !!s.daily.is_success, has: limit > 0 }
  }
  const set = store.state.dashboard.settlement
  const limit = store.dailyLimitFen.value || 0
  const consumed = set ? (set.challenge_consumed || 0) : 0
  return { consumed, limit, success: limit > 0 ? consumed <= limit : false, has: limit > 0 }
})

const history7 = computed(() => summary.value ? (summary.value.history7 || []) : [])
const monthlyChallenges = computed(() => summary.value ? (summary.value.monthly || []) : [])
const yearlyChallenges = computed(() => summary.value ? (summary.value.yearly || []) : [])

const badgeEmoji = (b) => {
  if (b.code === 'streak_7' || b.code === 'streak_30') return '🔥'
  if (b.code === 'first_record') return '📝'
  if (b.code === 'first_wish') return '💡'
  if (b.code === 'limit_set') return '🎯'
  if (b.code === 'monthly_success') return '📆'
  const map = { streak: '🔥', record: '✨', limit: '🎯', challenge: '🏆', custom: '⭐' }
  return map[b.condition_type] || '🏅'
}
const tierOf = (b) => {
  if (b.unlock_skin_id === 'celadon_jar') return 'diamond'
  if (b.unlock_skin_id === 'warm_gold') return 'gold'
  return b.unlocked ? 'silver' : 'bronze'
}

// 设置目标
const showTargetSheet = ref(false)
const targetType = ref('monthly')
const targetAmountYuan = ref('')
const targetLedgerId = ref('')
const ledgers = ref([])
const ledgerOptions = computed(() => [{ id: '', label: '全部账本（默认）' }].concat(ledgers.value.map((l) => ({ id: l._id, label: l.name }))))
const ledgerLabel = computed(() => {
  const f = ledgerOptions.value.find((o) => o.id === targetLedgerId.value)
  return f ? f.label : '全部账本（默认）'
})
const onLedgerPick = (e) => { targetLedgerId.value = ledgerOptions.value[e.detail.value].id }

async function loadLedgers() {
  try {
    // 走云函数读取，禁止前端直连数据库
    ledgers.value = await listLedgers()
  } catch (err) {
    ledgers.value = []
  }
}
function openTargetSheet(type) {
  targetType.value = type
  targetAmountYuan.value = ''
  targetLedgerId.value = ''
  loadLedgers()
  showTargetSheet.value = true
}
async function confirmTarget() {
  const fen = yuanToFen(targetAmountYuan.value)
  if (!fen.ok) { toast(fen.error && fen.error.message ? fen.error.message : '请输入有效金额'); return }
  const periodKey = targetType.value === 'monthly' ? formatMonthKey() : formatYearKey()
  try {
    await store.setChallengeTargetAction(targetType.value, periodKey, fen.value, targetLedgerId.value || undefined)
    showTargetSheet.value = false
    toast('目标已设置', 'success')
  } catch (err) {
    toast(err && err.message ? err.message : '设置失败')
  }
}

// 分享海报
const showPoster = ref(false)
const posterAch = ref(null)
function openPoster(b) {
  if (!b.unlocked) return
  posterAch.value = b
  showPoster.value = true
}
function savePoster() {
  const a = posterAch.value
  if (!a) return
  const ctx = uni.createCanvasContext('posterCanvas')
  ctx.setFillStyle('#0f1c14'); ctx.fillRect(0, 0, 300, 420)
  ctx.setFillStyle('#25cc5d'); ctx.setFontSize(22); ctx.fillText('余钱罐 · 成就解锁', 24, 56)
  ctx.setFillStyle('#ffffff'); ctx.setFontSize(38); ctx.fillText(a.name, 24, 130)
  ctx.setFillStyle('#9bb8a8'); ctx.setFontSize(14)
  ctx.fillText(a.description || '', 24, 170)
  ctx.setFillStyle('#ffd866'); ctx.setFontSize(20)
  ctx.fillText('连续挑战 ' + streakDays.value + ' 天', 24, 250)
  ctx.setFillStyle('#9bb8a8'); ctx.setFontSize(13)
  ctx.fillText('把省下的钱攒成惊喜', 24, 392)
  ctx.draw(false, () => {
    uni.canvasToTempFilePath({
      canvasId: 'posterCanvas',
      success: (res) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => toast('已保存到相册', 'success'),
          fail: () => toast('保存失败，请授权相册')
        })
      },
      fail: () => toast('生成海报失败')
    })
  })
}

async function refresh() {
  await Promise.all([store.loadChallengeSummary(), store.evaluateAchievementsAction(), store.loadAchievements()])
}

onMounted(refresh)
onShow(refresh)
</script>

<style scoped>
.challenge-page { width: 375px; height: 812px; overflow: hidden; position: relative; margin: 0 auto; background: #f2fcf2; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 52px 18px 0; }
.topbar-sub { font-size: 11px; color: #9bb8a8; display: block; margin-bottom: 2px; }
.topbar-title { font-size: 20px; font-weight: 900; color: #0f1c14; }
.streak-badge { padding: 6px 14px; border-radius: 22px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 4px 14px rgba(37,204,93,0.3); }

.challenge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.ch-icon { font-size: 24px; }
.ch-title { font-size: 15px; font-weight: 800; color: #0f1c14; display: block; }
.ch-sub { font-size: 11px; color: #9bb8a8; }
.ch-status { margin-left: auto; font-size: 14px; font-weight: 700; }
.ch-status.success { color: #25cc5d; }
.ch-status.fail { color: #ff6b6b; }

.ring-label { text-align: center; display: block; margin-bottom: 10px; }
.ring-spent { font-size: 32px; font-weight: 900; color: #0f1c14; display: block; }
.ring-remain { font-size: 12px; color: #25cc5d; font-weight: 600; }
.daily-bar { height: 10px; border-radius: 6px; background: rgba(194,242,200,0.3); overflow: hidden; }
.daily-fill { height: 100%; border-radius: 6px; transition: width 0.6s ease; }
.ch-empty { text-align: center; font-size: 12px; color: #9bb8a8; padding: 14px 0; }

.section-subtitle { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin: 12px 0 8px; }
.heatmap { display: flex; justify-content: space-around; align-items: flex-end; height: 56px; }
.heat-day { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.heat-bar { width: 12px; border-radius: 3px 3px 0 0; }
.heat-bar.success { background: linear-gradient(0deg,#4fd974,#25cc5d); }
.heat-bar.fail { background: #ffb3b3; }
.heat-label { font-size: 9px; color: #9bb8a8; }

.section-title { font-size: 14px; font-weight: 700; color: #0f1c14; }
.section-title-row { display: flex; justify-content: space-between; align-items: center; }
.add-target { font-size: 12px; color: #25cc5d; font-weight: 700; }

.challenge-card { padding: 12px 0; border-top: 1px solid rgba(15,28,20,0.04); }
.ch-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ch-card-title { font-size: 13px; font-weight: 600; color: #3a5244; }
.ch-card-status { font-size: 11px; font-weight: 600; }
.ch-card-status.success { color: #25cc5d; }
.ch-card-status.fail { color: #ff6b6b; }
.ch-card-status.pending { color: #f59e0b; }
.ch-card-bar { height: 6px; border-radius: 4px; background: rgba(194,242,200,0.3); overflow: hidden; }
.ch-card-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.ch-card-meta { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: #9bb8a8; }

.badge-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.badge-item { width: calc(33.33% - 8px); text-align: center; opacity: 0.5; }
.badge-item.unlocked { opacity: 1; }
.badge-icon-box { width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; }
.badge-icon-box.bronze { background: linear-gradient(135deg,#f5e6cc,#e8c97a); }
.badge-icon-box.silver { background: linear-gradient(135deg,#e8e8e8,#c0c0c0); }
.badge-icon-box.gold { background: linear-gradient(135deg,#ffe999,#f5c842); }
.badge-icon-box.diamond { background: linear-gradient(135deg,#e8d4ff,#b38dff); }
.badge-emoji { font-size: 24px; }
.badge-name { font-size: 10px; font-weight: 600; color: #3a5244; display: block; }
.badge-tier { font-size: 8px; color: #9bb8a8; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(15,28,20,0.45); z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.sheet { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 16px; font-weight: 800; color: #0f1c14; display: block; }
.sheet-sub { font-size: 11px; color: #9bb8a8; display: block; margin: 4px 0 14px; }
.sheet-input { height: 44px; border-radius: 12px; background: #f2fcf2; padding: 0 14px; font-size: 15px; margin-bottom: 14px; }
.sheet-label { font-size: 11px; color: #6b8c7a; display: block; margin-bottom: 6px; }
.sheet-picker { height: 44px; border-radius: 12px; background: #f2fcf2; display: flex; align-items: center; padding: 0 14px; margin-bottom: 16px; }
.sheet-picker-text { font-size: 14px; color: #3a5244; }
.sheet-actions { display: flex; gap: 12px; }
.sheet-btn { flex: 1; height: 46px; border-radius: 14px; background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.sheet-btn.ghost { background: #f2fcf2; color: #3a5244; }

.poster-sheet { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); }
.poster-card { background: linear-gradient(160deg,#0f1c14,#1f3a2a); border-radius: 18px; padding: 28px 20px; text-align: center; margin-bottom: 16px; }
.poster-emoji { font-size: 56px; display: block; }
.poster-name { font-size: 22px; font-weight: 900; color: #fff; display: block; margin: 10px 0 6px; }
.poster-desc { font-size: 12px; color: #9bb8a8; display: block; margin-bottom: 16px; }
.poster-streak { display: inline-block; padding: 6px 14px; border-radius: 20px; background: rgba(255,216,102,0.15); color: #ffd866; font-size: 13px; font-weight: 700; }
.poster-brand { font-size: 11px; color: #6b8c7a; display: block; margin-top: 16px; }
</style>
