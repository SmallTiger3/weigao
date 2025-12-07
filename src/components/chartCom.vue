<script lang="js" setup>
import { defineOptions, defineProps, onMounted, ref } from 'vue'
import {
    Chart
} from 'chart.js/auto';


defineOptions({ name: 'ChartCom' })

const props = defineProps({
    type: {
        type: String,
        required: true
    },
    data: {
        type: Array,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    bdq: {
        type: Object,
        required: true
    },
    year: {
        type: Number,
        required: false
    }
})

const canvasDom = ref(null);
onMounted(() => {
    initChart(props.data);
});

const initChart = (data) => {
    // 处理堆积柱状图的数据
    let treeSpecies = [...new Set(data.map((item) => item["树种"]))];
    let diameterClasses = [...new Set(data.map((item) => item["径阶"]))].sort((a, b) => a - b);

    let datasets = treeSpecies.map((species) => {
        return {
            label: species,
            data: diameterClasses.map((diameter) => {
                let sumCount = data
                    .filter((item) => item["树种"] === species && item["径阶"] === diameter)
                    .reduce((acc, curr) => acc + (curr["株数"] || 0), 0);
                return sumCount;
            }),
            backgroundColor: getRandomColor(),
        };
    });

    // 计算均衡曲线的数据
    let N1 = calculateCurveData(props.bdq.B, props.bdq.D, props.bdq.Q);
    let curveDataPoints = [];
    let i = props.bdq.D / 5;

    for (let x = 5; x <= props.bdq.D; x += 5) {
        let Ni = Math.pow(props.bdq.Q, i - 1);
        curveDataPoints.push({ x, y: Ni * N1 });
        i--;
    }

    // 创建新的图表
    new Chart(canvasDom.value.getContext('2d'), {
        type: "bar",
        data: {
            labels: diameterClasses,//.filter(diameter => data.some(item => item["径阶"] === diameter && item["株数"] > 0)),
            datasets: [
                // 堆积柱状图的数据集
                ...datasets,
                // 均衡曲线的数据集
                {
                    label: "均衡曲线",
                    data: curveDataPoints,
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 3,
                    fill: false,  // 使曲线不填充
                    type: "line",  // 均衡曲线使用线图
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: "rgba(75, 192, 192, 1)",
                    pointBorderColor: "#fff",
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true,  // 启用堆积效果
                    type: "linear",
                    min: Math.min(...diameterClasses),  // 最小值
                    max: props.bdq.D,  // 确保最大值是
                    title: {
                        display: true,
                        text: "径阶",
                        font: { size: 14 }
                    },
                    grid: {
                        drawBorder: true,
                        color: "rgba(200, 200, 200, 0.3)",
                    }
                },
                y: {
                    stacked: true,  // 堆积柱状图需要堆积在一起
                    title: {
                        display: true,
                        text: "株数",
                        font: { size: 14 }
                    },
                    grid: {
                        drawBorder: true,
                        color: "rgba(200, 200, 200, 0.3)",
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: "堆积柱状图与均衡曲线" + getTitle(),
                    font: { size: 18 }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 6
                },
                legend: {
                    display: true,
                    labels: { font: { size: 14 } }
                }
            }
        }
    });
}

function getRandomColor() {
    return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

function calculateCurveData(B, D, q) {
    let k2 = Math.PI / 40000;

    let h = 5;
    let result = 0;
    let currentValue = 7.5;
    let power = D / 5;

    while (currentValue <= D + h / 2) {
        result += currentValue ** 2 * Math.pow(q, power - 1)
        power -= 1;
        currentValue += 5;
    }

    let k3 = k2 * result;
    let N1 = B / k3;

    return N1;
}

function getTitle() {
    if (props.type === 'init') {
        return '（初始）';
    } else if (props.type === 'predict') {
        return `（预测${props.year}年）`;
    } else {
        return '';
    }
}
</script>

<template>
<div style="height: 350px; width: 500px;" class="flex flex-col items-center justify-between border-2 pb-4">
    <div style="width: 450px; height: 300px;">
        <canvas :id="props.id" ref="canvasDom" style="width: 450px; height: 300px;"></canvas>
    </div>
    <div class="flex gap-2 items-center">
        <input type="checkbox" class="toggle toggle-success toggle-sm" />
        <span class="">显示均衡曲线</span>
    </div>
</div>
</template>

<style scoped></style>
