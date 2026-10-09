<template>
  <view class="limit-page" data-cmp="LimitSetting">
    <PageHeader title="限额设置" @back="goBack" />

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="flex: 1"
    >
      <!-- 历史 / 记录入口：并行一行 -->
      <view class="batch-entry-row">
        <view class="batch-entry batch-entry--half" @click="goHistory">
          <view class="batch-entry-left">
            <image
              :src="cdn('/app_static/images/icon_limit_adjust_history.png')"
              class="batch-entry-icon"
              mode="aspectFit"
            />
            <text class="batch-entry-text">限额调整历史</text>
          </view>
          <text class="batch-entry-arrow">›</text>
        </view>

        <view class="batch-entry batch-entry--half" @click="openChangeLog">
          <view class="batch-entry-left">
            <image
              :src="cdn('/app_static/images/icon_budget_modify_record.png')"
              class="batch-entry-icon"
              mode="aspectFit"
            />
            <text class="batch-entry-text">预算修改记录</text>
          </view>
          <text class="batch-entry-arrow">›</text>
        </view>
      </view>

      <!-- 维度选择 -->
      <view class="glass-mid card-in-1" style="margin: 32rpx; padding: 36rpx">
        <view class="sec-head">
          <image
            class="sec-icon"
            :src="cdn('/app_static/images/icon_limit_dimension.png')"
            mode="aspectFit"
          />
          <text class="section-title">限额维度</text>
        </view>
        <view class="seg-row">
          <view
            v-for="d in dims"
            :key="d.value"
            class="seg-item"
            :class="{ active: dim === d.value }"
            @click="selectDim(d.value)"
          >
            <image
              class="seg-tip-icon"
              :src="cdn('/app_static/images/icon_tips.png')"
              mode="aspectFit"
              @click.stop="openDimTip(d)"
            />
            <text>{{ d.label }}</text>
          </view>
        </view>
        <text class="seg-tip">仅可配置一种维度，系统会自动折算为每日额度</text>
      </view>

      <!-- 拆分策略 -->
      <view
        v-if="dim !== 'day'"
        class="glass-mid card-in-1"
        style="margin: 0 32rpx 32rpx; padding: 36rpx"
      >
        <view class="sec-head">
          <image
            class="sec-icon"
            :src="cdn('/app_static/images/icon_allocate_strategy.png')"
            mode="aspectFit"
          />
          <text class="section-title">分配策略</text>
        </view>
        <text class="strategy-static">{{ strategyDesc }}</text>
      </view>

      <!-- 总限额配置 -->
      <view class="glass-mid card-in-1" style="margin: 0 32rpx 32rpx; padding: 36rpx">
        <text class="section-title">{{ poolTitle }}</text>
        <view class="slider-value-row">
          <text class="slider-value">¥{{ poolYuan }}</text>
          <text class="slider-hint">每{{ poolUnit }}最高可分配金额</text>
        </view>
        <slider
          class="custom-slider"
          :value="poolYuan"
          :min="poolMin"
          :max="poolMax"
          step="1"
          activeColor="#25cc5d"
          backgroundColor="rgba(194,242,200,0.3)"
          blockColor="#25cc5d"
          blockSize="22"
          @change="onSlide"
          @changing="onSlide"
        />
        <view class="input-row">
          <text class="input-prefix">¥</text>
          <number-field
            class="limit-input"
            :model-value="poolYuan"
            placeholder="输入整数金额"
            title="总限额"
            :decimal-places="0"
            :max-integer="18"
            @update:model-value="onInputValue"
          />
          <text class="input-unit">/{{ poolUnit }}</text>
        </view>
        <view class="slider-labels">
          <text>¥{{ poolMin }}</text>
          <text>¥{{ poolMax }}</text>
        </view>

        <!-- 实时预估 -->
        <view class="preview-box" v-if="dim !== 'day'">
          <text class="preview-label">预估每日额度</text>
          <text class="preview-value">¥{{ estDailyYuan }}</text>
          <block v-if="previewRows.length">
            <view class="preview-c" v-for="(r, i) in previewRows" :key="i">
              <text
                >{{ r.level }}已花 ¥{{ r.spentYuan }} / {{ r.level }}池 ¥{{
                  r.poolYuan
                }}
                → 剩余 ¥{{ r.remainingYuan }} 均摊到剩余 {{ r.remainingUnit }}
                {{ r.unit }}</text
              >
            </view>
          </block>
        </view>
      </view>

      <!-- 局部微调（年维度不支持临时调整） -->
      <view
        v-if="dim !== 'year'"
        class="glass-mid card-in-1"
        style="margin: 0 32rpx 32rpx; padding: 36rpx"
      >
        <view class="collapse-head" @click="showOverride = !showOverride">
          <view class="sec-head" style="margin-bottom: 0">
            <image
              class="sec-icon"
              :src="cdn('/app_static/images/icon_temp_adjust.png')"
              mode="aspectFit"
            />
            <text class="section-title" style="margin-bottom: 0">临时调整</text>
          </view>
          <text class="collapse-arrow">{{ showOverride ? "∧" : "∨" }}</text>
        </view>
        <view v-if="showOverride">
          <text class="override-tip"
            >可临时覆盖未来
            {{ dim === "day" ? "7 天" : "1~3 个月" }}
            的额度，次日生效，过期自动失效。</text
          >

          <!-- 批量覆盖未来 7 天（仅日维度） -->
          <view v-if="dim === 'day'" class="batch-entry" @click="openBatch">
            <view class="batch-entry-left">
              <image
                class="batch-entry-icon"
                :src="cdn('/app_static/images/icon_batch_7days.png')"
                mode="aspectFit"
              />
              <text class="batch-entry-text">批量覆盖未来 7 天</text>
            </view>
            <text class="batch-entry-arrow">›</text>
          </view>

          <!-- 批量覆盖未来 1~3 个月（仅月/年维度） -->
          <view v-if="dim !== 'day'" class="batch-entry" @click="openMonthBatch">
            <view class="batch-entry-left">
              <image
                class="batch-entry-icon"
                :src="cdn('/app_static/images/icon_batch_1to3m.png')"
                mode="aspectFit"
              />
              <text class="batch-entry-text">批量覆盖未来 1~3 个月</text>
            </view>
            <text class="batch-entry-arrow">›</text>
          </view>

          <!-- 日覆盖（仅日维度） -->
          <view v-if="dim === 'day'" class="override-add">
            <view class="ov-input-group">
              <text class="ov-prefix">日期</text>
              <picker
                mode="date"
                :value="ovDayKey"
                :start="ovDayStart"
                :end="ovDayEnd"
                @change="onOvDayChange"
              >
                <view class="ov-picker"
                  ><text>{{ ovDayKey }}</text></view
                >
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovDayAmount"
                placeholder="当日额度"
                title="当日额度"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="(v) => (ovDayAmount = Number(v))"
              />
            </view>
            <view class="ov-add-btn" @click="addDayOverride"><text>＋</text></view>
          </view>

          <!-- 月覆盖（仅 month/year 维度） -->
          <view v-if="dim !== 'day'" class="override-add" style="margin-top: 20rpx">
            <view class="ov-input-group">
              <text class="ov-prefix">月份</text>
              <picker
                mode="date"
                fields="month"
                :value="ovMonthKey"
                :start="ovMonthStart"
                :end="ovMonthEnd"
                @change="onOvMonthChange"
              >
                <view class="ov-picker"
                  ><text>{{ ovMonthKey }}</text></view
                >
              </picker>
            </view>
            <view class="ov-input-group grow">
              <text class="ov-prefix">¥</text>
              <number-field
                class="ov-field"
                :model-value="ovMonthAmount"
                placeholder="当月总限额"
                title="当月总限额"
                :decimal-places="0"
                :max-integer="7"
                @update:model-value="(v) => (ovMonthAmount = Number(v))"
              />
            </view>
            <view class="ov-add-btn" @click="addMonthOverride"><text>＋</text></view>
          </view>

          <!-- 已添加列表 -->
          <view v-if="overrideList.length" class="ov-list">
            <view v-for="(o, i) in overrideList" :key="i" class="ov-item">
              <text class="ov-item-key"
                >{{ o.type === "day" ? "日" : "月" }} · {{ o.key }}</text
              >
              <text class="ov-item-amt">¥{{ Math.round(o.amount_fen / 100) }}</text>
              <text class="ov-item-del" @click="removeOverride(i)">✕</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding: 0 32rpx 60rpx">
        <view v-if="dim !== 'day' && quota" class="quota-hint">
          <text v-if="quota.remaining > 0"
            >本周期剩余放宽次数：{{ quota.remaining }}/{{
              quota.cap
            }}（下调立即生效，不受限）</text
          >
          <text v-else
            >本周期放宽次数已用完，再次放宽将于{{
              dim === "year" ? "次年" : "次月"
            }}生效（下调不受限）</text
          >
        </view>
        <view v-if="hasPending" class="pending-tip">
          <template v-if="pendingKind === 'switch'">
            <text class="pending-tip-text"
              >已预约于「{{ pendingEffectiveLabel }}」切换到{{
                dimLabelText(state.settings.pending_limit_dim)
              }}，取消则维持当前{{ dimLabelText(state.settings.limit_dim) }}。</text
            >
            <view class="terminate-btn" @click="terminatePending"
              ><text>取消切换</text></view
            >
          </template>
          <template v-else>
            <text class="pending-tip-text"
              >已有一条「{{ pendingEffectiveLabel }}」的放宽待执行，可终止后重设。</text
            >
            <view class="terminate-btn" @click="terminatePending"
              ><text>终止待生效调整</text></view
            >
          </template>
        </view>
        <view class="save-btn" @click="saveSettings">
          <text>保存设置</text>
        </view>
        <view class="dual-btn">
          <view class="reset-btn" @click="resetSettings">
            <text>恢复上次（{{ resetInfo.unit }} ¥{{ resetInfo.yuan }}）</text>
          </view>
          <view class="cancel-btn" @click="cancelLimit">
            <text>取消限额（{{ cancelEffectiveText }}）</text>
          </view>
        </view>
      </view>

      <!-- 超 3 年留存期的年度归档汇总（明细已清理，仅保留年度聚合） -->
      <YearlyLimitOverview
        title="限额历史 · 年度概览"
        subtitle="超过 3 年留存期，仅保留年度汇总"
      />
    </scroll-view>

    <!-- 批量覆盖未来 7 天弹框 -->
    <view v-if="batchVisible" class="batch-mask" @click="closeBatch">
      <view class="batch-sheet" @click.stop>
        <view class="batch-head">
          <view class="batch-head-left">
            <text class="batch-title">批量覆盖未来 7 天</text>
            <image
              class="batch-tip-icon"
              :src="cdn('/app_static/images/icon_tips.png')"
              mode="aspectFit"
              @click.stop="openDayBatchTip"
            />
          </view>
          <text class="batch-close" @click="closeBatch">✕</text>
        </view>
        <text class="batch-sub"
          >为未来 7 天设置个别例外额度。留空则沿用当日的原有额度，填写 0
          即取消当日限额。次日生效。</text
        >
        <view class="batch-list">
          <view v-for="(row, i) in batchRows" :key="row.dateKey" class="batch-row">
            <view class="batch-date">
              <text class="batch-dow">{{ row.dow }}</text>
              <text class="batch-dk">{{ row.dateKey.slice(5) }}</text>
            </view>
            <view class="batch-input-wrap">
              <text class="batch-yen">¥</text>
              <input
                class="batch-input"
                type="digit"
                :value="row.value"
                :placeholder="row.placeholder"
                placeholder-class="batch-ph"
                maxlength="7"
                @input="(e) => onBatchInput(i, e.detail.value)"
              />
            </view>
            <view v-if="i < batchRows.length - 1" class="batch-copy" @click="copyDown(i)">
              <text>↓</text>
            </view>
            <view v-else class="batch-copy batch-copy--disabled">
              <text>↓</text>
            </view>
          </view>
        </view>
        <view class="batch-actions">
          <view class="batch-cancel" @click="closeBatch">
            <text>取消</text>
          </view>
          <view class="batch-confirm" @click="confirmBatch">
            <text>应用到 7 天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量覆盖未来 1~3 个月弹框 -->
    <view v-if="monthBatchVisible" class="batch-mask" @click="closeMonthBatch">
      <view class="batch-sheet" @click.stop>
        <view class="batch-head">
          <view class="batch-head-left">
            <text class="batch-title">批量设置月度限额</text>
            <image
              class="batch-tip-icon"
              :src="cdn('/app_static/images/icon_tips.png')"
              mode="aspectFit"
              @click.stop="openBatchTip"
            />
          </view>
          <text class="batch-close" @click="closeMonthBatch">✕</text>
        </view>
        <text class="batch-sub"
          >为接下来的 3 个月设置个别例外额度。留空则沿用默认额度，填写 0
          即取消该月限额，保存后次月生效。</text
        >
        <view class="batch-list">
          <view v-for="(row, i) in monthBatchRows" :key="row.monthKey" class="batch-row">
            <view class="batch-date" style="width: 140rpx">
              <text class="batch-dow">{{ row.label }}</text>
              <text class="batch-dk">{{ row.monthKey }}</text>
            </view>
            <view class="batch-input-wrap">
              <text class="batch-yen">¥</text>
              <input
                class="batch-input"
                type="digit"
                :value="row.value"
                placeholder="保持不变"
                placeholder-class="batch-ph"
                maxlength="8"
                @input="(e) => onMonthBatchInput(i, e.detail.value)"
              />
            </view>
            <view
              v-if="i < monthBatchRows.length - 1"
              class="batch-copy"
              @click="copyMonthDown(i)"
            >
              <text>↓</text>
            </view>
            <view v-else class="batch-copy batch-copy--disabled">
              <text>↓</text>
            </view>
          </view>
        </view>
        <view class="batch-actions">
          <view class="batch-cancel" @click="closeMonthBatch">
            <text>取消</text>
          </view>
          <view class="batch-confirm" @click="confirmMonthBatch">
            <text>应用到月份</text>
          </view>
        </view>
      </view>
    </view>

    <amount-keyboard />

    <!-- 维度说明提示弹框 -->
    <BaseModal
      :show="tipModal.show"
      :title="tipModal.title"
      confirm-text="知道了"
      @update:show="(v) => (tipModal.show = v)"
    >
      <view class="tip-body">
        <text v-for="(ln, i) in tipModal.lines" :key="i" class="tip-line">{{ ln }}</text>
      </view>
    </BaseModal>

    <!-- 维度切换确认弹层 -->
    <view
      v-if="switchConfirmVisible"
      class="batch-mask"
      @click="switchConfirmVisible = false"
    >
      <view class="batch-sheet switch-sheet" @click.stop>
        <view class="switch-title">切换预算维度</view>
        <view class="switch-plan">
          从「{{ dimLabelText(switchPlan.fromDim) }}」切换为「{{
            dimLabelText(switchPlan.toDim)
          }}」
        </view>
        <view class="switch-amount"
          >设定额度：¥{{ (switchPlan.inputFen / 100).toFixed(2) }}</view
        >
        <view
          v-if="switchPlan.toDim === 'day'"
          style="
            margin-top: 20rpx;
            padding: 16rpx 20rpx;
            background: rgba(76, 175, 80, 0.1);
            border-radius: 12rpx;
            font-size: 24rpx;
            color: #2e7d32;
            line-height: 1.5;
            text-align: center;
          "
          >切回日将于{{ timingLabel(switchTiming) }}生效，生效当日恢复日级滚存（含已滚存
          ¥{{ (rollRestoreFen / 100).toFixed(2) }}）</view
        >

        <view v-if="switchPlan.toDim !== 'day'" class="switch-section">
          <view class="switch-label">生效时间</view>
          <view class="switch-radios">
            <view
              class="switch-radio"
              :class="{ active: switchTiming === 'next_day' }"
              @click="switchTiming = 'next_day'"
              >次日生效</view
            >
            <view
              class="switch-radio"
              :class="{ active: switchTiming === 'next_month' }"
              @click="switchTiming = 'next_month'"
              >次月生效</view
            >
            <view
              class="switch-radio"
              :class="{ active: switchTiming === 'next_year' }"
              @click="switchTiming = 'next_year'"
              >次年生效</view
            >
          </view>
        </view>

        <view v-if="switchPlan.toDim !== 'day'" class="switch-section">
          <view
            class="switch-check"
            :class="{ active: switchDeduct }"
            @click="switchDeduct = !switchDeduct"
          >
            <text class="switch-check-box">{{ switchDeduct ? "✓" : "" }}</text>
            <text>扣除旧模式下本月已使用额度</text>
          </view>
          <view v-if="switchDeduct" class="switch-deduct-info">
            本月已使用 ¥{{ (switchUsedFen / 100).toFixed(2) }}，生效额度 = ¥{{
              (effectiveFen / 100).toFixed(2)
            }}
          </view>
        </view>

        <view class="batch-actions" style="margin-top: 32rpx">
          <view class="batch-cancel" @click="switchConfirmVisible = false"
            ><text>取消</text></view
          >
          <view class="batch-confirm" @click="confirmSwitch"><text>确认切换</text></view>
        </view>
      </view>
    </view>

    <!-- 预算修改记录弹层 -->
    <BaseModal
      :show="logSheetVisible"
      title="预算修改记录"
      @update:show="(v) => (logSheetVisible = v)"
    >
      <view class="log-sheet">
        <view v-if="changeLog.quota" class="log-quota">
          <text class="log-quota-item"
            >月剩余放宽：{{ changeLog.quota.month?.remaining }}/{{
              changeLog.quota.month?.cap
            }}</text
          >
          <text class="log-quota-item"
            >年剩余放宽：{{ changeLog.quota.year?.remaining }}/{{
              changeLog.quota.year?.cap
            }}</text
          >
        </view>
        <view v-if="!changeLog.entries.length" class="log-empty">
          <text>暂无修改记录</text>
        </view>
        <view v-for="(e, i) in changeLog.entries" :key="i" class="log-item">
          <view class="log-row">
            <text class="log-dim">{{ LOG_DIM_LABEL[e.dim] || e.dim }}维度</text>
            <text
              class="log-type"
              :class="e.type === 'tighten' ? 't-tighten' : 't-loosen'"
              >{{ logTypeLabel(e) }}</text
            >
            <text class="log-amount"
              >{{ fmtFen(e.old_fen) }} → {{ fmtFen(e.new_fen) }}</text
            >
          </view>
          <view class="log-row log-row-2">
            <text class="log-status" :class="logStatusClass(e)">{{
              logStatusLabel(e)
            }}</text>
            <text v-if="e.effective_date" class="log-eff"
              >生效日 {{ e.effective_date }}</text
            >
            <text class="log-time">{{ (e.created_at || "").slice(0, 10) }}</text>
          </view>
        </view>
      </view>
    </BaseModal>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user.js";
import {
  getLimitPreviewSpend,
  saveBudgetPlan,
  getBudgetChangeLog,
  terminatePendingBudget,
} from "@/api/sparejar.js";
import { todayDateKey, addDaysToDateKey } from "@/utils/date.js";
import {
  computeDayBaseLimit,
  resolveMonthPool,
  validateOverride,
  addOverride,
  pruneOverrides,
} from "@/utils/limitEngine.js";
import { cdn } from "@/utils/cdn.js";
import PageHeader from "@/components/PageHeader.vue";
import YearlyLimitOverview from "@/components/YearlyLimitOverview.vue";
import BaseModal from "@/components/BaseModal.vue";

const {
  state,
  loadSettings,
  refreshTodayDashboard,
  checkLoggedIn,
  spentTodayFen,
} = useUserStore();

/* 顶部安全区（与资产页一致：按状态栏/胶囊动态计算上内边距） */
const DEFAULT_YUAN = 100; // 日维度默认（与 onboarding 一致）
const DIM_DEFAULT_YUAN = { day: 100, month: 3000, year: 36000 };
const dimDefaultYuan = (d = dim.value) => DIM_DEFAULT_YUAN[d] || DEFAULT_YUAN;
const dims = [
  { value: "day", label: "日", unit: "天" },
  { value: "month", label: "月", unit: "月" },
  { value: "year", label: "年", unit: "年" },
];
// 分配策略已统一为「剩余滚动」，不再提供「均分」选项

/* ---- 响应式表单状态 ---- */
const dim = ref("day");
const yearStrategy = ref("rollover");
const monthStrategy = ref("rollover");
const poolYuan = ref(dimDefaultYuan());
const overrides = ref([]);
// 预览用的真实已花费（分）：本月累计 + 年内截至上月累计，供预算感知重平（C）预览
const previewSpend = ref({
  actualSpendThisMonthFen: 0,
  actualSpendPriorMonthsThisYearFen: 0,
});
// 已保存快照：页面加载完成 & 保存成功时刻各拍一张，供"恢复上次"回退未保存改动
const savedSnapshot = ref(null);
// 按维度记忆金额草稿：切换维度时只还原该维度上次的值，不互相覆盖、不重置
const dimDrafts = ref({ day: null, month: null, year: null });

const showOverride = ref(false);
const ovDayKey = ref(addDaysToDateKey(todayDateKey(), 1)); // 次日起可选（今日设置也仅明日生效）
const ovDayAmount = ref(dimDefaultYuan("day"));
const ovMonthKey = ref(nextMonthKey()); // 次月生效，默认下月
const ovMonthAmount = ref(dimDefaultYuan("month"));

/* ---- 派生 ---- */
const dimMeta = computed(() => dims.find((d) => d.value === dim.value) || dims[0]);

/* ---- 维度说明弹框 ---- */
const tipModal = ref({ show: false, title: "", lines: [] });
// 维度说明：拆分为多行，便于弹框内序号 + 换行展示（更清晰）
const DIM_TIPS = {
  day: [
    "请先设定每日固定额度（例如 ¥100）。当日未用完的余额不会作废，将于次日自动滚入可用额度并可持续使用；该部分结余同时计入「结余池」，用于长期积累。",
    "此为系统默认的滚入方式；如需调整，可点击左上角头像，在「设置」中修改「结余池滚入方式」。",
    "本模式适用于希望通过明确每日支出上限来培养自律消费习惯的用户。",
    "设置步骤：",
    "1. 于「限额维度」选择「按日」；",
    "2. 在下方填写每日额度；",
    "3. 点击「保存设置」即可（次日生效）。",
  ],
  month: [
    "请先设定月度总预算（例如 ¥3000），系统将据此自动折算每日参考额度。",
    "系统采用「预算感知重平」机制：将月度预算按当月剩余天数平摊为每日参考额度；当日未用完的余额将滚入剩余池，次日与剩余预算一并重新均摊，使整月累计支出趋近于月度预算总额。",
    "需要说明的是，单日额度仅作为节奏参考，仅当整月预算池被突破时，方记为超额。",
    "设置步骤：",
    "1. 于「限额维度」选择「按月」；",
    "2. 填写月预算；",
    "3. 点击「保存设置」：下调（收紧）立即生效；上调（放宽）次日生效。每月最多放宽 2 次，超出后顺延至次月生效，每次修改均有记录。",
  ],
  year: [
    "请先设定年度总预算（例如 ¥36000），系统将先均摊至各月、再折算至每日，同样遵循「预算感知重平」逻辑。",
    "某月结余可在后续月份灵活调配；只要全年累计未超出总预算，即视为年度达标，期间个别月份短暂超支不影响整体判定。",
    "本模式适用于制定年度攒钱目标或全年消费规划的用户。",
    "设置步骤：",
    "1. 于「限额维度」选择「按年」；",
    "2. 填写年预算；",
    "3. 点击「保存设置」：下调（收紧）立即生效；上调（放宽）次日生效。每年最多放宽 3 次，超出后顺延至次年生效，每次修改均有记录。",
  ],
};
// 批量设置说明：说明本功能为个别月份设置例外额度的用法（不引入其他功能概念）
const BATCH_TIPS = [
  "本功能用于为个别月份单独设置例外额度，不影响其余月份。",
  "本功能仅覆盖「下月、再下月、下下月」共 3 个未来月份，且各月相互独立：填写数值后，该月即按所填金额生效；留空则沿用默认额度，不会自动套用相邻月份的数值。",
  "填写 0 表示取消该月限额；若此前已为该月设置额度，留空将保留原有设定（即不改变已生效的值），如需清除请主动填写 0。",
  "如需让后续月份沿用上一格的数值：点击该行右侧的「↓」按钮，即可将当前数值复制至下方连续空行（遇到已填写的行即停止）。",
];
function openBatchTip() {
  tipModal.value = { show: true, title: "批量设置说明", lines: BATCH_TIPS };
}
// 日批量说明：说明本功能为个别日期设置例外额度的用法（不引入其他功能概念）
const DAY_BATCH_TIPS = [
  "本功能用于为个别日期单独设置例外额度，不影响其余日期。",
  "本功能仅覆盖「明日及之后 7 天」共 7 个未来日期，且各日相互独立：填写数值后，当日即按所填金额生效；留空则沿用默认额度，不会自动套用相邻日期的数值。",
  "填写 0 表示取消当日限额；若此前已为该日设置额度，留空将保留原有设定（即不改变已生效的值），如需清除请主动填写 0。",
  "如需让后续日期沿用上一格的数值：点击该行右侧的「↓」按钮，即可将当前数值复制至下方连续空行（遇到已填写的行即停止）。",
];
function openDayBatchTip() {
  tipModal.value = { show: true, title: "批量覆盖说明", lines: DAY_BATCH_TIPS };
}
function openDimTip(d) {
  tipModal.value = {
    show: true,
    title: `${d.label}维度说明`,
    lines: DIM_TIPS[d.value] || [],
  };
}
const dimLabel = computed(() => dimMeta.value.label);
const poolUnit = computed(() => dimMeta.value.unit);
const poolTitle = computed(
  () =>
    ({
      day: "每日限额",
      month: "每月总限额",
      year: "每年总限额",
    }[dim.value] || "总限额")
);
const strategyDesc = computed(() =>
  dim.value === "year"
    ? "采用「剩余滚动（预算感知重平）」：将年度预算按剩余月份平摊到各月，每月再按剩余天数平摊到每天，使整年支出趋近预算总量。"
    : "采用「剩余滚动（预算感知重平）」：将本月预算按剩余天数平摊到每天，使整月支出趋近预算总量。"
);
const poolMin = computed(() => 1);
const poolMax = computed(
  () =>
    ({
      day: 2000,
      month: 100000,
      year: 1000000,
    }[dim.value] || 1000000)
);
// 取消限额按钮的生效文案：日维度明日、月/年维度次月
const cancelEffectiveText = computed(() => "立即生效");

const overrideList = computed(() => overrides.value);

const estSettings = computed(() => ({
  limit_dim: dim.value,
  limit_amount_fen: dim.value === "day" ? null : poolYuan.value * 100,
  daily_base_limit: dim.value === "day" ? poolYuan.value * 100 : null,
  year_strategy: yearStrategy.value,
  month_strategy: monthStrategy.value,
  overrides: overrides.value,
}));

/* ---- 预算修改记录 / 放宽限次 / 终止待生效 ---- */
const changeLog = ref({ entries: [], quota: {} });
const LOG_DIM_LABEL = { month: "月", year: "年", day: "日", pool: "资金池" };
const logSheetVisible = ref(false);
// 任意维度（含切回日的 switch 与日维度放宽）存在待生效时展示提示，并支持终止/取消
const hasPending = computed(() => {
  const s = state.settings;
  if (!s) return false;
  return (
    !!s.pending_limit_dim &&
    s.limit_effective_date != null &&
    (s.pending_amount_fen != null || s.pending_base_limit != null)
  );
});
// 待生效类型：switch = 维度切换待生效（尚未离开原维度，取消即维持原维度）；
// amount = 同维度内额度放宽待生效（取消仅作废本次额度变更，不切维度）
const pendingKind = computed(() => {
  const s = state.settings;
  if (!s || !s.limit_dim || !s.pending_limit_dim) return "amount";
  return s.limit_dim !== s.pending_limit_dim ? "switch" : "amount";
});
const quota = computed(() => changeLog.value.quota?.[dim.value] || null);
// 待生效调整的生效文案：依 limit_effective_date 实际日期判定次日 / 次月 / 次年
const pendingEffectiveLabel = computed(() => {
  const s = state.settings;
  if (!s || !s.limit_effective_date) return "次日生效";
  const ed = s.limit_effective_date;
  const t = todayDateKey();
  if (ed <= t) return "已生效";
  if (ed.slice(0, 4) !== t.slice(0, 4)) return "次年生效";
  if (ed.slice(0, 7) !== t.slice(0, 7)) return "次月生效";
  return "次日生效";
});

async function loadChangeLog() {
  try {
    const res = await getBudgetChangeLog({ dim: dim.value });
    changeLog.value = res || { entries: [], quota: {} };
  } catch (e) {
    console.warn("[loadChangeLog]", e);
  }
}

function logTypeLabel(e) {
  return e.type === "tighten" ? "下调" : "上调";
}
function logStatusLabel(e) {
  if (e.status === "applied") return "已生效";
  if (e.status === "scheduled") {
    if (e.defer_to === "next_month") return "次月生效";
    if (e.defer_to === "next_year") return "次年生效";
    return "次日生效";
  }
  if (e.status === "failed")
    return e.fail_reason === "user_terminated" ? "已终止" : "已作废";
  return e.status;
}
function logStatusClass(e) {
  return (
    {
      applied: "tag-applied",
      scheduled: "tag-scheduled",
      failed: "tag-failed",
    }[e.status] || ""
  );
}
function fmtFen(fen) {
  return fen == null ? "—" : `¥${Math.round(Number(fen) / 100)}`;
}

function openChangeLog() {
  logSheetVisible.value = true;
  loadChangeLog();
}

const estDailyFen = computed(() =>
  computeDayBaseLimit(estSettings.value, todayDateKey(), previewSpend.value)
);
const estDailyYuan = computed(() => Math.round(estDailyFen.value / 100));
// estMonthYuan / strategyLabel 已废弃：月/年维度恒为剩余滚动，预览改用 previewRows

// 恢复按钮文案：展示"上次保存"的维度与金额
const resetInfo = computed(() => {
  const snap = savedSnapshot.value;
  const dimV = snap ? snap.dim : dim.value;
  const yuan = snap ? snap.poolYuan : poolYuan.value;
  const unit = { day: "日", month: "月", year: "年" }[dimV] || "日";
  return { unit, yuan };
});

// 预算感知重平（C）预览明细：按父池层级展示「已花 / 池 → 剩余 均摊剩余 N 天/月」
// 月/年维度恒为「剩余滚动」，因此必展示重平明细；此处不再有均分(equal)分支。
const previewRows = computed(() => {
  const s = estSettings.value;
  const dk = todayDateKey();
  const y = dk.slice(0, 4);
  const m = parseInt(dk.slice(5, 7), 10);
  const day = parseInt(dk.slice(8, 10), 10);
  const isYear = dim.value === "year";
  const isMonth = dim.value === "month";
  if (!isMonth && !isYear) return [];
  const toYuan = (f) => Math.round((Number(f) || 0) / 100);
  const rows = [];
  // 年维度 + 年策略为剩余滚动：展示年池级 C（年已花 / 年池 → 剩余均摊剩余月）
  if (isYear && s.year_strategy === "rollover") {
    const yearAmount = Number(s.limit_amount_fen) || 0;
    const spentFen =
      previewSpend.value.actualSpendPriorMonthsThisYearFen +
      previewSpend.value.actualSpendThisMonthFen;
    const remainingFen = Math.max(0, yearAmount - spentFen);
    rows.push({
      level: "年",
      spentYuan: toYuan(spentFen),
      poolYuan: toYuan(yearAmount),
      remainingYuan: toYuan(remainingFen),
      remainingUnit: 13 - m, // 含本月
      unit: "月",
    });
  }
  // 月池级 C（年维度的月池已是预算感知折算值）：本月已花 / 月池 → 剩余均摊剩余天
  if (s.month_strategy === "rollover") {
    const opts = { actualSpendThisMonthFen: previewSpend.value.actualSpendThisMonthFen };
    if (isYear)
      opts.actualSpendPriorMonthsThisYearFen =
        previewSpend.value.actualSpendPriorMonthsThisYearFen;
    const monthPool = resolveMonthPool(s, dk, opts);
    const thisSpend = previewSpend.value.actualSpendThisMonthFen;
    const monthRemain = Math.max(0, monthPool - thisSpend);
    const daysInMonth = new Date(Number(y), m, 0).getDate();
    rows.push({
      level: isYear ? "本月" : "月",
      spentYuan: toYuan(thisSpend),
      poolYuan: toYuan(monthPool),
      remainingYuan: toYuan(monthRemain),
      remainingUnit: daysInMonth - day + 1, // 含今日
      unit: "天",
    });
  }
  return rows;
});

// 下个月 YYYY-MM（月覆盖次月生效，最早可选下月）
function nextMonthKey() {
  const d = new Date(todayDateKey());
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

/* ---- 局部覆盖日期范围 ---- */
const ovDayStart = computed(() => addDaysToDateKey(todayDateKey(), 1)); // 次日生效，最早可选明天
const ovDayEnd = computed(() => addDaysToDateKey(todayDateKey(), 7)); // 与 validateOverride 的未来 7 天窗口(tomorrow~today+7)对齐
const ovMonthStart = computed(() => nextMonthKey()); // 次月生效，最早可选下月
const ovMonthEnd = computed(() => {
  const d = new Date(todayDateKey());
  d.setMonth(d.getMonth() + 3); // 保持约 3 个月可选窗口（下月起的未来 3 个月）
  return d.toISOString().slice(0, 7);
});

/* ---- 同步 ---- */
function syncFromSettings() {
  const s = state.settings;
  if (!s) return;
  dim.value = s.limit_dim || "day";
  // 历史 equal 策略统一迁移为 rollover（已去掉均分模式）
  yearStrategy.value =
    s.year_strategy === "equal" ? "rollover" : s.year_strategy || "rollover";
  monthStrategy.value =
    s.month_strategy === "equal" ? "rollover" : s.month_strategy || "rollover";
  overrides.value = pruneOverrides(s, todayDateKey());
  if (dim.value === "day") {
    const eff =
      s.pending_base_limit != null &&
      s.limit_effective_date &&
      s.limit_effective_date <= todayDateKey()
        ? s.pending_base_limit
        : s.daily_base_limit || 10000;
    poolYuan.value = Math.round(eff / 100);
  } else {
    // 优先展示 pending（已排期次日生效）的新预算，使保存后立即回显用户设定值
    const effFen =
      s.pending_amount_fen != null ? s.pending_amount_fen : s.limit_amount_fen || 0;
    poolYuan.value = Math.round(effFen / 100) || dimDefaultYuan();
  }
}

// 拍摄"已保存快照"：记录当前表单（维度/策略/总限额/临时调整）作为"恢复上次"的回退目标
function captureSnapshot() {
  savedSnapshot.value = {
    dim: dim.value,
    yearStrategy: yearStrategy.value,
    monthStrategy: monthStrategy.value,
    poolYuan: poolYuan.value,
    overrides: JSON.parse(JSON.stringify(overrides.value || [])),
  };
}

onMounted(async () => {
  if (!checkLoggedIn()) {
    uni.showToast({ title: "请先登录后设置限额", icon: "none" });
    uni.navigateTo({
      url:
        "/pages/login/login?redirect=" +
        encodeURIComponent("/pages/limit-setting/limit-setting"),
    });
    return;
  }
  if (!state.settings) await loadSettings();
  syncFromSettings();
  captureSnapshot();
  loadChangeLog();
  // 初始化各维度草稿金额（来自已保存设置），切维度时按维度记忆，不互相覆盖
  dimDrafts.value = {
    day: savedYuanForDim(state.settings, "day"),
    month: savedYuanForDim(state.settings, "month"),
    year: savedYuanForDim(state.settings, "year"),
  };
  try {
    previewSpend.value = await getLimitPreviewSpend(todayDateKey());
  } catch (e) {
    // 取数失败不影响设置页其它功能，回落到"未花"计划值
  }
});

/* ---- 交互 ---- */
// 取某维度已保存的金额（元）：用于初始化各维度草稿，切换维度时回填该维度的上次值
function savedYuanForDim(s, dimV) {
  if (!s) return null;
  if (dimV === "day") {
    const eff =
      s.pending_base_limit != null &&
      s.limit_effective_date &&
      s.limit_effective_date <= todayDateKey()
        ? s.pending_base_limit
        : s.daily_base_limit || 10000;
    return Math.round(eff / 100);
  }
  const fen =
    s.pending_amount_fen != null ? s.pending_amount_fen : s.limit_amount_fen || 0;
  return fen ? Math.round(fen / 100) : null;
}

function selectDim(v) {
  dim.value = v;
  const d = dimDrafts.value[v];
  poolYuan.value = d != null ? d : dimDefaultYuan(v);
  loadChangeLog();
}

// 调整总限额：同步写入当前维度草稿，便于切回时还原
function updatePoolYuan(v) {
  poolYuan.value = v;
  dimDrafts.value[dim.value] = v;
}
const onSlide = (e) => {
  updatePoolYuan(Number(e.detail.value));
};
const onInputValue = (val) => {
  const v = Number(val);
  if (Number.isFinite(v)) {
    // 输入框不设上限（滑块仅作可视化，停在最大端即可）
    updatePoolYuan(Math.max(poolMin.value, Math.floor(v)));
  }
};

function onOvDayChange(e) {
  ovDayKey.value = e.detail.value;
}
function onOvMonthChange(e) {
  ovMonthKey.value = e.detail.value;
}

function addDayOverride() {
  const rec = {
    type: "day",
    key: ovDayKey.value,
    amount_fen: Math.round(Number(ovDayAmount.value) * 100),
  };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: "none" });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function addMonthOverride() {
  const rec = {
    type: "month",
    key: ovMonthKey.value,
    amount_fen: Math.round(Number(ovMonthAmount.value) * 100),
  };
  const v = validateOverride(estSettings.value, rec, todayDateKey());
  if (!v.ok) return uni.showToast({ title: v.error, icon: "none" });
  overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
}
function removeOverride(i) {
  overrides.value = overrides.value.filter((_, idx) => idx !== i);
}

/* ---- 批量覆盖未来 7 天 ---- */
const batchVisible = ref(false);
const DOW = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const batchRows = ref([]);

function buildBatchRows() {
  const today = todayDateKey();
  const rows = [];
  for (let i = 1; i <= 7; i++) {
    const dateKey = addDaysToDateKey(today, i);
    const d = new Date(dateKey);
    const exist = overrides.value.find((o) => o.type === "day" && o.key === dateKey);
    rows.push({
      dateKey,
      dow: DOW[d.getDay()],
      value: exist ? String(Math.round(exist.amount_fen / 100)) : "",
      placeholder: i === 1 ? "明日生效" : "保持不变",
    });
  }
  return rows;
}

function openBatch() {
  batchRows.value = buildBatchRows();
  batchVisible.value = true;
}
function closeBatch() {
  batchVisible.value = false;
}
function onBatchInput(i, val) {
  // 仅保留数字
  const cleaned = val.replace(/[^\d]/g, "");
  batchRows.value[i].value = cleaned;
}
function copyDown(i) {
  const src = batchRows.value[i].value;
  if (src === "") return;
  for (let j = i + 1; j < batchRows.value.length; j++) {
    if (batchRows.value[j].value === "") batchRows.value[j].value = src;
    else break; // 遇到已填值停止，避免覆盖用户手动输入
  }
}
function confirmBatch() {
  let changed = 0;
  batchRows.value.forEach((row) => {
    const raw = row.value.trim();
    if (raw === "") return; // 不改
    const yuan = Number(raw);
    if (!Number.isFinite(yuan)) return;
    const rec = {
      type: "day",
      key: row.dateKey,
      amount_fen: Math.round(yuan * 100),
    };
    const v = validateOverride(estSettings.value, rec, todayDateKey());
    if (!v.ok) {
      uni.showToast({ title: `${row.dateKey}：${v.error}`, icon: "none" });
      return;
    }
    overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
    changed++;
  });
  batchVisible.value = false;
  if (changed > 0) uni.showToast({ title: `已应用 ${changed} 天`, icon: "none" });
  else uni.showToast({ title: "未做修改", icon: "none" });
}

/* ---- 批量覆盖未来 1~3 个月 ---- */
const monthBatchVisible = ref(false);
const MONTH_LABELS = ["下月", "再下月", "下下月"];
const monthBatchRows = ref([]);

function addMonthsToMonthKey(monthKey, n) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthBatchRows() {
  const base = todayDateKey().slice(0, 7);
  const rows = [];
  for (let i = 1; i <= 3; i++) {
    const monthKey = addMonthsToMonthKey(base, i);
    const exist = overrides.value.find((o) => o.type === "month" && o.key === monthKey);
    rows.push({
      monthKey,
      label: MONTH_LABELS[i - 1],
      value: exist ? String(Math.round(exist.amount_fen / 100)) : "",
    });
  }
  return rows;
}

function openMonthBatch() {
  monthBatchRows.value = buildMonthBatchRows();
  monthBatchVisible.value = true;
}
function closeMonthBatch() {
  monthBatchVisible.value = false;
}
function onMonthBatchInput(i, val) {
  const cleaned = val.replace(/[^\d]/g, "");
  monthBatchRows.value[i].value = cleaned;
}
function copyMonthDown(i) {
  const src = monthBatchRows.value[i].value;
  if (src === "") return;
  for (let j = i + 1; j < monthBatchRows.value.length; j++) {
    if (monthBatchRows.value[j].value === "") monthBatchRows.value[j].value = src;
    else break;
  }
}
function confirmMonthBatch() {
  let changed = 0;
  monthBatchRows.value.forEach((row) => {
    const raw = row.value.trim();
    if (raw === "") return;
    const yuan = Number(raw);
    if (!Number.isFinite(yuan)) return;
    const rec = {
      type: "month",
      key: row.monthKey,
      amount_fen: Math.round(yuan * 100),
    };
    const v = validateOverride(estSettings.value, rec, todayDateKey());
    if (!v.ok) {
      uni.showToast({ title: `${row.monthKey}：${v.error}`, icon: "none" });
      return;
    }
    overrides.value = addOverride({ overrides: overrides.value }, rec, todayDateKey());
    changed++;
  });
  monthBatchVisible.value = false;
  if (changed > 0) uni.showToast({ title: `已应用 ${changed} 个月`, icon: "none" });
  else uni.showToast({ title: "未做修改", icon: "none" });
}

/* ---- 保存（M3：收紧即时、放宽次日生效；含限次与记录） ---- */
async function saveSettings() {
  const val = Math.floor(Number(poolYuan.value));
  if (!Number.isFinite(val) || val < 1 || !Number.isInteger(val)) {
    return uni.showToast({ title: "总限额需为整数且 ≥ 1 元", icon: "none" });
  }
  const curDim = (state.settings && state.settings.limit_dim) || "day";
  // 维度切换（日→月/年，或月/年→日）：先弹出统一确认，确认后再执行
  if (dim.value !== curDim) {
    await openSwitchConfirm(val);
    return;
  }
  try {
    const res = await saveBudgetPlan({
      dim: dim.value,
      amount_fen: val * 100,
      year_strategy: yearStrategy.value,
      month_strategy: monthStrategy.value,
      overrides: overrides.value,
    });
    await loadSettings();
    syncFromSettings();
    captureSnapshot(); // 保存并重新同步后再拍快照，使"恢复上次"反映当前生效态（pending 期间仍为旧值）
    await refreshTodayDashboard({ force: true });
    await loadChangeLog();
    // 按生效类型区分提示
    if (res && res.effect === "deferred") {
      const t = res.defer_to;
      const title =
        t === "next_month"
          ? "上调将于次月生效"
          : t === "next_year"
          ? "上调将于次年生效"
          : "将于次日生效";
      uni.showToast({ title, icon: "none" });
    } else if (res && res.effect === "immediate") {
      uni.showToast({ title: "已立即生效", icon: "none" });
    } else {
      uni.showToast({ title: "已保存", icon: "none" });
    }
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  }
}

/* ---- 维度切换确认弹层（切换日→月/年 时统一确认：生效时间 + 扣除已用额度） ---- */
const switchConfirmVisible = ref(false);
const switchPlan = ref({ fromDim: "day", toDim: "day", inputFen: 0 });
const switchTiming = ref("next_day");
const switchDeduct = ref(false);
const switchMonthUsedFen = ref(0);
const switchYearUsedFen = ref(0);
const switchUsedFen = computed(() =>
  switchPlan.value.toDim === "year" ? switchYearUsedFen.value : switchMonthUsedFen.value
);
const effectiveFen = computed(() =>
  switchDeduct.value
    ? Math.max(0, switchPlan.value.inputFen - switchUsedFen.value)
    : switchPlan.value.inputFen
);
// 切回日维度后将恢复的滚存金额（取 surplusPool 原值，不受非日维度归零影响）
const rollRestoreFen = computed(() => {
  const sp = state.surplusPool;
  return sp && typeof sp.rollOverPending === "number" ? sp.rollOverPending : 0;
});

function dimLabelText(d) {
  return { day: "日限额", month: "月限额", year: "年限额" }[d] || d;
}
function timingLabel(t) {
  return t === "next_month" ? "次月" : t === "next_year" ? "次年" : "次日";
}

async function openSwitchConfirm(val) {
  const curDim = (state.settings && state.settings.limit_dim) || "day";
  switchPlan.value = {
    fromDim: curDim,
    toDim: dim.value,
    inputFen: Math.floor(val) * 100,
  };
  switchTiming.value = "next_day";
  switchDeduct.value = false;
  if (dim.value !== "day") {
    try {
      const preview = await getLimitPreviewSpend(todayDateKey());
      const today = spentTodayFen.value || 0;
      switchMonthUsedFen.value = (preview.actualSpendThisMonthFen || 0) + today;
      switchYearUsedFen.value =
        (preview.actualSpendPriorMonthsThisYearFen || 0) + switchMonthUsedFen.value;
    } catch (e) {
      switchMonthUsedFen.value = 0;
      switchYearUsedFen.value = 0;
    }
  }
  switchConfirmVisible.value = true;
}

async function confirmSwitch() {
  switchConfirmVisible.value = false;
  try {
    // 切换维度时，仅保留新维度下仍生效的 override 类型；其它维度专属的临时调整随切换清除，
    // 避免"库里有、界面显示、但不生效"的幽灵数据（日维度只读 type:'day'）
    const VALID_OVERRIDE_TYPES = {
      day: ["day"],
      month: ["day", "month"],
      year: ["day", "month", "year"],
    };
    const keepTypes = VALID_OVERRIDE_TYPES[switchPlan.value.toDim] || ["day"];
    const keptOverrides = (overrides.value || []).filter((o) =>
      keepTypes.includes(o.type)
    );
    const res = await saveBudgetPlan({
      dim: switchPlan.value.toDim,
      amount_fen: effectiveFen.value,
      year_strategy: yearStrategy.value,
      month_strategy: monthStrategy.value,
      overrides: keptOverrides,
      effective_timing: switchTiming.value,
    });
    await loadSettings();
    syncFromSettings();
    captureSnapshot(); // 保存并重新同步后再拍快照，使"恢复上次"反映当前生效态（pending 期间仍为旧维度）
    await refreshTodayDashboard({ force: true });
    await loadChangeLog();
    uni.showToast({
      title: `将于${timingLabel(switchTiming.value)}生效`,
      icon: "none",
    });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  }
}

// 恢复上次：把表单回退到"已保存快照"（最后一次保存/加载时的值），仅本地回退未保存改动，不触发服务端写
function resetSettings() {
  const snap = savedSnapshot.value;
  if (!snap) return;
  dim.value = snap.dim;
  yearStrategy.value = snap.yearStrategy;
  monthStrategy.value = snap.monthStrategy;
  poolYuan.value = snap.poolYuan;
  dimDrafts.value[dim.value] = snap.poolYuan;
  overrides.value = JSON.parse(JSON.stringify(snap.overrides || []));
}

/* ---- 取消限额（归零即收紧至 0，立即生效，hasLimit 变为 false） ---- */
async function cancelLimit() {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: "取消限额",
      content: "取消后将不再限制你的每日/每月/每年花费，立即生效。确定吗？",
      confirmText: "取消限额",
      confirmColor: "#e07a7a",
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;
  try {
    await saveBudgetPlan({
      dim: dim.value,
      amount_fen: 0,
      year_strategy: yearStrategy.value,
      month_strategy: monthStrategy.value,
      overrides: [],
    });
    await loadSettings();
    syncFromSettings();
    await refreshTodayDashboard({ force: true });
    await loadChangeLog();
    uni.showToast({ title: "已立即取消限额", icon: "none" });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

/* ---- 终止待生效的放宽 / 取消维度切换（仅月/年）：作废 pending 并记为失败，重新计时 ---- */
async function terminatePending() {
  if (!hasPending.value) return;
  const isSwitch = pendingKind.value === "switch";
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: isSwitch ? "取消维度切换" : "终止待生效调整",
      content: isSwitch
        ? `当前已预约于「${pendingEffectiveLabel.value}」切换到${dimLabelText(
            state.settings.pending_limit_dim
          )}，取消后将维持当前${dimLabelText(
            state.settings.limit_dim
          )}（不切换）。确定吗？`
        : `当前有一条「${pendingEffectiveLabel.value}」的放宽待执行，终止后将记为失败并可重新设定。确定吗？`,
      confirmText: isSwitch ? "取消切换" : "终止",
      confirmColor: "#e07a7a",
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;
  try {
    await terminatePendingBudget({ dim: state.settings.pending_limit_dim || dim.value });
    await loadSettings();
    syncFromSettings();
    await loadChangeLog();
    uni.showToast({
      title: isSwitch ? "已取消切换，维持原维度" : "已终止，本次操作记为失败，可重新设定",
      icon: "none",
    });
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
  }
}

const goBack = () => uni.navigateBack();
const goHistory = () => uni.navigateTo({ url: "/pages/limit-history/limit-history" });
</script>

<style scoped lang="scss">
.limit-page {
  @include sj-theme-css-vars;
  width: 750rpx;
  height: 100vh;
  margin: 0 auto;
  background: linear-gradient(180deg, var(--g0), var(--g1), #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
  display: block;
  margin-bottom: 24rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.sec-head .section-title {
  margin-bottom: 0;
}
.sec-icon {
  width: 32rpx;
  height: 32rpx;
}
.tip-body {
  display: block;
  text-align: left;
}
.tip-line {
  display: block;
  font-size: 26rpx;
  color: var(--ink2);
  line-height: 1.7;
  text-align: left;
  text-indent: 2em;
  margin-bottom: 12rpx;
}
.tip-line:last-child {
  margin-bottom: 0;
}

.seg-row {
  display: flex;
  gap: 16rpx;
}
.seg-row.sm {
  margin-bottom: 20rpx;
}
.seg-item {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 24rpx;
  background: var(--g0);
  border: 1px solid var(--g2-1);
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink3);
  cursor: pointer;
}
.seg-tip-icon {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 35rpx;
  height: 35rpx;
}
.seg-item.active {
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6rpx 24rpx rgba(37, 204, 93, 0.3);
}
.seg-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-top: 20rpx;
  display: block;
}

.strategy-label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ink3);
  margin: 8rpx 0 16rpx;
}
.strategy-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin-top: 20rpx;
  display: block;
}
.strategy-static {
  display: block;
  font-size: 24rpx;
  color: var(--ink3);
  line-height: 1.6;
  margin-top: 12rpx;
}

.slider-value-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.slider-value {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 64rpx;
  font-weight: 900;
  color: var(--g5);
  word-break: break-all;
}
.slider-hint {
  flex: 1 1 auto;
  white-space: nowrap;
  font-size: 24rpx;
  color: var(--ink4);
}
.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: var(--ink4);
  margin-top: 8rpx;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 28rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 28rpx;
  padding: 0 28rpx;
  height: 92rpx;
}
.input-prefix {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--g5);
}
.limit-input {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--ink);
}
.input-unit {
  font-size: 24rpx;
  color: var(--ink4);
}

.preview-box {
  margin-top: 32rpx;
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  background: rgba(37, 204, 93, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.preview-label {
  font-size: 22rpx;
  color: var(--ink4);
}
.preview-value {
  font-size: 44rpx;
  font-weight: 900;
  color: var(--g5);
}
.preview-sub {
  font-size: 22rpx;
  color: var(--ink3);
}
.preview-c {
  font-size: 22rpx;
  color: var(--ink3);
  line-height: 1.5;
}

.collapse-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.collapse-arrow {
  font-size: 28rpx;
  color: var(--ink4);
}
.override-tip {
  font-size: 22rpx;
  color: var(--ink4);
  margin: 20rpx 0;
  display: block;
}

.override-add {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ov-input-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 24rpx;
  padding: 0 20rpx;
  height: 84rpx;
}
.ov-input-group.grow {
  flex: 1;
}
.ov-prefix {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--g5);
}
.ov-picker {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink);
}
.ov-field {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}
.ov-add-btn {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 40rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ov-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ov-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--g1);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
}
.ov-item-key {
  font-size: 24rpx;
  color: var(--ink3);
  font-weight: 600;
}
.ov-item-amt {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--ink);
}
.ov-item-del {
  font-size: 26rpx;
  color: var(--red-soft);
  cursor: pointer;
  padding: 0 8rpx;
}

.save-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  text-align: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
}
.reset-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 28rpx;
  text-align: center;
  color: var(--ink4);
  font-size: 24rpx;
  font-weight: 600;
  cursor: pointer;
}
.cancel-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 28rpx;
  text-align: center;
  color: var(--r6);
  font-size: 24rpx;
  font-weight: 600;
  cursor: pointer;
}
.dual-btn {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

/* ---- 批量覆盖入口 ---- */
.batch-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin: 24rpx 0;
  cursor: pointer;
}
.batch-entry-row {
  display: flex;
  gap: 20rpx;
  margin: 32rpx 32rpx 0;
}
.batch-entry--half {
  flex: 1;
  margin: 0;
}
.batch-entry-text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ink3);
}
.batch-entry-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.batch-entry-icon {
  width: 32rpx;
  height: 32rpx;
}
.batch-entry-arrow {
  font-size: 36rpx;
  color: var(--ink4);
}

/* ---- 批量覆盖弹框 ---- */
.batch-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}
.batch-sheet {
  width: 750rpx;
  max-height: 86vh;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.batch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.batch-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.batch-tip-icon {
  width: 36rpx;
  height: 36rpx;
}
.batch-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
}
.batch-close {
  font-size: 32rpx;
  color: var(--ink4);
  padding: 8rpx 16rpx;
  cursor: pointer;
}
.batch-sub {
  font-size: 22rpx;
  color: var(--ink4);
  margin: 12rpx 0 24rpx;
  display: block;
}
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  overflow-y: auto;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.batch-date {
  width: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.batch-dow {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ink3);
}
.batch-dk {
  font-size: 20rpx;
  color: var(--ink4);
}
.batch-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--g1);
  border: 1px solid var(--g2-1);
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 80rpx;
}
.batch-yen {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--g5);
}
.batch-input {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
}
.batch-ph {
  color: var(--ink4);
  font-weight: 500;
}
.batch-copy {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: var(--g0);
  border: 1px solid var(--g2-1);
  color: var(--g5);
  font-size: 30rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.batch-copy--disabled {
  opacity: 0.35;
  pointer-events: none;
}
.batch-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.batch-cancel {
  flex: 1;
  padding: 26rpx;
  border-radius: 28rpx;
  text-align: center;
  background: var(--g1);
  color: var(--ink3);
  font-size: 28rpx;
  font-weight: 700;
  cursor: pointer;
}
.batch-confirm {
  flex: 2;
  padding: 26rpx;
  border-radius: 28rpx;
  text-align: center;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
}

/* ---- 放宽限次提示 / 终止 ---- */
.quota-hint {
  font-size: 22rpx;
  color: var(--ink4);
  text-align: center;
  margin-bottom: 18rpx;
}
.pending-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx;
  margin-bottom: 18rpx;
  background: rgba(255, 107, 107, 0.08);
  border-radius: 16rpx;
}
.pending-tip-text {
  font-size: 22rpx;
  color: #e07a7a;
  text-align: center;
}
.terminate-btn {
  padding: 10rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(224, 122, 122, 0.12);
  border: 1rpx solid rgba(224, 122, 122, 0.4);
  font-size: 22rpx;
  color: #e07a7a;
}

/* ---- 预算修改记录弹层 ---- */
.log-sheet {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  max-height: 60vh;
  overflow-y: auto;
}
.log-quota {
  display: flex;
  justify-content: space-around;
  padding: 16rpx;
  background: rgba(37, 204, 93, 0.08);
  border-radius: 14rpx;
}
.log-quota-item {
  font-size: 22rpx;
  color: var(--ink);
  font-weight: 600;
}
.log-empty {
  padding: 40rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--ink4);
}
.log-item {
  padding: 18rpx 20rpx;
  background: var(--g1);
  border-radius: 14rpx;
}
.log-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.log-row-2 {
  margin-top: 8rpx;
  justify-content: space-between;
}
.log-dim {
  font-size: 22rpx;
  color: var(--ink4);
}
.log-type {
  font-size: 22rpx;
  font-weight: 600;
}
.t-tighten {
  color: #25cc5d;
}
.t-loosen {
  color: #e0a23c;
}
.log-amount {
  font-size: 24rpx;
  color: var(--ink);
  font-weight: 600;
}
.log-status {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 10rpx;
}
.tag-applied {
  color: #25cc5d;
  background: rgba(37, 204, 93, 0.12);
}
.tag-scheduled {
  color: #e0a23c;
  background: rgba(224, 162, 60, 0.12);
}
.tag-failed {
  color: #e07a7a;
  background: rgba(224, 122, 122, 0.12);
}
.log-eff {
  font-size: 20rpx;
  color: var(--ink4);
}
.log-time {
  font-size: 20rpx;
  color: var(--ink4);
}
/* 维度切换确认弹层 */
.switch-sheet {
  padding: 40rpx 32rpx 48rpx;
  padding-bottom: calc(env(safe-area-inset-bottom, 0rpx));
}
.switch-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f1f1f;
  text-align: center;
}
.switch-plan {
  margin-top: 16rpx;
  text-align: center;
  font-size: 28rpx;
  color: #555;
}
.switch-amount {
  margin-top: 8rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.switch-section {
  margin-top: 28rpx;
}
.switch-label {
  font-size: 26rpx;
  color: #888;
  margin-bottom: 16rpx;
}
.switch-radios {
  display: flex;
  gap: 16rpx;
}
.switch-radio {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 26rpx;
  border-radius: 14rpx;
  background: #f4f4f5;
  color: #555;
  border: 1rpx solid transparent;
}
.switch-radio.active {
  background: #e8f1ff;
  color: #2b7cff;
  border-color: #2b7cff;
}
.switch-check {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #555;
  padding: 16rpx 0;
}
.switch-check-box {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 1rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}
.switch-check.active .switch-check-box {
  background: #2b7cff;
  border-color: #2b7cff;
}
.switch-deduct-info {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
