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
      <linearGradient id="bg-crystal-body" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a8f0c0" /><stop offset="50%" stop-color="#4fd974" /><stop offset="100%" stop-color="#1ab854" /></linearGradient>
      <linearGradient id="bg-crystal-shine" x1="0%" y1="0%" x2="60%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.72)" /><stop offset="100%" stop-color="rgba(255,255,255,0)" /></linearGradient>
      <linearGradient id="bg-crystal-screen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(194,242,200,0.6)" /><stop offset="100%" stop-color="rgba(137,229,156,0.22)" /></linearGradient>
      <linearGradient id="bg-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#25cc5d" stop-opacity="0" /><stop offset="50%" stop-color="#4fd974" stop-opacity="1" /><stop offset="100%" stop-color="#89e59c" stop-opacity="0" /></linearGradient>
    </defs>
    <template v-if="active">
      <rect x="5" y="8" width="16" height="12.5" rx="2" stroke="rgba(79,217,116,0.6)" stroke-width="1.2" fill="url(#bg-crystal-screen)" />
      <g class="crystal-body">
        <polygon points="13,3.5 17.2,5.8 17.2,10.4 13,12.7 8.8,10.4 8.8,5.8" fill="url(#bg-crystal-body)" opacity="0.96" />
        <polyline points="8.8,5.8 13,8.1 17.2,5.8" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" fill="none" />
        <line x1="13" y1="3.5" x2="13" y2="12.7" stroke="rgba(255,255,255,0.22)" stroke-width="0.6" />
        <polygon points="13,3.5 17.2,5.8 13,8.1" fill="url(#bg-crystal-shine)" opacity="0.55" />
      </g>
      <circle class="arc-a" cx="13" cy="8.1" r="6.2" stroke="url(#bg-arc-grad)" stroke-width="1.1" fill="none" stroke-dasharray="9 30" />
      <circle class="arc-b" cx="13" cy="8.1" r="8" stroke="rgba(79,217,116,0.45)" stroke-width="0.8" fill="none" stroke-dasharray="7 44" />
      <rect class="shard-a" x="7.5" y="5.5" width="1.8" height="1.8" rx="0.4" fill="rgba(79,217,116,0.85)" />
      <rect class="shard-b" x="16.8" y="4.5" width="1.5" height="1.5" rx="0.3" fill="rgba(137,229,156,0.9)" />
      <rect class="shard-c" x="6.5" y="13.5" width="1.4" height="1.4" rx="0.3" fill="rgba(37,204,93,0.75)" />
      <rect class="shard-d" x="17.5" y="13" width="1.6" height="1.6" rx="0.35" fill="rgba(79,217,116,0.8)" />
    </template>
    <template v-else>
      <rect x="5" y="8" width="16" height="12.5" rx="2" stroke="rgba(176,200,188,0.55)" stroke-width="1.2" fill="rgba(240,250,241,0.3)" />
      <g class="crystal-idle"><polygon points="13,10 15.4,11.2 15.4,13.8 13,15 10.6,13.8 10.6,11.2" stroke="rgba(79,217,116,0.45)" stroke-width="0.9" fill="rgba(194,242,200,0.18)" /></g>
      <g class="crystal-idle"><rect x="8" y="9.5" width="1.8" height="1.8" rx="0.3" transform="rotate(15 9 10.4)" fill="rgba(137,229,156,0.3)" /></g>
      <g class="crystal-idle"><rect x="16.5" y="9" width="1.6" height="1.6" rx="0.3" transform="rotate(-10 17.3 9.8)" fill="rgba(79,217,116,0.25)" /></g>
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ active: { type: Boolean, default: false } });
const cls = computed(() => props.active ? 'chall-icon-active' : 'chall-icon-idle');
</script>
