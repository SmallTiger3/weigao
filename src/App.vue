<script lang="js" setup>
import { getDiameterRanges } from './utils'
import { useToast } from './components/useToast'
import Papa from 'papaparse'
import { ref } from 'vue'

defineOptions({ name: '' })
/**原始数据 */
let originData = null

let newData = null

const basicParams = {
  label: 7.5,//径阶
  min: 5,
  max: 9.9,
  spacing: 5,
}

const bdqParams = ref({
  B: null,
  D: null,
  Q: null
})

const place = ref('')

// 存储当前选中的文件名
const selectedFileName = ref('')



const handleData = () => {
  const { label, min, max, spacing } = basicParams;
  const diameterRanges = getDiameterRanges(min, max, label, spacing);
  newData = calculateDiameterRange(originData, diameterRanges, area);//result为径阶整化结果
}

const fileLoad = async (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'text/csv') {
    // 更新选中的文件名
    selectedFileName.value = file.name;
    const reader = new FileReader();

    reader.onload = function (e) {
      const arrayBuffer = e.target.result;
      const decoder = new TextDecoder('utf-8');
      const csvContent = decoder.decode(arrayBuffer);

      Papa.parse(csvContent, {
        complete: function (result) {
          useToast().success("文件解析成功!");
          originData = result.data;
          console.log("数据内容:", originData);
        },
        error: function (error) {
          useToast().error("文件解析失败!");
          console.error("解析错误:", error);
        }
      });
    };

    // 读取文件为 ArrayBuffer
    reader.readAsArrayBuffer(file);
  } else {
    useToast().warning("请选择一个有效的 CSV 文件!");
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
    <div class="toast toast-center toast-top z-50" id="toast-root"></div>

    <!-- 顶部导航栏 -->
    <div class="navbar bg-base-100 shadow-lg border-b border-base-300">
      <div class="navbar-start flex items-center gap-2">
        <div class="dropdown">
          <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
            </svg>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><a onclick="param_modal.showModal()">修改参数</a></li>
            <li><a>导出 CSV</a></li>
          </ul>
        </div>

        <div class="flex items-center gap-2">
          <label class="btn btn-ghost bg-neutral/10 hover:bg-neutral/20 border-none">
            <input type="file" id="fileInput" accept=".csv" @change="fileLoad" class="hidden" />
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span class="ml-2">上传 CSV</span>
          </label>

          <!-- 显示文件名 -->
          <div v-if="selectedFileName" class="flex items-center gap-1">
            <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-sm text-success font-medium">{{ selectedFileName }}</span>
          </div>
        </div>
      </div>

      <div class="navbar-center hidden lg:flex"></div>

      <div class="navbar-end">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
            <div class="w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
            </div>
          </div>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><a onclick="param_modal.showModal()">修改参数</a></li>
            <li><a>导出 CSV</a></li>
            <li><a>清除数据</a></li>
          </ul>
        </div>

        <!-- 主题切换按钮 -->
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          </div>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-36">
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start" aria-label="Default" value="default">
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start" aria-label="Retro" value="retro">
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start" aria-label="Dark" value="dark">
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start" aria-label="Fantasy" value="fantasy">
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start" aria-label="Luxury" value="luxury">
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="p-4 h-16 bg-base-100 flex items-center justify-start gap-4">
      <input type="number" class="input" placeholder="在此输入面积" />
      <input type="number" class="input" placeholder="在此输入坡度" />
      <label class="input">
        <input type="text" placeholder="在此输入降水数据" />
        <span class="label">map</span>
      </label>
      <label class="input">
        <input type="text" placeholder="在此输入温度数据" />
        <span class="label">mat</span>
      </label>
      <button class="btn btn-ghost">预测 5 年</button>
      <button class="btn btn-ghost">砍伐</button>
    </div>

  <div class="bg-base-100 px-4">
    <div class="card w-full bg-base-100 card-xs shadow-sm">
      <div class="card-body">
        <div class="flex items-center justify-start gap-4">
          <div class="text-sm font-bold">当前参数：</div>
          <div class="flex gap-2">
            <kbd class="kbd kbd-md">B: {{ bdqParams.B }}</kbd>
            <kbd class="kbd kbd-md">D: {{ bdqParams.D }}</kbd>
            <kbd class="kbd kbd-md">Q: {{ bdqParams.Q }}</kbd>
            <kbd class="kbd kbd-md">地区: {{ place }}</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
    <div class="bg-base-100 px-4 flex-1 my-4">
      <div class="card w-full bg-base-100 card-xs shadow-sm h-full">
        <div class="card-body">
        </div>
      </div>
    </div>
    <dialog id="param_modal" class="modal">
      <div class="modal-box w-11/12 max-w-5xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        <h3 class="text-lg font-bold">参数修改</h3>
        <div class="flex flex-row gap-4">
          <input type="number" class="input" placeholder="B" />
          <input type="number" class="input" placeholder="D" />
          <input type="number" class="input" placeholder="Q" />
        </div>
      </div>
    </dialog>
  </div>
</template>
