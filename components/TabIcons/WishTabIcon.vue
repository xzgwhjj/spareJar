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
      <linearGradient id="bg-wish-star" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c4b5fd" /><stop offset="50%" stop-color="#7c6cf8" /><stop offset="100%" stop-color="#5b4fcf" /></linearGradient>
      <linearGradient id="bg-wish-star-shine" x1="0%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.7)" /><stop offset="100%" stop-color="rgba(255,255,255,0)" /></linearGradient>
      <linearGradient id="bg-wish-sky" x1="0%" y1="0%" x2="20%" y2="100%"><stop offset="0%" stop-color="rgba(196,181,253,0.45)" /><stop offset="100%" stop-color="rgba(30,20,80,0.22)" /></linearGradient>
      <linearGradient id="bg-comet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(196,181,253,0)" /><stop offset="45%" stop-color="rgba(196,181,253,0.75)" /><stop offset="100%" stop-color="rgba(124,108,248,0)" /></linearGradient>
    </defs>
    <template v-if="active">
      <rect class="screen-wish-star" x="5" y="8" width="16" height="12.5" rx="2" stroke="rgba(124,108,248,0.55)" stroke-width="1.2" fill="url(#bg-wish-sky)" />
      <line class="comet-tail" x1="5.5" y1="15.5" x2="16" y2="5.5" stroke="url(#bg-comet)" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="9 9" />
      <g class="main-star">
        <polygon points="13,3.2 14.1,6.5 17.6,6.5 14.8,8.6 15.9,12 13,9.9 10.1,12 11.2,8.6 8.4,6.5 11.9,6.5" fill="url(#bg-wish-star)" opacity="0.97" />
        <polygon points="13,3.2 14.1,6.5 13,7.2 11.9,6.5" fill="url(#bg-wish-star-shine)" opacity="0.6" />
      </g>
      <g class="twinkle-a"><polygon points="6,7.5 6.4,8.6 7.6,8.6 6.7,9.3 7,10.4 6,9.7 5,10.4 5.3,9.3 4.4,8.6 5.6,8.6" fill="rgba(196,181,253,0.85)" /></g>
      <g class="twinkle-b"><polygon points="21,9.8 21.35,10.75 22.4,10.75 21.55,11.4 21.85,12.35 21,11.7 20.15,12.35 20.45,11.4 19.6,10.75 20.65,10.75" fill="rgba(167,139,250,0.8)" /></g>
      <g class="twinkle-c"><polygon points="19.5,17.8 19.8,18.6 20.7,18.6 20,19.1 20.3,19.9 19.5,19.4 18.7,19.9 19,19.1 18.3,18.6 19.2,18.6" fill="rgba(196,181,253,0.7)" /></g>
      <g class="star-pop-a"><polygon points="8,16.5 8.25,17.2 9,17.2 8.4,17.7 8.65,18.4 8,18 7.35,18.4 7.6,17.7 7,17.2 7.75,17.2" fill="rgba(167,139,250,0.8)" /></g>
      <g class="star-pop-b"><polygon points="20.5,6.5 20.72,7.15 21.4,7.15 20.87,7.55 21.09,8.2 20.5,7.8 19.91,8.2 20.13,7.55 19.6,7.15 20.28,7.15" fill="rgba(196,181,253,0.85)" /></g>
    </template>
    <template v-else>
      <rect x="5" y="8" width="16" height="12.5" rx="2" stroke="rgba(176,200,188,0.55)" stroke-width="1.2" fill="rgba(196,181,253,0.1)" />
      <g class="idle-star"><polygon points="9,11 9.3,11.9 10.3,11.9 9.5,12.5 9.8,13.4 9,12.8 8.2,13.4 8.5,12.5 7.7,11.9 8.7,11.9" fill="rgba(167,139,250,0.35)" /></g>
      <g class="idle-star"><polygon points="13,10 13.35,11.05 14.45,11.05 13.6,11.7 13.9,12.75 13,12.1 12.1,12.75 12.4,11.7 11.55,11.05 12.65,11.05" fill="rgba(196,181,253,0.4)" /></g>
      <g class="idle-star"><polygon points="17,12 17.28,12.82 18.15,12.82 17.45,13.3 17.72,14.12 17,13.64 16.28,14.12 16.55,13.3 15.85,12.82 16.72,12.82" fill="rgba(167,139,250,0.3)" /></g>
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ active: { type: Boolean, default: false } });
const cls = computed(() => props.active ? 'wish-icon-active' : 'wish-icon-idle');
</script>
