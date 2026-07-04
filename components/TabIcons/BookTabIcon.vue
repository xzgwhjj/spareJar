<template>
  <svg
    :class="cls"
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="bg-book-body" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4fd974" /><stop offset="100%" stop-color="#25cc5d" /></linearGradient>
      <linearGradient id="bg-book-screen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(194,242,200,0.7)" /><stop offset="100%" stop-color="rgba(137,229,156,0.35)" /></linearGradient>
    </defs>
    <template v-if="active">
      <rect class="screen-book" x="5" y="6" width="16" height="14" rx="2" stroke="url(#bg-book-body)" stroke-width="1.4" fill="url(#bg-book-screen)" />
      <rect x="7" y="8" width="12" height="1" rx="0.5" fill="rgba(79,217,116,0.28)" />
      <g class="book-body">
        <rect x="12.2" y="2" width="1.6" height="12" rx="0.6" fill="url(#bg-book-body)" opacity="0.9" />
        <rect x="6" y="3.5" width="6" height="9" rx="1" fill="rgba(225,250,227,0.95)" stroke="rgba(79,217,116,0.5)" stroke-width="0.7" />
        <rect class="page-line" x="7" y="5.5" width="4" height="0.8" rx="0.4" fill="rgba(79,217,116,0.55)" />
        <rect class="page-line" x="7" y="7.2" width="3.2" height="0.8" rx="0.4" fill="rgba(79,217,116,0.55)" />
        <rect class="page-line" x="7" y="8.9" width="3.6" height="0.8" rx="0.4" fill="rgba(79,217,116,0.55)" />
        <rect class="page-right" x="14" y="3.5" width="6" height="9" rx="1" fill="rgba(242,252,242,0.9)" stroke="rgba(79,217,116,0.35)" stroke-width="0.7" />
      </g>
      <ellipse cx="13" cy="14.5" rx="4.5" ry="0.8" fill="rgba(79,217,116,0.22)" />
    </template>
    <template v-else>
      <rect x="5" y="6" width="16" height="14" rx="2" stroke="rgba(176,200,188,0.7)" stroke-width="1.3" fill="rgba(240,250,241,0.4)" />
      <rect x="7" y="9" width="5" height="7" rx="0.8" stroke="rgba(176,200,188,0.6)" stroke-width="1" fill="none" />
      <rect x="14" y="9" width="5" height="7" rx="0.8" stroke="rgba(176,200,188,0.6)" stroke-width="1" fill="none" />
      <rect x="11.8" y="9" width="2.4" height="7" rx="0.5" fill="rgba(176,200,188,0.3)" />
      <circle class="ink-dot" cx="9.5" cy="17.5" r="0.7" fill="rgba(176,200,188,0.6)" />
      <circle class="ink-dot" cx="13" cy="17.5" r="0.7" fill="rgba(176,200,188,0.6)" />
      <circle class="ink-dot" cx="16.5" cy="17.5" r="0.7" fill="rgba(176,200,188,0.6)" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ active: { type: Boolean, default: false } });
const cls = computed(() => props.active ? 'book-icon-active' : 'book-icon-idle');
</script>
