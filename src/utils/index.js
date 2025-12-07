import { paramsConfig } from '../const/index.js';

export function getDiameterRanges(min, max, label, spacing) {
  let diameterRanges = [];
  while (label <= 100) {
    diameterRanges.push({ min, max, label });
    min += spacing;
    max += spacing;
    label += spacing;
  }

  return diameterRanges;
}

// 封装径阶整合的函数
export function calculateDiameterRange(data, diameterRanges, area) {
  // 结果存储（树种 -> 径阶 -> 株数）
  let result = {};

  data.forEach((row) => {
    let treeType = row["树种"];
    let diameter = parseFloat(row["胸径"]);

    // 确保该树种的径阶初始化
    diameterRanges.forEach((range) => {
      if (!result[treeType]) {
        result[treeType] = {}; // 初始化树种
      }
      if (!result[treeType][range.label]) {
        result[treeType][range.label] = { 株数: 0 }; // 初始化径阶
      }
    });

    // 确定该胸径属于哪个区间，并更新株数
    for (let range of diameterRanges) {
      if (diameter >= range.min && diameter < range.max) {
        result[treeType][range.label].株数 += 1;
        break;
      }
    }
  });

  // 转换成表格格式 [{ 树种, 径阶, 株数 }]
  let formattedResult = [];
  for (let treeType in result) {
    for (let label in result[treeType]) {
      formattedResult.push({
        树种: treeType,
        径阶: label,
        株数: result[treeType][label].株数,
        //每公顷株数: result[treeType][label].株数 / (area / 10000), // 每公顷株数
      });
    }
  }

  return formattedResult;
}

/**
 * 转换数据为所需要的数据结构
 *
 * @export
 * @param {any} rawData 原始 csv 数据
 * @returns 转换后的数据
 */
export function convertData(rawData) {
  const realData = rawData.slice(1); // 去掉表头
  const formattedData = realData.map((row) => {
    return {
      树种: row[rawData[0].indexOf("树种")],
      胸径: row[rawData[0].indexOf("胸径")],
    };
  });
  return formattedData;
}

// 预测函数
export function transMatrixYuCe(result, area, sl, mat, map, spacing, size) {
  let formattedResult = processDiameterData(result, area);
  let { totalBasalArea, speciesDiversity, diameterDiversity } = formattedResult;

  let growthByDiameter1 = calculateByDiameter(
    result,
    speciesDiversity,
    diameterDiversity,
    totalBasalArea,
    sl,
    mat,
    map,
    spacing,
    area
  ); //这个最好输出一个result结果，到时候便于操作

  result = growthByDiameter1;

  return result;
}

export function processDiameterData(diameterData, area) {
  let totalBasalArea = 0;
  let speciesBasalAreas = {}; // 按树种汇总胸高断面积
  let diameterBasalAreas = {}; // 按径阶汇总胸高断面积

  diameterData.forEach((item) => {
    let { 树种, 径阶, 株数 } = item;
    let basalArea = calculateBasalArea(径阶, area);
    let totalBasalAreaForItem = basalArea * 株数;

    // 累加胸高断面积
    totalBasalArea += totalBasalAreaForItem;

    // 按树种汇总胸高断面积
    if (!speciesBasalAreas[树种]) {
      speciesBasalAreas[树种] = 0;
    }
    speciesBasalAreas[树种] += totalBasalAreaForItem;

    // 按径阶汇总胸高断面积
    if (!diameterBasalAreas[径阶]) {
      diameterBasalAreas[径阶] = 0;
    }
    diameterBasalAreas[径阶] += totalBasalAreaForItem;
  });

  // 计算树种多样性
  let speciesDiversity = calculateSpeciesDiversity(
    speciesBasalAreas,
    totalBasalArea
  );

  // 计算径阶多样性
  let diameterDiversity = calculateDiameterDiversity(
    diameterBasalAreas,
    totalBasalArea
  );

  // 返回计算结果
  return {
    totalBasalArea,
    speciesDiversity,
    diameterDiversity,
  };
}

export function calculateBasalArea(diameter, area) {
  return (Math.PI * Math.pow(diameter / 2, 2)) / area;
}
export function calculateSpeciesDiversity(speciesBasalAreas, totalBasalArea) {
  let diversityIndex = 0;
  if (totalBasalArea > 0) {
    for (let treeType in speciesBasalAreas) {
      let proportion = speciesBasalAreas[treeType] / totalBasalArea;
      if (proportion > 0) {
        diversityIndex -= proportion * Math.log(proportion);
      }
    }
  }
  return Number(diversityIndex.toFixed(4)); // 保留4位小数
}

export function calculateDiameterDiversity(diameterBasalAreas, totalBasalArea) {
  if (totalBasalArea === 0) return 0;

  let diversity = 0;
  for (let diameter in diameterBasalAreas) {
    let proportion = diameterBasalAreas[diameter] / totalBasalArea;
    if (proportion > 0) {
      diversity -= proportion * Math.log(proportion);
    }
  }
  return Number(diversity.toFixed(4));
}

export function calculateByDiameter(
  data,
  speciesDiversity,
  diameterDiversity,
  totalBasalArea,
  slope,
  mat,
  map,
  spacing,
  area
) {
  if (data.length === 0) return "无数据";
  let forestData = {}; // 存储树种、径阶、株数
  let speciesTotalStock = {};
  const allParams = getParam();
  const speciesGrowthParams = allParams.speciesGrowthParams;
  const speciesMortalityParams = allParams.speciesMortalityParams;
  data.forEach((row) => {
    let treeType = row["树种"];
    let diameterClass = row["径阶"];
    let stock = row["株数"]; // 获取株数
    let speciesStock = stock / (area / 10000);

    if (!speciesTotalStock[treeType]) {
      speciesTotalStock[treeType] = 0;
    }
    speciesTotalStock[treeType] += speciesStock; // 按树种累加

    if (!speciesGrowthParams[treeType] || !speciesMortalityParams[treeType]) {
      console.warn(`未找到树种 ${treeType} 的生长或死亡率参数，跳过计算`);
      return;
    }

    // 计算生长量
    let growth =
      calculateGrowth(
        treeType,
        diameterClass,
        slope,
        speciesDiversity,
        diameterDiversity,
        mat,
        map,
        totalBasalArea
      ) / spacing;

    //庆阳的，记为0
    let mortality = calculateMortality(
      treeType,
      diameterClass,
      slope,
      speciesDiversity,
      diameterDiversity,
      mat,
      map,
      totalBasalArea
    );
    //let mortality = 0;

    // 初始化树种数据
    if (!forestData[treeType]) {
      forestData[treeType] = {
        进界株数: 0, // 进界株数存储在树种层级
        径阶数据: {},
      };
    }

    // 初始化径阶数据
    if (!forestData[treeType]["径阶数据"][diameterClass]) {
      forestData[treeType]["径阶数据"][diameterClass] = {
        株数: stock,
        生长率: growth,
        保留概率: Math.max(1 - growth - mortality, 0),
        原株数: stock, // 记录原始株数
      };
    }
  });

  // **在 forEach() 结束后计算进界株数**
  Object.keys(speciesTotalStock).forEach((treeType) => {
    let recruitment = calculateRecruitment(
      treeType,
      speciesTotalStock[treeType],
      slope,
      speciesDiversity,
      diameterDiversity,
      mat,
      map,
      totalBasalArea
    );
    forestData[treeType]["进界株数"] = (recruitment * area) / 10000;
  });

  // **更新径阶的株数**
  let updatedData = []; // This will store the final results
  let roundingError; // 提前声明变量

  Object.keys(forestData).forEach((treeType) => {
    let diameterClasses = Object.keys(forestData[treeType]["径阶数据"]).sort(
      (a, b) => a - b
    ); // 递增排序

    // **第一个径阶**
    let firstDiameterClass = diameterClasses[0]; // 找到**第一个**径阶

    let firstData = forestData[treeType]["径阶数据"][firstDiameterClass];
    let 保留概率 = firstData["保留概率"];

    let previousStock = firstData["原株数"]; // 记录**第一个径阶的原始株数**

    let newStock = previousStock * 保留概率 + forestData[treeType]["进界株数"];

    // 进行四舍五入
    let roundedStock = Math.round(newStock);

    // 计算误差（四舍五入前后的差值）
    roundingError = newStock - roundedStock;

    firstData["株数"] = roundedStock;
    //
    //
    // firstData["株数"] = previousStock * 保留概率 + forestData[treeType]["进界株数"]; // **第一个径阶加上进界株数**
    //firstData["每公顷株数"] = firstData["株数"] / (area / 10000);
    // 将树种、径阶、株数保存到更新数据对象中
    updatedData.push({
      树种: treeType,
      径阶: firstDiameterClass,
      株数: Math.max(firstData["株数"], 0),
    });

    // **更新其他径阶**
    for (let i = 1; i < diameterClasses.length; i++) {
      let diameterClass = diameterClasses[i];
      let data = forestData[treeType]["径阶数据"][diameterClass];

      let 保留概率 = data["保留概率"];
      let growth = data["生长率"];

      let oldStock = data["原株数"]; // 记录原始株数

      // **其他径阶的计算方式**
      let newStock =
        oldStock * 保留概率 + previousStock * growth + roundingError;
      // 进行四舍五入
      let roundedStock = Math.round(newStock);

      // 计算误差（四舍五入前后的差值）
      roundingError = newStock - roundedStock;

      data["株数"] = roundedStock;

      // 将树种、径阶、株数保存到更新数据对象中
      updatedData.push({
        树种: treeType,
        径阶: diameterClass,
        株数: Math.max(data["株数"], 0),
      });
      //data["每公顷株数"] = data["株数"] / (area / 10000);
      previousStock = oldStock; // 更新**上一径阶的原株数**
    }
  });
  return updatedData;
}

// 计算某树种某径阶的生长量
function calculateGrowth(
  treeType,
  diameterClass,
  slope,
  speciesDiversity,
  diameterDiversity,
  mat,
  map,
  totalBasalArea
) {
  const allParams = getParam();
  const speciesGrowthParams = allParams.speciesGrowthParams;

  const { r1, r2dbh, r3SL, r4h1, r5h2, r6MAT, r7MAP, r8B } =
    speciesGrowthParams[treeType];
  let result =
    Math.exp(
      r1 +
        r2dbh * diameterClass +
        r3SL * slope +
        r4h1 * speciesDiversity +
        r5h2 * diameterDiversity +
        r6MAT * mat +
        r7MAP * map +
        r8B * totalBasalArea
    ) - 1;
  return Math.max(result, 0);
}

// 计算某树种某径阶的死亡率
function calculateMortality(
  treeType,
  diameterClass,
  slope,
  speciesDiversity,
  diameterDiversity,
  mat,
  map,
  totalBasalArea
) {
  const allParams = getParam();
  const speciesMortalityParams = allParams.speciesMortalityParams;
  const { m1, m2dbh, m3SL, m4h1, m5h2, m6MAT, m7MAP, m8B } =
    speciesMortalityParams[treeType];

  let result =
    m1 +
    m2dbh * diameterClass +
    m3SL * slope +
    m4h1 * speciesDiversity +
    m5h2 * diameterDiversity +
    m6MAT * mat +
    m7MAP * map +
    m8B * totalBasalArea;
  return Math.max(pnorm(result), 0);
}

//计算某数种的进界株数
function calculateRecruitment(
  treeType,
  N,
  slope,
  speciesDiversity,
  diameterDiversity,
  mat,
  map,
  totalBasalArea
) {
  const allParams = getParam();
  const speciesRecruitmentParams = allParams.speciesRecruitmentParams;
  const { z1, z2N, z3SL, z4h1, z5h2, z6MAT, z7MAP, z8B, ze } =
    speciesRecruitmentParams[treeType];

  let result =
    z1 +
    z2N * N +
    z3SL * slope +
    z4h1 * speciesDiversity +
    z5h2 * diameterDiversity +
    z6MAT * mat +
    z7MAP * map +
    z8B * totalBasalArea;

  return Math.max(
    pnorm(result / Math.exp(ze)) * result +
      Math.exp(ze) * dnorm(result / Math.exp(ze)),
    0
  );
}

const getParam = () => {
  const nowPlace = localStorage.getItem('selectedPlace');
  return paramsConfig[nowPlace];
}

// 计算正态分布的累积分布函数 (CDF) - pnorm
export function pnorm(x) {
    return (1 + erf(x / Math.SQRT2)) / 2;
}

// 计算正态分布的概率密度函数 (PDF) - dnorm
export function dnorm(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// 误差函数 erf (用于计算 CDF)
function erf(x) {
    let sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    let a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
    let a4 = -1.453152027, a5 =  1.061405429;
    let p  =  0.3275911;

    let t = 1 / (1 + p * x);
    let y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}
