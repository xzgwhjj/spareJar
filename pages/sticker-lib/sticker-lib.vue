<template>
  <view class="sticker-page" data-cmp="StickerLib">
    <PageHeader title="贴纸库" @back="goBack" />

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        @click="switchTab(t.key)"
      >
        <text class="tab-label">{{ t.label }}</text>
        <text class="tab-count">{{ countOf(t.key) }}</text>
      </view>
    </view>

    <!-- 分类 tab 下的支出 / 收入 二级切换 -->
    <view v-if="tab === 'material'" class="sub-tabs">
      <view
        class="sub-tab"
        :class="{ active: catSubTab === 'expense' }"
        @click="catSubTab = 'expense'"
      >
        <text>支出</text>
      </view>
      <view
        class="sub-tab"
        :class="{ active: catSubTab === 'income' }"
        @click="catSubTab = 'income'"
      >
        <text>收入</text>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false">
      <!-- 统计卡 -->
      <view class="glass-mid stat-card">
        <view class="stat-block">
          <text class="stat-val" style="color: #25cc5d">{{ list.length }}</text>
          <text class="stat-lbl">{{
            tab === "stock" ? "囤货种类" : tab === "custom" ? "上传贴纸" : "素材种类"
          }}</text>
        </view>
        <view class="stat-block">
          <text class="stat-val" style="color: #3b82f6">{{ totalUsed }}</text>
          <text class="stat-lbl">总使用次数</text>
        </view>
        <view class="stat-block" v-if="tab === 'custom'">
          <text class="stat-val" style="color: #7c5cff">{{ comboCount }}</text>
          <text class="stat-lbl">AI组合</text>
        </view>
        <view class="stat-block" v-if="tab === 'stock'">
          <text class="stat-val" style="color: #f59e0b">{{ lowStockCount }}</text>
          <text class="stat-lbl">库存紧张</text>
        </view>
      </view>

      <!-- 贴纸网格 -->
      <view class="sticker-grid">
        <view
          v-for="(s, i) in list"
          :key="s._id"
          class="sticker-card glass-mid"
          :class="{ disabled: isOutOfStock(s) }"
          :style="{ animationDelay: i * 0.04 + 's' }"
          @click="onTap(s)"
          @longpress="onLongPress(s)"
        >
          <image class="sticker-card-bg" :src="stickerBgUrl" mode="aspectFit" />
          <image
            v-if="s.kind === 'category' && s.icon_type === 'image' && s.icon_url"
            class="sticker-img"
            :src="iconDisplay(s.icon_url)"
            mode="aspectFill"
          />
          <image
            v-else-if="s.image_url"
            class="sticker-img"
            :src="iconDisplay(s.image_url)"
            mode="aspectFill"
          />
          <view v-else class="sticker-img sticker-img-ph">{{
            s.kind === "category" ? s.icon || "🗂️" : "🖼️"
          }}</view>
          <view v-if="tab === 'stock' && isLowStock(s)" class="badge low">库存紧张</view>
          <view v-if="tab === 'stock' && isOutOfStock(s)" class="badge out">需补货</view>
          <view v-if="tab === 'custom' && s.combo_type === 'combo'" class="badge combo"
            >AI组合</view
          >

          <text class="sticker-name">{{ s.name }}</text>

          <template v-if="tab === 'stock' && s.type === 'stock'">
            <text class="sticker-sub"
              >库存 {{ s.stock_qty }} · ¥{{ yuan(s.unit_price) }}/件</text
            >
            <view class="consume-btn" @click.stop="onTap(s)"
              >消耗 1 件
              <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
              <amount-keyboard />
            </view>
          </template>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="list.length === 0" class="empty">
        <image class="empty-icon" :src="emptyIconUrl" mode="aspectFit" />
        <text class="empty-text">{{
          tab === "stock"
            ? "还没有囤货贴纸，去添加一个吧"
            : tab === "custom"
            ? "上传或组合你的第一张贴纸"
            : catSubTab === "income"
            ? "还没有收入分类的素材贴纸"
            : "还没有支出分类的素材贴纸"
        }}</text>
        <view class="empty-btn" @click="goCreate"><text>＋ 新建贴纸</text></view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>

    <!-- 贴纸详情弹窗（从小放大） -->
    <view v-if="showDetail" class="detail-mask" @click="closeDetail">
      <view class="detail-panel" @click.stop>
        <view class="detail-close" @click="closeDetail">×</view>

        <view class="detail-hero">
          <image class="detail-hero-bg" :src="stickerBgUrl" mode="aspectFit" />
          <image
            v-if="
              detail.kind === 'category' &&
              detail.icon_type === 'image' &&
              detail.icon_url
            "
            class="detail-img"
            :src="iconDisplay(detail.icon_url)"
            mode="aspectFit"
            @click="previewDetailImg"
          />
          <image
            v-else-if="detail.image_url"
            class="detail-img"
            :src="iconDisplay(detail.image_url)"
            mode="aspectFit"
            @click="previewDetailImg"
          />
          <view v-else class="detail-img detail-img-ph">{{
            detail.kind === "category" ? detail.icon || "🗂️" : "🖼️"
          }}</view>
        </view>

        <text class="detail-name">{{ detail.name }}</text>
        <view class="detail-tag">{{ detailTag(detail) }}</view>

        <view v-if="detailDesc" class="detail-desc">
          <text class="detail-desc-label">简介</text>
          <text class="detail-desc-text">{{ detailDesc }}</text>
        </view>

        <view class="detail-rows">
          <view v-for="r in detailRows" :key="r.label" class="detail-row">
            <text class="dr-label">{{ r.label }}</text>
            <text class="dr-value">{{ r.value }}</text>
          </view>
        </view>

        <view class="detail-actions">
          <template v-if="detail.kind === 'category'">
            <view class="detail-btn ghost" @click="editCategoryFromDetail">编辑分类</view>
            <view
              v-if="detailCat && !detailCat.is_system"
              class="detail-btn danger"
              @click="openCatDelete"
              >删除分类</view
            >
          </template>
          <view
            v-else
            class="detail-btn"
            :class="{ ghost: detail.type === 'stock' }"
            @click="goEditFromDetail"
            >编辑</view
          >
        </view>
      </view>
    </view>

    <!-- 编辑分类弹框（不跳转，就地修改分类 name/icon/desc） -->
    <view v-if="catEditOpen" class="sheet-mask top" @click="closeCatEdit(false)">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">编辑分类</text>

        <text class="form-label">名称</text>
        <view class="name-field">
          <input
            v-model="catForm.name"
            :focus="catNameFocus"
            maxlength="32"
            placeholder="如：奶茶、打车"
            placeholder-class="sheet-ph"
            placeholder-style="color:#6b8c7a;font-size:28rpx;"
          />
        </view>

        <text class="form-label">简介 / 备注（可选）</text>
        <view class="desc-field">
          <textarea
            v-model="catForm.desc"
            maxlength="100"
            placeholder="补充这个分类的说明"
            placeholder-class="sheet-ph"
            auto-height
          />
        </view>

        <text class="form-label">图标</text>
        <view class="emoji-grid">
          <view
            v-for="em in EMOJIS"
            :key="em"
            class="emoji-cell"
            :class="{ active: catForm.icon_type !== 'image' && catForm.icon === em }"
            @click="pickCatEmoji(em)"
            ><text>{{ em }}</text></view
          >
        </view>

        <view class="icon-upload">
          <view class="upload-cell" @click="chooseCatIcon">
            <image
              v-if="catForm.icon_type === 'image' && catForm.icon_url"
              class="upload-prev"
              :src="iconDisplay(catForm.icon_url)"
              mode="aspectFill"
            />
            <text v-else class="upload-plus">＋</text>
            <text v-if="catForm.icon_type !== 'image'" class="upload-txt">上传图片</text>
            <view
              v-if="catForm.icon_type === 'image'"
              class="upload-clear"
              @click.stop="clearCatIcon"
              >×</view
            >
          </view>
        </view>

        <view class="sheet-btn" :class="{ loading: catSaving }" @click="saveCatEdit">
          <text>{{ catSaving ? "保存中…" : "保存" }}</text>
        </view>
      </view>
    </view>

    <!-- 删除分类弹框：有账目时选择处理方式 -->
    <view v-if="catDelOpen" class="sheet-mask top" @click="catDelOpen = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">删除分类</text>

        <view class="del-tip"> 确认删除「{{ catDelName }}」？此操作不可恢复。 </view>

        <template v-if="catDelUsage > 0">
          <text class="form-label" style="margin-top: 28rpx"
            >该分类下有 {{ catDelUsage }} 笔账目，请选择处理方式</text
          >
          <view class="mode-list">
            <view
              class="mode-item"
              :class="{ active: catDelMode === 'keep' }"
              @click="catDelMode = 'keep'"
            >
              <view class="mode-main">
                <text class="mode-name">保留账目，仅删除分类</text>
                <text class="mode-desc"
                  >账目仍显示为该分类，只是分类不再出现在选择列表</text
                >
              </view>
              <text v-if="catDelMode === 'keep'" class="mode-check">✓</text>
            </view>
            <view
              class="mode-item"
              :class="{ active: catDelMode === 'merge' }"
              @click="catDelMode = 'merge'"
            >
              <view class="mode-main">
                <text class="mode-name">转移到其他分类</text>
                <text class="mode-desc">账目与贴纸转移到目标分类，账目保留</text>
              </view>
              <text v-if="catDelMode === 'merge'" class="mode-check">✓</text>
            </view>
            <view
              class="mode-item"
              :class="{ active: catDelMode === 'purge' }"
              @click="catDelMode = 'purge'"
            >
              <view class="mode-main">
                <text class="mode-name">连同账目一并删除</text>
                <text class="mode-desc"
                  >同时删除这 {{ catDelUsage }} 笔账目，相关金额会同步回滚</text
                >
              </view>
              <text v-if="catDelMode === 'purge'" class="mode-check">✓</text>
            </view>
          </view>

          <template v-if="catDelMode === 'merge'">
            <text class="form-label" style="margin-top: 28rpx">选择目标分类</text>
            <view class="merge-list">
              <view
                v-for="t in catDelTargets"
                :key="t._id"
                class="merge-item"
                :class="{ active: catDelTargetId === t._id }"
                @click="catDelTargetId = t._id"
              >
                <text class="merge-icon">{{ t.icon }}</text>
                <text class="merge-name">{{ t.name }}</text>
                <text v-if="catDelTargetId === t._id" class="merge-check">✓</text>
              </view>
              <view v-if="!catDelTargets.length" class="merge-empty"
                ><text>无其他可选分类</text></view
              >
            </view>
          </template>
        </template>
        <view v-else class="del-tip">该分类下没有账目，可直接删除。</view>

        <view
          class="sheet-btn danger"
          :class="{ loading: catDelSaving }"
          @click="confirmCatDelete"
        >
          <text>{{ catDelSaving ? "删除中…" : "确认删除" }}</text>
        </view>
      </view>
    </view>

    <!-- 消耗确认弹窗 -->
    <view v-if="showConsume" class="sheet-mask" @click="showConsume = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">消耗记账 · {{ activeSticker.name }}</text>
        <view class="consume-preview">
          <image class="cp-img" :src="iconDisplay(activeSticker.image_url)" mode="aspectFill" />
          <view class="cp-info">
            <text class="cp-name">{{ activeSticker.name }}</text>
            <text v-if="activeSticker.type === 'stock'" class="cp-stock"
              >库存 {{ activeSticker.stock_qty }} 件 · 已用
              {{ activeSticker.use_count || 0 }} 次</text
            >
            <text v-if="activeSticker.type === 'stock'" class="cp-price"
              >单价 ¥{{ yuan(activeSticker.unit_price) }}</text
            >
            <text v-if="activeSticker.category_id" class="cp-cat"
              >分类 · {{ catName(activeSticker.category_id) }}</text
            >
          </view>
        </view>

        <view v-if="activeSticker.desc" class="consume-desc">
          <text class="cd-label">简介</text>
          <text class="cd-text">{{ activeSticker.desc }}</text>
        </view>

        <view v-if="isLowStock(activeSticker)" class="consume-tip"
          >库存紧张（阈值
          {{ activeSticker.low_stock_threshold ?? 1 }} 件），消耗后记得补货</view
        >

        <view class="qty-row">
          <text class="qty-label">消耗数量</text>
          <view class="stepper">
            <view class="step-btn" @click="decQty">−</view>
            <text class="qty-val">{{ consumeQty }}</text>
            <view class="step-btn" @click="incQty">＋</view>
          </view>
        </view>

        <view class="amount-line">
          <text>将记一笔支出</text>
          <text class="amount-val"
            >¥{{ yuan(activeSticker.unit_price * consumeQty) }}</text
          >
        </view>

        <view class="sheet-btn" :class="{ loading: consuming }" @click="confirmConsume">
          <text>{{ consuming ? "记账中…" : "确认消耗并记账" }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user.js";
import { requireLogin } from '@/utils/guard.js';
import { formatFen } from "@/utils/money.js";
import { cdn, getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import PageHeader from '@/components/PageHeader.vue';
import { deleteCategory, updateCategory } from "@/api/sparejar.js";
import { deleteCatIcon } from "@/utils/cloudFile.js";

const {
  state,
  categoryMap,
  loadStickers,
  loadCategories,
  consumeStickerAction,
  deleteStickerAction,
} = useUserStore();

const TABS = [
  { key: "stock", label: "囤货", icon: "📦" },
  { key: "material", label: "分类", icon: "🗂️" },
  { key: "custom", label: "我的上传", icon: "⬆️" },
];

// 空状态图标：与账本页三个贴纸卡片保持一致的 CDN 图
const EMPTY_ICON = {
  stock: "/app_static/images/icon_no_stock_sticker.png",
  material: "/app_static/images/icon_no_category_sticker.png",
  custom: "/app_static/images/icon_create_sticker.png",
};
const emptyIconUrl = computed(() => cdn(EMPTY_ICON[tab.value] || EMPTY_ICON.stock));

// 贴纸卡片底图（与账本页三个贴纸卡片保持一致）
const stickerBgUrl = cdn("/app_static/images/icon_sticker_bg2.png");

const tab = ref("stock");
// 分类贴纸（type=material）下的二级切换：按关联分类的支出/收入
const catSubTab = ref("expense"); // 'expense' | 'income'

// 分类 id → 支出/收入 类型映射（用全量兜底，已删除分类的贴纸仍能正确归类）
const catTypeMap = computed(() => {
  const m = {};
  (state.allCategories || []).forEach((c) => {
    if (c && c._id) m[String(c._id)] = c.type;
  });
  (state.categories || []).forEach((c) => {
    if (c && c._id) m[String(c._id)] = c.type;
  });
  return m;
});

// 贴纸归属的支出/收入类型：通过 category_id 查分类；无分类或查不到默认支出
function catTypeOf(s) {
  if (!s || !s.category_id) return "expense";
  const t = catTypeMap.value[String(s.category_id)];
  return t === "income" ? "income" : "expense";
}

// 分类贴纸（type=material）无数据时，回退展示账本分类（与账本页分类贴纸卡片逻辑一致）
function categoryFallback(filterType) {
  return (Array.isArray(state.categories) ? state.categories : [])
    .filter((c) => !c.deleted_at && (filterType ? c.type === filterType : true))
    .map((c) => ({
      _id: c._id,
      kind: "category",
      type: "material",
      catType: c.type === "income" ? "income" : "expense",
      name: c.name,
      icon: c.icon || "",
      icon_type: c.icon_type || "emoji",
      icon_url: c.icon_url || "",
      image_url: "",
      use_count: 0,
    }));
}

const list = computed(() => {
  const rows = (state.stickers || []).filter((s) => s.type === tab.value);
  if (tab.value === "material") {
    const filtered = rows.filter((s) => catTypeOf(s) === catSubTab.value);
    if (filtered.length === 0) {
      // 该收支类型下既无素材贴纸，则回退展示对应类型的账本分类
      const fb = categoryFallback(catSubTab.value);
      if (fb.length > 0) return fb;
      // 两个类型都无素材也无分类时，退回到全部素材（避免空白）
      if (rows.length > 0) return rows;
    }
    return filtered;
  }
  return rows;
});

const totalUsed = computed(() => list.value.reduce((s, x) => s + (x.use_count || 0), 0));
const lowStockCount = computed(() => list.value.filter((s) => isLowStock(s)).length);
const comboCount = computed(
  () => list.value.filter((s) => s.combo_type === "combo").length
);

function countOf(key) {
  const rows = (state.stickers || []).filter((s) => s.type === key);
  if (key === "material" && rows.length === 0) {
    return (state.categories || []).length;
  }
  return rows.length;
}

// 分类贴纸按支出/收入拆分计数（含回退分类）
function countByCatType(catType) {
  const rows = (state.stickers || []).filter(
    (s) => s.type === "material" && catTypeOf(s) === catType
  );
  if (rows.length === 0) {
    return (state.categories || []).filter(
      (c) => !c.deleted_at && (catType ? c.type === catType : true)
    ).length;
  }
  return rows.length;
}

function yuan(fen) {
  if (!fen) return "0.00";
  return formatFen(fen);
}

function catName(catId) {
  const c = categoryMap.value[String(catId)];
  return c ? c.name : "未分类";
}

function isLowStock(s) {
  if (s.type !== "stock") return false;
  const threshold = s.low_stock_threshold != null ? s.low_stock_threshold : 1;
  return s.stock_qty > 0 && s.stock_qty <= threshold;
}
function isOutOfStock(s) {
  return s.type === "stock" && s.stock_qty <= 0;
}

// 消耗弹窗
const showConsume = ref(false);
const activeSticker = ref({});
const consumeQty = ref(1);
const consuming = ref(false);

function onTap(s) {
  // 囤货贴纸：直接弹消耗弹窗（选数量 → 记账）
  if (s.type === "stock") {
    openConsume(s);
    return;
  }
  // 分类贴纸 / 用户上传贴纸：弹详情弹窗
  openDetail(s);
}

/** 打开消耗弹窗（囤货贴纸专用） */
function openConsume(s) {
  if (isOutOfStock(s)) {
    uni.showToast({ title: "库存为 0，请先补货", icon: "none" });
    return;
  }
  activeSticker.value = s;
  consumeQty.value = 1;
  showConsume.value = true;
}

/* ---------- 贴纸详情弹窗 ---------- */
const showDetail = ref(false);
const detail = ref({});

function openDetail(s) {
  detail.value = s;
  showDetail.value = true;
}
function closeDetail() {
  showDetail.value = false;
}

/** 详情类型标签 */
function detailTag(s) {
  if (s.kind === "category") return "账本分类";
  if (s.type === "stock") return "囤货贴纸";
  if (s.type === "custom") return s.combo_type === "combo" ? "AI 组合" : "单独拍摄";
  return "分类素材";
}

/** 当前详情对应的完整账本分类（含 is_system / usage_count 等字段） */
const detailCat = computed(() => {
  const s = detail.value;
  if (!s || !s._id || s.kind !== "category") return null;
  return (state.categories || []).find((x) => x._id === s._id) || null;
});

/** 详情里展示的简介：贴纸用自身 desc，分类用分类 desc */
const detailDesc = computed(() => {
  const s = detail.value;
  if (!s || !s._id) return "";
  if (s.kind === "category") {
    const c = detailCat.value;
    return (c && c.desc) || "";
  }
  return s.desc || "";
});

/** 详情信息行（按类型动态组装） */
const detailRows = computed(() => {
  const s = detail.value;
  if (!s || !s._id) return [];
  if (s.kind === "category") {
    const c = (state.categories || []).find((x) => x._id === s._id) || {};
    const rows = [{ label: "分组", value: c.type === "income" ? "收入" : "支出" }];
    if (c.usage_count != null)
      rows.push({ label: "关联账目", value: `${c.usage_count} 笔` });
    return rows;
  }
  const rows = [{ label: "使用次数", value: `${s.use_count || 0} 次` }];
  if (s.type === "stock") {
    rows.push({ label: "当前库存", value: `${s.stock_qty ?? 0} 件` });
    rows.push({ label: "单价", value: `¥${yuan(s.unit_price)}` });
    rows.push({
      label: "状态",
      value: isOutOfStock(s) ? "需补货" : isLowStock(s) ? "库存紧张" : "充足",
    });
  }
  if (s.category_id) rows.push({ label: "所属分类", value: catName(s.category_id) });
  if (s.type === "custom" && s.combo_type === "combo" && Array.isArray(s.source_images)) {
    rows.push({ label: "合成原图", value: `${s.source_images.length} 张` });
  }
  if (s.created_at)
    rows.push({ label: "创建时间", value: String(s.created_at).slice(0, 10) });
  return rows;
});

/** 详情大图点击 → 全屏预览 */
function previewDetailImg() {
  const d = detail.value;
  const raw = d && (d.image_url || (d.icon_type === "image" ? d.icon_url : ""));
  const url = iconDisplay(raw);
  if (!url) return;
  uni.previewImage({ urls: [url], current: url });
}

/** 从详情弹窗进入编辑 */
function goEditFromDetail() {
  const s = detail.value;
  showDetail.value = false;
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?id=${s._id}` });
}

/** 从详情弹窗就地编辑该分类（不跳转，直接弹框） */
const catEditOpen = ref(false);
const catSaving = ref(false);
const catForm = ref({
  _id: "",
  name: "",
  desc: "",
  icon: "📦",
  icon_type: "emoji",
  icon_url: "",
});
// 微信原生 input 不聚焦时不重绘回显值，打开编辑框时对名称框自动聚焦以强制渲染
const catNameFocus = ref(false);
// 分类自定义图标：数据库存 cloud:// fileID，<image> 不能直接渲染，
// 需经 getCloudTempUrl 解析成临时地址。这里集中维护 fileID→临时URL 的映射，
// 模板统一用 iconDisplay(url) 取可显示地址（非 cloud:// 的原样返回）。
const catIconUrls = ref({});
function iconDisplay(url) {
  if (!url) return "";
  url = String(url);
  if (url.startsWith("cloud://")) return catIconUrls.value[url] || "";
  return url;
}
async function refreshCatIconUrls() {
  const ids = [];
  (state.categories || []).forEach((c) => {
    if (
      c.icon_type === "image" &&
      c.icon_url &&
      String(c.icon_url).startsWith("cloud://")
    )
      ids.push(c.icon_url);
  });
  (state.stickers || []).forEach((s) => {
    if (
      s.icon_type === "image" &&
      s.icon_url &&
      String(s.icon_url).startsWith("cloud://")
    )
      ids.push(s.icon_url);
    // 普通图片贴纸的图片存在 image_url（cloud://），同样需解析
    if (s.image_url && String(s.image_url).startsWith("cloud://")) ids.push(s.image_url);
  });
  if (!ids.length) return;
  const map = await getCloudTempUrls(ids);
  catIconUrls.value = { ...catIconUrls.value, ...map };
}
const EMOJIS = [
  "🍜",
  "🥡",
  "🧋",
  "🛒",
  "🏪",
  "🚌",
  "🚕",
  "⛽",
  "🅿️",
  "📞",
  "📦",
  "🏠",
  "🏦",
  "🚗",
  "💧",
  "💡",
  "🔥",
  "🏢",
  "🌐",
  "📱",
  "👕",
  "👟",
  "💇",
  "💄",
  "🛋️",
  "🍳",
  "✈️",
  "🏨",
  "🎬",
  "🎮",
  "🏋️",
  "🎨",
  "🐱",
  "📚",
  "🏥",
  "💊",
  "🩺",
  "🛡️",
  "🦷",
  "🎓",
  "📖",
  "💻",
  "📝",
  "👶",
  "🧧",
  "🍻",
  "🎁",
  "💰",
  "📈",
];
function editCategoryFromDetail() {
  const s = detail.value;
  if (!s || !s._id) return;
  const c = (state.categories || []).find((x) => x._id === s._id) || {};
  const target = {
    _id: s._id,
    name: c.name || s.name || "",
    desc: c.desc || "",
    icon: c.icon || s.icon || "📦",
    icon_type: c.icon_type || "emoji",
    icon_url: c.icon_url || "",
  };
  // 先以空值打开弹窗，再用 setTimeout 延迟回填：
  // 微信原生 input/textarea 是异步挂载的，若在组件就绪前（如 nextTick 微任务阶段）
  // 就赋值，值会被丢弃、直到聚焦才显示。等宏任务阶段原生组件稳定后再给值即可正常回显。
  catForm.value = {
    _id: s._id,
    name: "",
    desc: "",
    icon: "📦",
    icon_type: "emoji",
    icon_url: "",
  };
  catEditOpen.value = true;
  catNameFocus.value = false;
  setTimeout(async () => {
    catForm.value = target;
    // 记录「打开时数据库里的原图」，以及重置本次会话上传记录
    catOrigIconFileID.value =
      target.icon_url && String(target.icon_url).startsWith("cloud://")
        ? target.icon_url
        : "";
    catSessionUploads.value = [];
    catNameFocus.value = true; // 自动聚焦名称框，强制微信渲染已回显的名称
    // 已有图片图标：fileID 需解析成临时地址才能回显
    if (
      target.icon_type === "image" &&
      target.icon_url &&
      String(target.icon_url).startsWith("cloud://") &&
      !catIconUrls.value[target.icon_url]
    ) {
      const m = await getCloudTempUrls([target.icon_url]);
      catIconUrls.value = { ...catIconUrls.value, ...m };
    }
  }, 80);
}

async function saveCatEdit() {
  if (catSaving.value) return;
  const name = (catForm.value.name || "").trim();
  if (!name) {
    uni.showToast({ title: "请输入分类名称", icon: "none" });
    return;
  }
  catSaving.value = true;
  try {
    const isImage = catForm.value.icon_type === "image";
    await updateCategory(catForm.value._id, {
      name,
      desc: (catForm.value.desc || "").trim(),
      icon: catForm.value.icon,
      icon_type: catForm.value.icon_type || "emoji",
      icon_url: isImage ? catForm.value.icon_url || "" : "",
    });
    closeCatEdit(true);
    showDetail.value = false;
    uni.showToast({ title: "已保存", icon: "success" });
    await loadStickers();
    await loadCategories();
    await refreshCatIconUrls();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  } finally {
    catSaving.value = false;
  }
}

// 选 emoji 图标（同时切回 emoji 类型，清空自定义图标）
function pickCatEmoji(em) {
  catForm.value.icon = em;
  catForm.value.icon_type = "emoji";
  catForm.value.icon_url = "";
}
// 上传自定义图标：选图 → 传 uniCloud → 写入 icon_url
const catUploading = ref(false);
// 云端图标文件清理：记录「打开时数据库里的原图 fileID」与「本次会话新上传的文件」，
// 在保存/关闭时删除已不再被引用的旧文件，避免云存储孤儿文件累积。
const catOrigIconFileID = ref("");
const catSessionUploads = ref([]);
function disposeIconFile(fileID) {
  if (!fileID || !String(fileID).startsWith("cloud://")) return;
  // 尽力删除，失败不阻塞主流程
  deleteCatIcon(fileID).catch(() => {});
}
function closeCatEdit(saved) {
  const finalId = catForm.value.icon_url || "";
  const toDelete = new Set();
  // 保存成功：若原图被替换/移除，删除原图
  if (
    saved &&
    catOrigIconFileID.value &&
    catOrigIconFileID.value.startsWith("cloud://") &&
    catOrigIconFileID.value !== finalId
  ) {
    toDelete.add(catOrigIconFileID.value);
  }
  // 本次会话新上传的文件：保存时仅保留最终那张，取消时全部删除
  for (const f of catSessionUploads.value) {
    if (saved ? f !== finalId : true) toDelete.add(f);
  }
  toDelete.forEach(disposeIconFile);
  catEditOpen.value = false;
}
async function chooseCatIcon() {
  let imgPath = "";
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
    imgPath = (res.tempFilePaths && res.tempFilePaths[0]) || "";
  } catch (_e) {
    return; // 用户取消
  }
  if (!imgPath) return;
  catUploading.value = true;
  uni.showLoading({ title: "上传中…", mask: true });
  try {
    const ext = (imgPath.split(".").pop() || "png").split("?")[0].toLowerCase();
    const cloudPath = `cat-icons/${
      state.uid || "anon"
    }/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await uniCloud.uploadFile({ filePath: imgPath, cloudPath });
    const fileID = (up && up.fileID) || "";
    if (fileID) {
      // 存 fileID（与项目其余上传一致），并解析临时地址用于即时回显
      catForm.value.icon_type = "image";
      catForm.value.icon_url = fileID;
      catSessionUploads.value = [...catSessionUploads.value, fileID];
      const url = await getCloudTempUrl(fileID);
      catIconUrls.value = { ...catIconUrls.value, [fileID]: url };
    } else {
      uni.showToast({ title: "上传失败，请重试", icon: "none" });
    }
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
  } finally {
    catUploading.value = false;
    uni.hideLoading();
  }
}
// 移除自定义图标，回退到 emoji
function clearCatIcon() {
  catForm.value.icon_type = "emoji";
  catForm.value.icon_url = "";
}

/** 从详情弹窗删除该分类（弹框选择账目处理方式） */
const catDelOpen = ref(false);
const catDelSaving = ref(false);
const catDelMode = ref("keep"); // 'keep' 保留账目 | 'merge' 转移 | 'purge' 连同账目删除
const catDelTargetId = ref("");
const catDelCat = ref(null);

const catDelName = computed(() => {
  const c = catDelCat.value || detailCat.value;
  return (c && c.name) || "该分类";
});
const catDelUsage = computed(() => {
  const c = catDelCat.value || detailCat.value;
  return (c && c.usage_count) || 0;
});
// 合并目标：同收支类型、非自身、未隐藏
const catDelTargets = computed(() => {
  const c = catDelCat.value;
  if (!c) return [];
  return (state.categories || []).filter(
    (x) => x._id !== c._id && !x.is_hidden && x.type === c.type
  );
});

function openCatDelete() {
  const c = detailCat.value;
  if (!c) return;
  if (c.is_system) {
    uni.showToast({ title: "预置分类不可删除", icon: "none" });
    return;
  }
  catDelCat.value = c;
  catDelMode.value = "keep";
  catDelTargetId.value = "";
  catDelOpen.value = true;
}

async function confirmCatDelete() {
  const c = catDelCat.value;
  if (!c || catDelSaving.value) return;
  const hasTx = catDelUsage.value > 0;
  const mode = hasTx ? catDelMode.value : "merge";
  if (hasTx && mode === "merge" && !catDelTargetId.value) {
    uni.showToast({ title: "请选择目标分类", icon: "none" });
    return;
  }
  catDelSaving.value = true;
  try {
    await deleteCategory(c._id, mode === "merge" ? catDelTargetId.value : null, { mode });
    catDelOpen.value = false;
    showDetail.value = false;
    uni.showToast({ title: "已删除", icon: "success" });
    await loadCategories();
    await loadStickers();
    await refreshCatIconUrls();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
  } finally {
    catDelSaving.value = false;
  }
}

function decQty() {
  if (consumeQty.value > 1) consumeQty.value--;
}
function incQty() {
  const max = activeSticker.value.stock_qty || 1;
  if (consumeQty.value < max) consumeQty.value++;
}

async function confirmConsume() {
  if (consuming.value) return;
  consuming.value = true;
  try {
    const r = await consumeStickerAction(activeSticker.value._id, consumeQty.value);
    uni.showToast({ title: "已记一笔支出", icon: "success" });
    showConsume.value = false;
    if (r && r.new_stock_qty <= 0) {
      setTimeout(
        () => uni.showToast({ title: "库存已清空，记得补货", icon: "none" }),
        600
      );
    }
  } catch (err) {
    const msg = err && err.message ? err.message : "消耗失败";
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    consuming.value = false;
  }
}

function onLongPress(s) {
  // 分类由账本分类维护，不能当贴纸编辑/删除
  if (s.kind === "category") {
    uni.showActionSheet({
      itemList: ["新建该分类贴纸"],
      success: (res) => {
        if (res.tapIndex === 0) {
          uni.navigateTo({
            url: `/pages/sticker-lib/sticker-edit?type=material&categoryId=${s._id}`,
          });
        }
      },
    });
    return;
  }
  uni.showActionSheet({
    itemList: ["编辑", "删除"],
    success: (res) => {
      if (res.tapIndex === 0) goEdit(s);
      else if (res.tapIndex === 1) confirmDelete(s);
    },
  });
}

function confirmDelete(s) {
  uni.showModal({
    title: "删除贴纸",
    content: `确定删除「${s.name}」吗？${
      s.type === "stock" && s.stock_qty > 0 ? "（不会删除已记的消耗记录）" : ""
    }`,
    confirmText: "删除",
    confirmColor: "#ff6b6b",
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await deleteStickerAction(s._id);
        state.stickers = state.stickers.filter((x) => x._id !== s._id);
        uni.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        uni.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
      }
    },
  });
}

function goCreate() {
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?type=${tab.value}` });
}
function goEdit(s) {
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?id=${s._id}` });
}
function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.switchTab({ url: "/pages/ledger/ledger" });
}

onLoad((options) => {
  if (!requireLogin('/pages/sticker-lib/sticker-lib')) return
  // 从账本页三卡片跳转：?type=stock|material|custom 预选对应 Tab
  if (options && options.type && TABS.some((t) => t.key === options.type)) {
    tab.value = options.type;
  }
});

function switchTab(key) {
  tab.value = key;
  // 切出/切入分类 tab 时，支出/收入子 tab 重置为支出
  if (key !== "material") catSubTab.value = "expense";
}

onShow(async () => {
  if (state.uid) {
    await loadStickers();
    await loadCategories();
    await refreshCatIconUrls();
  }
});
</script>

<style scoped lang="scss">
.sticker-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eafaf0 0%, #f2fcf2 32%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 顶部吸顶栏高度，用于滚动区抵消，避免内容被遮挡 */
  --topbar-h: 230rpx;

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 88rpx 32rpx 8rpx;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
  }
  .back-btn,
  .add-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink3);
    font-size: 40rpx;
    font-weight: 700;
  }
  .topbar-title {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
  }

  .tabs {
    display: flex;
    gap: 16rpx;
    padding: 8rpx 32rpx 12rpx;
    padding-top: var(--topbar-h);
  }

  .sub-tabs {
    display: flex;
    gap: 16rpx;
    padding: 0 32rpx 12rpx;
    margin-top: 12rpx;
  }
  .sub-tab {
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 12rpx 28rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.6);
    color: var(--ink3);
    font-size: 26rpx;
    font-weight: 600;
    cursor: pointer;
    &.active {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      box-shadow: 0 6rpx 20rpx rgba(37, 204, 93, 0.22);
    }
    .sub-count {
      font-size: 18rpx;
      padding: 2rpx 10rpx;
      border-radius: 20rpx;
      background: rgba(0, 0, 0, 0.06);
    }
    &.active .sub-count {
      background: rgba(255, 255, 255, 0.25);
    }
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 18rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.6);
    color: var(--ink3);
    font-weight: 600;
    cursor: pointer;
    &.active {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      box-shadow: 0 6rpx 24rpx rgba(37, 204, 93, 0.25);
    }
    .tab-icon {
      font-size: 28rpx;
    }
    .tab-label {
      font-size: 26rpx;
    }
    .tab-count {
      font-size: 20rpx;
      padding: 2rpx 12rpx;
      border-radius: 20rpx;
      background: rgba(0, 0, 0, 0.06);
    }
    &.active .tab-count {
      background: rgba(255, 255, 255, 0.25);
    }
  }

  .page-scroll {
    flex: 1;
    min-height: 0;
  }

  .stat-card {
    margin: 8rpx 32rpx 16rpx;
    padding: 24rpx;
    border-radius: 28rpx;
    display: flex;
  }
  .stat-block {
    flex: 1;
    text-align: center;
  }
  .stat-val {
    font-size: 36rpx;
    font-weight: 800;
    display: block;
  }
  .stat-lbl {
    font-size: 20rpx;
    color: var(--ink4);
    margin-top: 4rpx;
    display: block;
  }

  .sticker-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    padding: 0 32rpx;
  }
  .sticker-card {
    position: relative;
    width: calc(33.33% - 14rpx);
    border-radius: 24rpx;
    padding: 16rpx 12rpx 18rpx;
    text-align: center;
    cursor: pointer;
    overflow: hidden;
    animation: bounce-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
    /* 底图改用内部 <image class="sticker-card-bg"> 绝对定位层渲染，
       彻底绕开 CSS background 与全局 .glass-mid 的层叠问题 */
    .sticker-card-bg {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    &.disabled {
      opacity: 0.5;
    }
    .sticker-img,
    .sticker-name,
    .sticker-sub,
    .badge,
    .consume-btn {
      position: relative;
      z-index: 1;
    }
    .sticker-img {
      width: 96rpx;
      height: 96rpx;
      border-radius: 18rpx;
      background: rgba(0, 0, 0, 0.04);
      margin: 0 auto;
    }
    .sticker-img-ph {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 44rpx;
      background: rgba(37, 204, 93, 0.08);
    }
    .badge {
      position: absolute;
      top: 10rpx;
      right: 10rpx;
      font-size: 16rpx;
      padding: 2rpx 10rpx;
      border-radius: 16rpx;
      font-weight: 700;
      &.low {
        background: rgba(245, 158, 11, 0.16);
        color: #d97706;
      }
      &.out {
        background: rgba(255, 107, 107, 0.16);
        color: var(--red);
      }
      &.combo {
        background: rgba(124, 92, 255, 0.16);
        color: #7c5cff;
      }
    }
    .sticker-name {
      font-size: 24rpx;
      font-weight: 700;
      color: var(--ink);
      display: block;
      margin-top: 10rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sticker-sub {
      font-size: 18rpx;
      color: var(--ink4);
      display: block;
      margin-top: 4rpx;
    }
    .consume-btn {
      margin-top: 12rpx;
      padding: 10rpx 0;
      border-radius: 18rpx;
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      font-size: 20rpx;
      font-weight: 700;
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 80rpx 0 40rpx;
    .empty-icon {
      width: 200rpx;
      height: 200rpx;
      opacity: 0.7;
    }
    .empty-text {
      font-size: 24rpx;
      color: var(--ink4);
    }
    .empty-btn {
      margin-top: 8rpx;
      padding: 16rpx 40rpx;
      border-radius: 32rpx;
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
      font-size: 26rpx;
      font-weight: 700;
    }
  }

  /* ---------- 贴纸详情弹窗 ---------- */
  .detail-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 28, 20, 0.5);
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: detail-fade 0.22s ease-out;
  }
  .detail-panel {
    position: relative;
    width: 78%;
    max-width: 620rpx;
    background: #fff;
    border-radius: 36rpx;
    padding: 40rpx 32rpx 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.22);
    /* 从小放大 */
    animation: detail-pop 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  .detail-close {
    position: absolute;
    top: 16rpx;
    right: 20rpx;
    width: 48rpx;
    height: 48rpx;
    line-height: 44rpx;
    text-align: center;
    font-size: 40rpx;
    color: var(--ink4);
  }
  .detail-hero {
    position: relative;
    width: 240rpx;
    height: 240rpx;
    border-radius: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 20rpx;
    .detail-hero-bg {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
  }
  .detail-img {
    position: relative;
    z-index: 1;
    width: 68%;
    height: 68%;
    border-radius: 20rpx;
  }
  .detail-img-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72rpx;
    background: rgba(37, 204, 93, 0.08);
  }
  .detail-name {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--ink);
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .detail-tag {
    margin-top: 10rpx;
    padding: 4rpx 18rpx;
    border-radius: 20rpx;
    font-size: 20rpx;
    color: #25cc5d;
    background: rgba(37, 204, 93, 0.12);
  }
  .detail-desc {
    margin-top: 20rpx;
    width: 100%;
    background: rgba(37, 204, 93, 0.06);
    border-radius: 20rpx;
    padding: 16rpx 20rpx;
    .detail-desc-label {
      display: block;
      font-size: 18rpx;
      color: var(--ink4);
      margin-bottom: 6rpx;
    }
    .detail-desc-text {
      display: block;
      font-size: 24rpx;
      color: var(--ink2);
      line-height: 1.5;
      word-break: break-all;
    }
  }
  .detail-rows {
    margin-top: 20rpx;
    width: 100%;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
    &:last-child {
      border-bottom: none;
    }
    .dr-label {
      font-size: 24rpx;
      color: var(--ink4);
    }
    .dr-value {
      font-size: 24rpx;
      font-weight: 700;
      color: var(--ink2);
    }
  }
  .detail-actions {
    margin-top: 28rpx;
    width: 100%;
    display: flex;
    gap: 16rpx;
  }
  .detail-btn {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.05);
    color: var(--ink2);
    &.primary {
      background: linear-gradient(135deg, #4fd974, #25cc5d);
      color: #fff;
    }
    &.ghost {
      background: rgba(37, 204, 93, 0.12);
      color: #25cc5d;
    }
    &.danger {
      background: linear-gradient(135deg, #ff8a8a, #ff6b6b);
      color: #fff;
    }
  }

  .sheet-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 28, 20, 0.45);
    z-index: 50;
    display: flex;
    align-items: flex-end;
    /* 覆盖在详情弹窗（z-index: 60）之上 */
    &.top {
      z-index: 80;
    }
  }
  .sheet {
    width: 100%;
    max-height: 84vh;
    overflow-y: auto;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx 48rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  .sheet-handle {
    display: flex;
    justify-content: center;
    padding: 8rpx 0 12rpx;
  }
  .handle-bar {
    width: 80rpx;
    height: 8rpx;
    border-radius: 8rpx;
    background: rgba(0, 0, 0, 0.12);
  }
  .sheet-title {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--ink);
    text-align: center;
    margin-bottom: 20rpx;
  }

  .consume-preview {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 16rpx;
    border-radius: 20rpx;
    background: rgba(37, 204, 93, 0.06);
  }
  .cp-img {
    width: 96rpx;
    height: 96rpx;
    border-radius: 16rpx;
  }
  .cp-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  .cp-name {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
  }
  .cp-stock {
    font-size: 22rpx;
    color: var(--ink3);
  }
  .cp-price {
    font-size: 22rpx;
    color: var(--ink3);
  }
  .cp-cat {
    font-size: 22rpx;
    color: var(--ink3);
    margin-top: 4rpx;
  }

  .consume-desc {
    margin-top: 20rpx;
    padding: 16rpx 20rpx;
    border-radius: 20rpx;
    background: rgba(37, 204, 93, 0.06);
    .cd-label {
      display: block;
      font-size: 18rpx;
      color: var(--ink4);
      margin-bottom: 6rpx;
    }
    .cd-text {
      display: block;
      font-size: 24rpx;
      color: var(--ink2);
      line-height: 1.5;
      word-break: break-all;
    }
  }

  .consume-tip {
    margin-top: 16rpx;
    padding: 14rpx 20rpx;
    border-radius: 18rpx;
    font-size: 22rpx;
    color: #b45309;
    background: rgba(245, 158, 11, 0.12);
  }

  .qty-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 28rpx;
  }
  .qty-label {
    font-size: 26rpx;
    color: var(--ink2);
    font-weight: 600;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }
  .step-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(37, 204, 93, 0.12);
    color: var(--g5);
    font-size: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .qty-val {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--ink);
    min-width: 48rpx;
    text-align: center;
  }

  .amount-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 28rpx 0 8rpx;
    font-size: 26rpx;
    color: var(--ink3);
  }
  .amount-val {
    font-size: 34rpx;
    font-weight: 800;
    color: var(--red);
  }

  .sheet-btn {
    margin-top: 20rpx;
    padding: 28rpx;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #4fd974, #25cc5d);
    color: #fff;
    text-align: center;
    font-size: 30rpx;
    font-weight: 800;
    box-shadow: 0 8rpx 40rpx rgba(37, 204, 93, 0.3);
    &.loading {
      opacity: 0.7;
    }
  }

  /* 编辑分类弹框表单 */
  .form-label {
    display: block;
    font-size: 24rpx;
    color: var(--ink3);
    font-weight: 600;
    margin-top: 32rpx;
    margin-bottom: 16rpx;
  }
  /* 名称输入：用我自己可控的 view(.name-field) 做外框，
     display:flex + align-items:stretch 让 uni-app <input> 组件根节点拉伸到 120rpx，
     再用 :deep(input) 让内部原生 input 填满并垂直居中。
     （直接给 <input> 设高度在 uni-app 下被组件根节点拦截、不生效，故改为外层 view + 穿透） */
  .name-field {
    display: flex;
    align-items: stretch;
    width: 100%;
    height: 120rpx;
    box-sizing: border-box;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid rgba(37, 204, 93, 0.3);
  }
  .name-field :deep(input) {
    flex: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: transparent;
    line-height: 120rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: var(--ink);
  }
  /* 简介输入：同样用外层 view(.desc-field) 做边框/背景，
     :deep(textarea) 穿透到内部原生 textarea 设置高度与内边距；
     auto-height 时内层随内容增高，外层 view 跟随撑开。 */
  .desc-field {
    width: 100%;
    min-height: 160rpx;
    box-sizing: border-box;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid rgba(37, 204, 93, 0.3);
  }
  .desc-field :deep(textarea) {
    display: block;
    width: 100%;
    min-height: 160rpx;
    box-sizing: border-box;
    background: transparent;
    padding: 24rpx;
    line-height: 1.6;
    font-size: 28rpx;
    color: var(--ink);
  }
  .sheet-ph {
    font-size: 28rpx;
    color: var(--ink3);
  }
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 10rpx;
  }
  .emoji-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid #e3f5e6;
    cursor: pointer;
    &.active {
      border-color: #25cc5d;
      background: rgba(37, 204, 93, 0.1);
    }
  }
  .icon-upload {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin-top: 20rpx;
  }
  .upload-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 140rpx;
    height: 140rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx dashed #25cc5d;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .upload-prev {
    width: 100%;
    height: 100%;
    border-radius: 20rpx;
  }
  .upload-plus {
    font-size: 48rpx;
    color: #25cc5d;
    line-height: 1;
  }
  .upload-txt {
    margin-top: 6rpx;
    font-size: 20rpx;
    color: var(--ink3);
  }
  .upload-clear {
    position: absolute;
    top: 6rpx;
    right: 6rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 28rpx;
    line-height: 36rpx;
    text-align: center;
    z-index: 2;
  }

  /* 删除分类弹框 */
  .del-tip {
    padding: 16rpx 20rpx;
    border-radius: 18rpx;
    background: rgba(255, 107, 107, 0.08);
    font-size: 24rpx;
    color: var(--ink2);
    line-height: 1.5;
  }
  .mode-list {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }
  .mode-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 20rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid #e3f5e6;
    cursor: pointer;
    &.active {
      border-color: #25cc5d;
      background: rgba(37, 204, 93, 0.08);
    }
    .mode-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4rpx;
    }
    .mode-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--ink);
    }
    .mode-desc {
      font-size: 20rpx;
      color: var(--ink4);
    }
    .mode-check {
      color: #25cc5d;
      font-weight: 800;
      font-size: 30rpx;
    }
  }
  .merge-list {
    max-height: 40vh;
    overflow-y: auto;
  }
  .merge-item {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 18rpx 20rpx;
    border-radius: 18rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid #e3f5e6;
    margin-bottom: 10rpx;
    cursor: pointer;
    &.active {
      border-color: #25cc5d;
      background: rgba(37, 204, 93, 0.08);
    }
    .merge-icon {
      font-size: 32rpx;
    }
    .merge-name {
      flex: 1;
      font-size: 26rpx;
      font-weight: 600;
      color: var(--ink);
    }
    .merge-check {
      color: #25cc5d;
      font-weight: 800;
    }
  }
  .merge-empty {
    text-align: center;
    color: var(--ink4);
    font-size: 22rpx;
    padding: 24rpx 0;
  }
  .sheet-btn.danger {
    background: linear-gradient(135deg, #ff8a8a, #ff6b6b);
    box-shadow: 0 8rpx 40rpx rgba(255, 107, 107, 0.3);
  }
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.08);
  }
  70% {
    transform: scale(0.94);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 详情弹窗：遮罩淡入 */
@keyframes detail-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 详情弹窗：面板从小放大 */
@keyframes detail-pop {
  0% {
    transform: scale(0.55);
    opacity: 0;
  }
  60% {
    transform: scale(1.04);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
