<template>
  <view class="sticker-page" data-cmp="StickerLib">
    <!-- 顶部栏 -->
    <!-- <view class="add-btn" @click="goCreate"><text>＋</text></view> -->
    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <image
        :src="cdn('/app_static/images/icon_left.png')"
        class="back-icon"
        mode="aspectFit"
        @click="goBack"
      ></image>
      <text class="topbar-title">贴纸库</text>
      <view style="width: 72rpx" />
    </view>

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
          :style="{ animationDelay: i * 0.04 + 's', ...stickerBgStyle }"
          @click="onTap(s)"
          @longpress="onLongPress(s)"
        >
          <image
            v-if="s.image_url"
            class="sticker-img"
            :src="s.image_url"
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

          <template v-if="tab === 'stock'">
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

        <view class="detail-hero" :style="stickerBgStyle">
          <image
            v-if="detail.image_url"
            class="detail-img"
            :src="detail.image_url"
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
            <view class="detail-btn danger" @click="deleteCategoryFromDetail"
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
    <view v-if="catEditOpen" class="sheet-mask" @click="catEditOpen = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">编辑分类</text>

        <text class="form-label">名称</text>
        <input class="sheet-input" v-model="catForm.name" maxlength="32" placeholder="如：奶茶、打车" />

        <text class="form-label" style="margin-top: 28rpx">简介 / 备注（可选）</text>
        <textarea
          class="sheet-input desc-input"
          v-model="catForm.desc"
          maxlength="100"
          placeholder="补充这个分类的说明"
          auto-height
        />

        <text class="form-label" style="margin-top: 28rpx">图标</text>
        <view class="emoji-grid">
          <view
            v-for="em in EMOJIS"
            :key="em"
            class="emoji-cell"
            :class="{ active: catForm.icon === em }"
            @click="catForm.icon = em"
            ><text>{{ em }}</text></view
          >
        </view>

        <view class="sheet-btn" :class="{ loading: catSaving }" @click="saveCatEdit">
          <text>{{ catSaving ? "保存中…" : "保存" }}</text>
        </view>
      </view>
    </view>

    <!-- 消耗确认弹窗 -->
    <view v-if="showConsume" class="sheet-mask" @click="showConsume = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">消耗记账 · {{ activeSticker.name }}</text>
        <view class="consume-preview">
          <image class="cp-img" :src="activeSticker.image_url" mode="aspectFill" />
          <view class="cp-info">
            <text class="cp-name">{{ activeSticker.name }}</text>
            <text class="cp-stock"
              >库存 {{ activeSticker.stock_qty }} 件 · 已用
              {{ activeSticker.use_count || 0 }} 次</text
            >
            <text class="cp-price">单价 ¥{{ yuan(activeSticker.unit_price) }}</text>
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
import { ref, computed, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user.js";
import { formatFen } from "@/utils/money.js";
import { cdn, getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import { deleteCategory, updateCategory } from "@/api/sparejar.js";

const {
  state,
  categoryMap,
  loadStickers,
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
const stickerBgStyle = {
  "--sticker-bg-img": `url('${cdn("/app_static/images/icon_sticker_bg2.png")}')`,
};

/* 顶部安全区 */
function resolveTop() {
  try {
    const rect = uni.getMenuButtonBoundingClientRect();
    if (rect && rect.top > 0 && rect.height > 0) {
      return { padTop: `${rect.top + 4}px`, barH: `${rect.height}px` };
    }
  } catch (e) {}
  const { statusBarHeight = 20 } = uni.getSystemInfoSync();
  return { padTop: `${statusBarHeight + 48}px`, barH: "32px" };
}
const top = resolveTop();
const pagePaddingTop = ref(top.padTop);
onMounted(() => {
  const t = resolveTop();
  pagePaddingTop.value = t.padTop;
});
const tab = ref("stock");
// 分类贴纸（type=material）下的二级切换：按关联分类的支出/收入
const catSubTab = ref("expense"); // 'expense' | 'income'

// 分类 id → 支出/收入 类型映射
const catTypeMap = computed(() => {
  const m = {};
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

/** 详情里展示的简介：贴纸用自身 desc，分类用分类 desc */
const detailDesc = computed(() => {
  const s = detail.value;
  if (!s || !s._id) return "";
  if (s.kind === "category") {
    const c = (state.categories || []).find((x) => x._id === s._id);
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
    // 该分类下绑定的所有贴纸（不限类型）：囤货/素材/上传都可能绑到这个分类
    const catStickerCount = (state.stickers || []).filter(
      (x) => String(x.category_id) === String(s._id)
    ).length;
    rows.push({ label: "关联贴纸", value: `${catStickerCount} 张` });
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
  const url = detail.value && detail.value.image_url;
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
const catForm = ref({ _id: "", name: "", desc: "", icon: "📦" });
const EMOJIS = [
  "🍜", "🥡", "🧋", "🛒", "🏪", "🚌", "🚕", "⛽", "🅿️", "📞",
  "📦", "🏠", "🏦", "🚗", "💧", "💡", "🔥", "🏢", "🌐", "📱",
  "👕", "👟", "💇", "💄", "🛋️", "🍳", "✈️", "🏨", "🎬", "🎮",
  "🏋️", "🎨", "🐱", "📚", "🏥", "💊", "🩺", "🛡️", "🦷", "🎓",
  "📖", "💻", "📝", "👶", "🧧", "🍻", "🎁", "💰", "📈",
];
function editCategoryFromDetail() {
  const s = detail.value;
  if (!s || !s._id) return;
  const c = (state.categories || []).find((x) => x._id === s._id) || {};
  catForm.value = {
    _id: s._id,
    name: c.name || s.name || "",
    desc: c.desc || "",
    icon: c.icon || s.icon || "📦",
  };
  catEditOpen.value = true;
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
    await updateCategory(catForm.value._id, {
      name,
      desc: (catForm.value.desc || "").trim(),
      icon: catForm.value.icon,
    });
    catEditOpen.value = false;
    showDetail.value = false;
    uni.showToast({ title: "已保存", icon: "success" });
    await loadStickers();
  } catch (err) {
    uni.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
  } finally {
    catSaving.value = false;
  }
}

/** 从详情弹窗删除该分类 */
function deleteCategoryFromDetail() {
  const s = detail.value;
  if (!s || !s._id) return;
  uni.showModal({
    title: "删除分类",
    content: `确认删除分类「${s.name || "该分类"}」？此操作不可恢复。`,
    confirmText: "删除",
    confirmColor: "#ff6b6b",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteCategory(s._id);
        showDetail.value = false;
        uni.showToast({ title: "已删除", icon: "success" });
        await loadStickers();
      } catch (err) {
        const msg = (err && err.message) || "删除失败";
        // 分类下有用过的账目时，需到分类管理页选择合并目标
        if (/合并|merge|usage|账目/.test(msg)) {
          uni.showModal({
            title: "无法删除",
            content:
              "该分类下有用过的账目，请到「我的 → 分类管理」中删除并选择合并目标。",
            showCancel: false,
          });
        } else {
          uni.showToast({ title: msg, icon: "none" });
        }
      }
    },
  });
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
  if (state.uid) await loadStickers();
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
  .back-icon {
    width: 60rpx;
    height: 60rpx;
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
    /* 贴纸底图：由 JS 通过 --sticker-bg-img 注入 CDN 地址 */
    background-image: var(--sticker-bg-img, none);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    animation: bounce-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
    &.disabled {
      opacity: 0.5;
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
    width: 240rpx;
    height: 240rpx;
    border-radius: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: var(--sticker-bg-img, none);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    margin-bottom: 20rpx;
  }
  .detail-img {
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
  }
  .sheet {
    width: 100%;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx 48rpx;
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
    margin-bottom: 12rpx;
  }
  .sheet-input {
    width: 100%;
    box-sizing: border-box;
    padding: 20rpx 24rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border: 1rpx solid rgba(37, 204, 93, 0.3);
    font-size: 28rpx;
    color: var(--ink);
  }
  .sheet-input.desc-input {
    min-height: 120rpx;
    line-height: 1.5;
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
