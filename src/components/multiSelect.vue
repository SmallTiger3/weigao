<template>
<div class="relative w-80">
    <!-- Input Box -->
    <div class="input input-bordered flex items-center flex-wrap gap-2 py-2 min-h-12 cursor-text"
        @click="toggleDropdown">
        <!-- Selected tags -->
        <div v-for="item in selectedItems" :key="item.value" class="badge badge-primary gap-1">
            {{ item.label }}
            <button class="ml-1" @click.stop="remove(item.value)">✕</button>
        </div>

        <!-- Fake input to show placeholder -->
        <span v-if="!modelValue.length" class="text-gray-400">
            {{ placeholder }}
        </span>

        <span class="grow"></span>
        <!-- Arrow -->
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
    </div>

    <!-- Dropdown -->
    <ul v-if="open" class="absolute mt-1 w-full menu bg-base-100 shadow rounded-box max-h-48 overflow-y-auto z-10">
        <li v-for="opt in options" :key="opt.value">
            <label class="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input type="checkbox" class="checkbox checkbox-sm" :value="opt.value" :checked="isChecked(opt.value)"
                    @change="toggle(opt.value)" />
                <span>{{ opt.label }}</span>
            </label>
        </li>
    </ul>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "请选择" },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);

const selectedItems = computed(() =>
    props.options.filter((item) => props.modelValue.includes(item.value))
);

function toggleDropdown() {
    open.value = !open.value;
}

function closeDropdown(e) {
    if (!e.target.closest(".relative")) {
        open.value = false;
    }
}

onMounted(() => {
    window.addEventListener("click", closeDropdown);
});
onBeforeUnmount(() => {
    window.removeEventListener("click", closeDropdown);
});

// Multi-select toggle logic
function toggle(value) {
    const arr = [...props.modelValue];
    const exist = arr.indexOf(value);

    if (exist > -1) arr.splice(exist, 1);
    else arr.push(value);

    emit("update:modelValue", arr);
}

function remove(value) {
    emit(
        "update:modelValue",
        props.modelValue.filter((v) => v !== value)
    );
}

function isChecked(value) {
    return props.modelValue.includes(value);
}
</script>

<style scoped>
/* Prevent input area from shrinking */
.input {
    min-height: 3rem;
}
</style>
