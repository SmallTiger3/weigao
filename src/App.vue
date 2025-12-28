<script lang="js" setup>
import { getDiameterRanges, convertData, calculateDiameterRange, transMatrixYuCe, cutting, calculateCurveData, exportResultsToCSV } from './utils'
import { useToast } from './components/useToast'
import Papa from 'papaparse'
import { ref } from 'vue'
import { createCsvData } from './utils/mock'
import { paramsConfig } from './const'
import ChartCom from './components/chartCom.vue'
import MultiSelect from './components/multiSelect.vue'


defineOptions({ name: '' })
/**原始数据 */
let originData = null

let firstData = null

const constParams = {
  label: 7.5,
  min: 5,
  max: 9.9,
  spacing: 5,
}

const area = ref()
const slope = ref(0)
const precipitation = ref()
const temperature = ref()

const bdqParams = ref({
  B: null,
  D: null,
  Q: null
})
const bdqList = ref(JSON.parse(localStorage.getItem('bdqListStore') ?? '[]'))
const allTreeSpecies = ref([]);
const fillSelectedSpecies = ref('');
const cutSelectedSpecies = ref([]);

const place = ref(localStorage.getItem('selectedPlace') ?? 'chongqing');
const savePlace = () => {
  localStorage.setItem('selectedPlace', place.value);
};

/**存储当前选中的文件名 */
const selectedFileName = ref('')



const handleData = (data) => {
  originData = convertData(data);
  // originData = createCsvData(); // mock 数据
  allTreeSpecies.value = [...new Set(originData.map(item => item['树种']))];
  const { label, min, max, spacing } = constParams;
  const diameterRanges = getDiameterRanges(min, max, label, spacing);
  firstData = calculateDiameterRange(originData, diameterRanges, area.value);//result为径阶整化结果
  useToast().success("数据解析完成!");
  // console.log('firstData :>> ', firstData);
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
          if (result.data[0].includes('树种') && result.data[0].includes('胸径')) {
            handleData(result.data);
          } else {
            useToast().error("CSV 文件格式不正确，请确保包含 '树种' 和 '胸径' 列!");
            return;
          }
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

const inputChange = (e, field) => {
  const value = e.target.value;
  if (field === 'area') {
    area.value = value;
  } else if (field === 'slope') {
    slope.value = value;
  } else if (field === 'precipitation') {
    precipitation.value = value;
  } else if (field === 'temperature') {
    temperature.value = value;
  } else if (field === 'B') {
    addB.value = value;
  } else if (field === 'D') {
    addD.value = value;
  } else if (field === 'Q') {
    addQ.value = value;
  }
}
const addB = ref(null);
const addD = ref(null);
const addQ = ref(null);

const addBDQ = () => {
  if (addB.value && addD.value && addQ.value) {
    const findItem = bdqList.value.find(item => item.B === Number(addB.value) && item.D === Number(addD.value) && item.Q === Number(addQ.value));
    if (findItem) {
      useToast().warning("该 B、D、Q 组合已存在，无需重复添加！");
      return;
    }
    bdqList.value.push({
      B: addB.value,
      D: addD.value,
      Q: addQ.value,
      isUse: false
    });
    localStorage.setItem('bdqListStore', JSON.stringify(bdqList.value))
    addB.value = null;
    addD.value = null;
    addQ.value = null;
  } else {
    useToast().warning("请填写完整的 B、D 和 Q 值！");
  }
};
const removeBDQ = (index) => {
  // 如果删除的是正在使用的参数，清空 bdqParams
  if (bdqList.value[index].isUse) {
    bdqParams.value = {
      B: null,
      D: null,
      Q: null
    };
  }
  bdqList.value.splice(index, 1);
};
const useBDQ = (index) => {
  bdqList.value.forEach((item, idx) => {
    item.isUse = idx === index;
  });
  const selected = bdqList.value[index];
  bdqParams.value = {
    B: +selected.B,
    D: +selected.D,
    Q: +selected.Q
  };
};

let resultList = ref([]);

// 预测 5 年
const predictFiveYears = () => {
  if (!firstData) {
    useToast().warning("请先上传并解析数据！");
    return;
  }
  if (!(area.value && slope.value !== null && precipitation.value && temperature.value)) {
    useToast().warning("请先完整填写面积、坡度、降水量和温度！");
    return;
  }

  if (!place.value) {
    useToast().warning("请先选择地区并保存！");
    return;
  }

  if (!resultList.value.length) {
    useToast().warning("请先处理数据！");
    return;
  }
  const currentData = resultList.value[resultList.value.length - 1];
  const nowRes = transMatrixYuCe(currentData.data, area.value, slope.value, temperature.value, precipitation.value, constParams.spacing, 1);
  resultList.value.push({ type: 'predict', data: nowRes, year: currentData.year + 5 });
  useToast().success("5年预测完成！");
};

// 砍伐 1 次
const cutOnce = () => {
  if (!firstData) {
    useToast().warning("请先上传并解析数据！");
    return;
  }
  if (!(area.value && slope.value !== null && precipitation.value && temperature.value)) {
    useToast().warning("请先完整填写面积、坡度、降水量和温度！");
    return;
  }

  if (!place.value) {
    useToast().warning("请先选择地区并保存！");
    return;
  }

  if (!bdqParams.value.B) {
    useToast().warning("请先选择并使用 B、D、Q 参数！");
    return;
  }

  if (!resultList.value.length) {
    resultList.value.push({ type: 'init', data: firstData, year: 0 });
  }

  const currentData = resultList.value[resultList.value.length - 1];
  const { B, D, Q } = bdqParams.value;
  const n1 = (calculateCurveData(B, D, Q) * area.value) / 10000;
  const nowRes = cutting(currentData.data, n1, D, Q, cutSelectedSpecies.value, [fillSelectedSpecies.value]);
  resultList.value.push({ type: 'cut', data: nowRes, year: currentData.year });
}

// 第一次处理数据
const loadFirstData = () => {
  if (!firstData) {
    useToast().warning("请先上传并解析数据！");
    return;
  }
  if (!area.value) {
    useToast().warning("请先填写面积！");
    return;
  }

  if (!resultList.value.length) {
    resultList.value.push({ type: 'init', data: firstData, year: 0 });
    return
  }
  useToast().warning('数据已经处理过')
}

// 清空内容
const clearData = () => {
  originData = null;
  firstData = null;
  resultList.value = [];
  selectedFileName.value = '';
  document.getElementById('fileInput').value = '';
  useToast().success("数据已清空！");
};

// 打开表格弹窗
const openTableModal = (data) => {
  const tableBody = document.getElementById('table_body');
  tableBody.innerHTML = ''; // 清空之前的内容
  data.forEach(row => {
    const tr = document.createElement('tr');
    for (const key in row) {
      const td = document.createElement('td');
      td.textContent = row[key];
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  });
  const tableModal = document.getElementById('table_modal');
  tableModal.showModal();
};

const exportCSV = () => {
  if (!bdqParams.value.B) {
    useToast().warning("请先选择并使用 B、D、Q 参数！");
    return;
  }

  let dataList = resultList.value.map(v => {
    return v.data.map(item => {
      return {
        ...item,
        "株数": Math.round((item["株数"] / Number(area.value)) * 10000),  // 转换为株数/公顷
      }
    })
  })
  const nameList = resultList.value.map(v => {
    if (v.type === 'init') return '初始'
    if (v.type === 'predict') return `预测${v.year}年`
    if (v.type === 'cut') return `砍伐一次`
  })
  const { B, D, Q } = bdqParams.value
  exportResultsToCSV(dataList, nameList, `RCP-B${B}D${D}q${Q}`)
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-linear-to-br from-base-100 via-base-200 to-base-300">
    <div class="toast toast-center toast-top z-50" id="toast-root"></div>

    <!-- 顶部导航栏 -->
    <div class="navbar bg-base-100 shadow-lg border-b border-base-300 sticky top-0 z-40">
      <div class="navbar-start flex items-center gap-2">
        <div class="flex items-center gap-2">
          <label class="btn btn-ghost bg-neutral/10 hover:bg-neutral/20 border-none">
            <input type="file" id="fileInput" accept=".csv" @change="fileLoad" class="hidden" />
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span class="ml-2">上传 CSV</span>
          </label>

          <!-- 显示文件名 -->
          <div v-if="selectedFileName" class="flex items-center gap-1">
            <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-sm text-success font-medium">{{
              selectedFileName
            }}</span>
          </div>
        </div>
      </div>

      <div class="navbar-center hidden lg:flex"></div>

      <div class="navbar-end">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
            <div class="w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01">
                </path>
              </svg>
            </div>
          </div>
          <ul tabindex="0" class="mt-3 z-1 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><a onclick="param_modal.showModal()">修改参数</a></li>
            <li><a @click="exportCSV">导出 CSV</a></li>
            <li><a @click="clearData">清除数据</a></li>
          </ul>
        </div>

        <!-- 主题切换按钮 -->
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
              </path>
            </svg>
          </div>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-36">
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Default" value="default" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Retro" value="retro" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Valentine" value="valentine" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Luxury" value="luxury" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Forest" value="forest" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" class="theme-controller btn btn-sm btn-ghost justify-start"
                aria-label="Dim" value="dim" />
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="p-4 h-16 bg-base-100 flex items-center justify-start gap-4">
      <input type="number" class="input" placeholder="在此输入面积" :value="area" @change="inputChange($event, 'area')" />
      <input type="number" class="input" placeholder="在此输入坡度" :value="slope" @change="inputChange($event, 'slope')" />
      <label class="input">
        <input type="text" placeholder="在此输入降水数据" :value="precipitation"
          @change="inputChange($event, 'precipitation')" />
        <span class="label">map</span>
      </label>
      <label class="input">
        <input type="text" placeholder="在此输入温度数据" :value="temperature" @change="inputChange($event, 'temperature')" />
        <span class="label">mat</span>
      </label>
      <button class="btn btn-ghost" @click="loadFirstData">处理数据</button>
      <button class="btn btn-ghost" @click="predictFiveYears">预测 5 年</button>
      <button class="btn btn-ghost" @click="cutOnce">砍伐</button>
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
              <kbd class="kbd kbd-md">地区: {{ place && paramsConfig[place].name }}</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="bg-base-100 px-4 my-4 flex-1">
      <div class="card w-full bg-base-100 card-xs shadow-sm h-full">
        <div class="card-body flex flex-row justify-center p-4 ">
          <div style="width: 1600px;" class="flex flex-row gap-12 flex-wrap">
            <template v-for="(value, index) in resultList" :key="index">
              <chartCom :type="value.type" :id="'chart-' + value.year" :data="value.data" :bdq="bdqParams"
                :year="value.year" :area="+area" @open-table-modal="openTableModal" />
            </template>
          </div>
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
        <h3 class="text-lg font-bold mb-8">参数修改</h3>
        <div class="flex flex-row gap-4 items-center">
          <div>地区选择：</div>
          <select class="select" v-model="place" @change="savePlace">
            <option disabled>选择一个地区：</option>
            <option value="chongqing">重庆</option>
            <option value="qingyang">庆阳</option>
          </select>
        </div>
        <div class="divider"></div>
        <div class="flex flex-row gap-4 items-center">
          <div>补种树种：</div>
          <select class="select" v-model="fillSelectedSpecies">
            <option disabled>选择一个树种：</option>
            <option v-for="species in allTreeSpecies" :key="species" :value="species">{{ species }}</option>
          </select>
          <div>采伐树种优先级：</div>
          <MultiSelect :options="allTreeSpecies.map(species => ({ label: species, value: species }))"
            v-model="cutSelectedSpecies" />
        </div>
        <div class="divider"></div>
        <div class="flex gap-8">
          <input type="number" class="input" placeholder="B" :value="addB" @change="inputChange($event, 'B')" />
          <input type="number" class="input" placeholder="D" :value="addD" @change="inputChange($event, 'D')" />
          <input type="number" class="input" placeholder="Q" :value="addQ" @change="inputChange($event, 'Q')" />
          <button class="btn btn-primary" @click="addBDQ">添加</button>
        </div>
        <ul class="mt-8 h-60 overflow-y-auto space-y-2">
          <li v-for="(item, index) in bdqList" :key="index"
            class="list bg-base-100 rounded-box shadow-md h-12 flex flex-row justify-between items-center px-4">
            <div class="flex">
              <div class="mr-4">
                <div v-if="!item.isUse" aria-label="status" class="status status-md"></div>
                <div v-else aria-label="success" class="status status-success status-md"></div>
              </div>
              <div class="flex gap-8">
                <kbd class="kbd kbd-md">B: {{ item.B }}</kbd>
                <kbd class="kbd kbd-md">D: {{ item.D }}</kbd>
                <kbd class="kbd kbd-md">Q: {{ item.Q }}</kbd>
              </div>
            </div>
            <div class="flex flex-row items-center">
              <button class="btn btn-error btn-ghost" @click="removeBDQ(index)">
                删除
              </button>
              <button class="btn btn-primary btn-ghost" @click="useBDQ(index)">
                使用
              </button>
            </div>
          </li>
        </ul>
      </div>
    </dialog>
    <dialog id="table_modal" class="modal">
      <div class="modal-box w-11/12 max-w-5xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        <h3 class="text-lg font-bold mb-8">数据表格</h3>
        <div class="max-h-100 overflow-y-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>树种</th>
                <th>径阶</th>
                <th>株数</th>
              </tr>
            </thead>
            <tbody id="table_body" class="">
              <!-- 表格内容将动态生成 -->
            </tbody>
          </table>
        </div>
      </div>
    </dialog>
  </div>
</template>
