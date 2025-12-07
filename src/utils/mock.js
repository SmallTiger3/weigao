export function createCsvData() {
  let csvData = [];
  for (let i = 0; i < 1; i++) {
    csvData.push({ 树种: "侧柏", 胸径: "7.5" });
  }
  for (let i = 0; i < 2; i++) {
    csvData.push({ 树种: "侧柏", 胸径: "12.5" });
  }

  for (let i = 0; i < 17; i++) {
    csvData.push({ 树种: "辽东栎", 胸径: "7.5" });
  }
  for (let i = 0; i < 15; i++) {
    csvData.push({ 树种: "辽东栎", 胸径: "12.5" });
  }
  for (let i = 0; i < 19; i++) {
    csvData.push({ 树种: "辽东栎", 胸径: "17.5" });
  }
  for (let i = 0; i < 14; i++) {
    csvData.push({ 树种: "辽东栎", 胸径: "22.5" });
  }
  for (let i = 0; i < 6; i++) {
    csvData.push({ 树种: "辽东栎", 胸径: "27.5" });
  }

  for (let i = 0; i < 43; i++) {
    csvData.push({ 树种: "其它树种", 胸径: "7.5" });
  }
  for (let i = 0; i < 16; i++) {
    csvData.push({ 树种: "其它树种", 胸径: "12.5" });
  }
  for (let i = 0; i < 2; i++) {
    csvData.push({ 树种: "其它树种", 胸径: "17.5" });
  }
  for (let i = 0; i < 2; i++) {
    csvData.push({ 树种: "其它树种", 胸径: "22.5" });
  }
  for (let i = 0; i < 4; i++) {
    csvData.push({ 树种: "其它树种", 胸径: "27.5" });
  }

  for (let i = 0; i < 28; i++) {
    csvData.push({ 树种: "槭树", 胸径: "7.5" });
  }
  for (let i = 0; i < 5; i++) {
    csvData.push({ 树种: "槭树", 胸径: "12.5" });
  }
  for (let i = 0; i < 4; i++) {
    csvData.push({ 树种: "槭树", 胸径: "17.5" });
  }

  return csvData;
}
