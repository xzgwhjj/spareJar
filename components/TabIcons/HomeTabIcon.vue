<template>
  <svg
    :class="cls"
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style="overflow:visible;display:block"
  >
    <defs>
      <linearGradient id="hg-green" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4fd974" /><stop offset="100%" stop-color="#25cc5d" />
      </linearGradient>
      <linearGradient id="hg-jar-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="active?'#d6fae1':'#e8f5ec'" /><stop offset="100%" :stop-color="active?'#a8efc0':'#c8e8d0'" />
      </linearGradient>
      <linearGradient id="hg-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="active?'#e1fae8':'#f0f7f2'" /><stop offset="100%" :stop-color="active?'#c5f5d5':'#ddeee4'" />
      </linearGradient>
      <linearGradient id="hg-coin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe97a" /><stop offset="100%" stop-color="#f5c842" />
      </linearGradient>
      <clipPath id="hg-jar-clip"><rect x="6.5" y="7" width="13" height="12" rx="3.5" /></clipPath>
    </defs>
    <rect class="screen-frame" x="4" y="14.5" width="18" height="10" rx="2.5" fill="url(#hg-screen)" :stroke="active?'url(#hg-green)':'#a8c8b4'" :stroke-width="active?'1.2':'0.9'" />
    <template v-if="active">
      <g clip-path="url(#hg-screen-clip)" style="pointer-events:none">
        <defs><clipPath id="hg-screen-clip"><rect x="5" y="15.5" width="16" height="8" rx="1.5" /></clipPath></defs>
        <rect class="screen-scan" x="5" y="15.5" width="16" height="1.5" rx="0.75" fill="url(#hg-green)" opacity="0.45" />
        <g class="data-row"><rect x="6.5" y="17.5" width="5" height="0.8" rx="0.4" fill="#25cc5d" opacity="0.5" /><rect x="13" y="17.5" width="3" height="0.8" rx="0.4" fill="#25cc5d" opacity="0.35" /></g>
        <g class="data-row"><rect x="6.5" y="19.2" width="3.5" height="0.8" rx="0.4" fill="#4fd974" opacity="0.45" /><rect x="11.5" y="19.2" width="5" height="0.8" rx="0.4" fill="#4fd974" opacity="0.3" /></g>
        <g class="data-row"><rect x="6.5" y="20.9" width="6" height="0.8" rx="0.4" fill="#25cc5d" opacity="0.4" /><rect x="14" y="20.9" width="2.5" height="0.8" rx="0.4" fill="#25cc5d" opacity="0.3" /></g>
      </g>
    </template>
    <template v-else>
      <g>
        <circle class="pixel-dot" cx="8" cy="19.5" r="0.9" fill="#89e59c" />
        <circle class="pixel-dot" cx="13" cy="19.5" r="0.9" fill="#89e59c" />
        <circle class="pixel-dot" cx="18" cy="19.5" r="0.9" fill="#89e59c" />
      </g>
    </template>
    <rect x="10.5" y="23.2" width="5" height="0.9" rx="0.45" :fill="active?'#4fd974':'#b8d4c0'" :opacity="active?0.8:0.5" />
    <g class="jar-body">
      <rect x="6.5" y="7.5" width="13" height="11.5" rx="3.8" fill="url(#hg-jar-body)" :stroke="active?'url(#hg-green)':'#a0c8b0'" :stroke-width="active?'1.3':'1'" />
      <ellipse cx="10.5" cy="10.5" rx="2.2" ry="1.4" fill="white" :opacity="active?0.55:0.35" transform="rotate(-18,10.5,10.5)" />
      <rect x="7.2" y="9" width="1" height="8" rx="0.5" fill="#25cc5d" :opacity="active?0.12:0.07" />
      <ellipse cx="13" cy="8" rx="4.8" ry="1.5" :fill="active?'#7de8a0':'#b8ddc4'" :stroke="active?'#25cc5d':'#8cbca0'" stroke-width="0.9" />
      <ellipse cx="11.5" cy="7.5" rx="1.8" ry="0.5" fill="white" :opacity="active?0.5:0.3" />
      <rect class="slot-line" x="11" y="7.3" width="4" height="1.1" rx="0.55" :fill="active?'#25cc5d':'#6aaa82'" :opacity="active?1:0.6" style="transform-origin:13px 7.85px" />
      <line x1="7.8" y1="13.5" x2="18.2" y2="13.5" :stroke="active?'#4fd974':'#a8ccb4'" stroke-width="0.7" :opacity="active?0.4:0.25" stroke-dasharray="1.5 1.5" />
      <line x1="7.8" y1="16" x2="18.2" y2="16" :stroke="active?'#4fd974':'#a8ccb4'" stroke-width="0.5" :opacity="active?0.3:0.18" stroke-dasharray="1.2 2" />
      <rect x="9" y="18.5" width="2.5" height="0.9" rx="0.45" :fill="active?'#4fd974':'#8cbca0'" :opacity="active?0.7:0.45" />
      <rect x="14.5" y="18.5" width="2.5" height="0.9" rx="0.45" :fill="active?'#4fd974':'#8cbca0'" :opacity="active?0.7:0.45" />
    </g>
    <template v-if="active">
      <g class="coin-a" style="transform-origin:11px 16px">
        <ellipse cx="11" cy="16" rx="2.2" ry="1.2" fill="url(#hg-coin)" stroke="#e8b830" stroke-width="0.5" />
        <ellipse cx="11" cy="15.85" rx="1.2" ry="0.6" fill="none" stroke="#ffe97a" stroke-width="0.4" opacity="0.7" />
      </g>
      <g class="coin-b" style="transform-origin:15px 17px">
        <ellipse cx="15" cy="17" rx="2" ry="1.1" fill="url(#hg-coin)" stroke="#e8b830" stroke-width="0.5" />
        <ellipse cx="15" cy="16.88" rx="1.1" ry="0.55" fill="none" stroke="#ffe97a" stroke-width="0.4" opacity="0.7" />
      </g>
    </template>
    <template v-else>
      <ellipse cx="13" cy="19.5" rx="2.5" ry="1.3" fill="#ffe97a" stroke="#e8b830" stroke-width="0.6" opacity="0.55" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ active: { type: Boolean, default: false } });
const cls = computed(() => props.active ? 'home-icon-active' : 'home-icon-idle');
</script>
