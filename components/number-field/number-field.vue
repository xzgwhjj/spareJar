<template>
  <view
    class="nf-wrap"
    @tap="open"
  >
    <text
      class="nf-field"
      :class="{ 'is-placeholder': !hasValue }"
      >{{ display }}</text
    >
  </view>
</template>

<script setup>
import { computed } from "vue";
import { useNumberKeyboard } from "@/stores/numberKeyboard.js";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  placeholder: { type: String, default: "" },
  title: { type: String, default: "" },
  decimalPlaces: { type: Number, default: 2 },
  maxInteger: { type: Number, default: 9 },
});

const emit = defineEmits(["update:modelValue"]);

const { state, open: openKeyboard } = useNumberKeyboard();

const hasValue = computed(() => {
  const v = props.modelValue;
  return v !== "" && v !== null && v !== undefined;
});

const display = computed(() => (hasValue.value ? String(props.modelValue) : props.placeholder));

function open() {
	console.log('open keyboard', state.show)
  openKeyboard({
    value: hasValue.value ? String(props.modelValue) : "",
    decimalPlaces: props.decimalPlaces,
    maxInteger: props.maxInteger,
    title: props.title,
    onInput: (val) => emit("update:modelValue", val),
    onDone: (val) => emit("update:modelValue", val),
  });
}
</script>

<style scoped>
.nf-wrap {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.nf-field {
  flex: 1;
}
.nf-field.is-placeholder {
  opacity: 0.5;
}
</style>
