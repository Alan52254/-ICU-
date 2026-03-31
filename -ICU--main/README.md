# 🏥 eICU 智慧重症監護儀表板

> **eICU Smart Critical Care Dashboard**
> 以單一重症個案為中心的智慧監測儀表板前端原型，聚焦於即時生命徵象、感染風險、灌流狀態、呼吸器資訊、實驗室數據與 AI 輔助判讀的整合式可視化展示。

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://alan52254.github.io/-ICU-/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 📸 Demo Preview

打開 `index.html` 即可在瀏覽器中執行完整 Dashboard。
亦可透過 GitHub Pages 線上瀏覽：**[Live Demo](https://alan52254.github.io/-ICU-/)**

---

## 🎯 專案定位

本作品為 **前端展示原型 (Front-end Prototype)**，適用於：

- 🎓 課堂專題展示 / 畢業專題 Demo
- 📋 Portfolio 作品集
- 🌐 嵌入 Google Sites 進行線上展示
- 💡 ICU 臨床資訊系統概念驗證 (Proof of Concept)

> ⚠️ **重要聲明**：本系統為教育展示用途，**非正式醫療系統**。不連接真實病患資料、醫療設備或臨床決策輔助系統。所有數據均為模擬產生。

---

## ✨ 功能特色

### 🫀 即時生命徵象監測 (Continuous Monitoring)
| 指標 | 說明 | 臨床意義 |
|------|------|----------|
| **HR** (Heart Rate) | 心率 bpm | 反映心臟代償、感染、疼痛等 |
| **SpO₂** | 血氧飽和度 % | 呼吸監測關鍵指標 |
| **MAP** (Mean Arterial Pressure) | 平均動脈壓 mmHg | 器官灌流壓核心指標 |
| **RR** (Respiratory Rate) | 呼吸速率 rpm | 常為病人惡化最早變化的生命徵象 |
| **Temp** | 體溫 °C | 感染/敗血症重要訊號 |

### 📈 互動式波形圖表
- 即時更新的 HR / MAP / SpO₂ 時間序列圖
- 可切換顯示/隱藏指標線條
- 暫停/恢復資料更新
- AI Forecast 預測趨勢虛線
- MAP < 65 mmHg 自動標記危險點

### 🧠 AI 智能分析 (Mock)
- 根據病人即時數據自動產生臨床觀察與建議處置
- **情境感知**：依據 MAP / SpO₂ / HR / Temp 不同狀態提供對應分析
- 不依賴外部 API，穩定可靠的 Demo 體驗

### 🔔 通知中心 & 警報管理
- 即時 Critical Alerts 紀錄
- 未讀計數 Badge
- 「Mark All Read」一鍵已讀功能
- 警報歷史紀錄保留

### 🛡️ AI 預測風險面板
- **Sepsis Risk (4H)**：動態敗血症風險評估，根據 MAP / HR / SpO₂ / Temp 即時變化
- **AKI Risk (24H)**：急性腎損傷風險提示
- Key Contributing Factors 分析
- Action Recommended 建議行動

### ⚠️ Patient Safety Banner
- 高 Sepsis Risk 時自動顯示紅色警示橫幅
- 低血壓 (MAP < 65) 時自動顯示黃色警示橫幅
- 動態反映病人當前最危急狀態

### 📋 Case Summary Card
- ICU Day、主診斷、呼吸器模式、升壓藥、腎功能狀態一覽

### 🏥 多分頁臨床資料

| 分頁 | 內容 |
|------|------|
| **Real-time Vitals** | 波形圖、AI 分析、風險面板 |
| **Labs & ABG** | 實驗室檢驗 (WBC, Hb, Plt, Cr, BUN, Lactate, PCT, CRP) + 動脈血氣分析 |
| **Ventilator (RT)** | 呼吸器設定 (SIMV-PS) 與量測參數 |
| **I/O & Meds** | 出入量記錄與淨液體平衡 |

### 📥 CSV 匯出
- 匯出欄位：Time, HR, MAP, SpO₂, RR, Temp, Sepsis Risk
- 可直接用 Excel / Google Sheets 開啟分析

### 💾 狀態持久化 (localStorage)
- Active Tab 記憶
- Pause/Resume 狀態保留
- Alert 已讀狀態保存
- 重新整理不遺失操作狀態

---

## 🏗️ 技術架構

```
eICU Dashboard (Single-page Application)
├── React 18 (CDN, UMD)
├── Tailwind CSS (CDN)
├── Babel (Browser JSX Transform)
├── Pure SVG Charts (No Chart Library)
└── localStorage API
```

| 項目 | 技術 |
|------|------|
| Framework | React 18 (via CDN) |
| Styling | Tailwind CSS (via CDN) |
| JSX Compiler | Babel Standalone |
| Charts | Custom SVG (手刻，無第三方圖表庫) |
| Icons | Inline SVG Components |
| State Persistence | localStorage |
| AI Analysis | Mock (Pattern-based, no external API) |
| Deployment | Static HTML → GitHub Pages / Google Sites |

---

## 🚀 快速開始

### 本機直接開啟
```bash
# 直接用瀏覽器打開
start index.html   # Windows
open index.html     # macOS
```

### GitHub Pages 部署
1. Fork 或 Clone 本 Repo
2. 前往 Settings → Pages
3. Source 選擇 `main` branch, `/ (root)` 目錄
4. 網站將在數分鐘內上線

### Google Sites 嵌入
```html
<iframe src="https://alan52254.github.io/-ICU-/"
        width="100%" height="800"
        frameborder="0"></iframe>
```

---

## 📁 專案結構

```
學姊icu平台/
├── index.html          # 完整單頁應用程式 (所有 React 組件 + 樣式)
├── README.md           # 專案說明文件
└── .gitignore          # Git 忽略規則
```

---

## 🧩 組件架構

```
App (主應用)
├── Header (病人資訊 + 系統狀態)
│   ├── NotificationBell (通知中心)
│   └── Export CSV Button
├── Tab Navigation
├── Metric Cards × 5 (HR, SpO₂, MAP, RR, Temp)
├── Patient Safety Banner (動態警示)
├── Case Summary Card
└── Tab Content
    ├── Vitals Tab
    │   ├── CustomTimeSeriesChart (SVG 波形圖)
    │   ├── Clinical Observation (AI Mock 分析)
    │   ├── AI Predictive Insights (Sepsis/AKI Risk)
    │   └── AKI Risk Card
    ├── Labs Tab (Lab Results + ABG Analysis)
    ├── Vent Tab (Ventilator Settings + Measured Parameters)
    └── I/O Tab (Intake/Output + Net Fluid Balance)
```

---

## 🩺 臨床情境設定

本 Dashboard 模擬的是一位 **ICU 住院病人的 bedside summary dashboard**：

| 欄位 | 設定 |
|------|------|
| 床號 | Bed 04 |
| 姓名 | LIN, M. |
| 病歷號 | #PT-88492 |
| 性別/年齡/體重 | Male / 68 yrs / 72 kg |
| 主診斷 | Pneumonia (肺炎) |
| 併發症風險 | Sepsis, AKI, Hemodynamic Instability |
| ICU Day | Day 2 |
| 治療中 | Ventilator (SIMV-PS), Norepinephrine, Meropenem |

---

## ⚠️ 限制與未來工作

### 目前限制
- 📊 資料為前端模擬，非真實病患數據
- 🤖 AI 分析為 Pattern-based Mock，非真實機器學習模型
- 👤 僅支援單一病人檢視，無多病人病房總覽
- 📅 趨勢圖為短時間即時，無 24h/48h/7d 長期趨勢
- 🔐 無認證機制、無 HIPAA/GDPR 合規

### 未來可擴充方向
- [ ] 多病人 ICU 病房總覽 (Ward Overview)
- [ ] 真實 AI/ML 模型整合 (e.g., Sepsis Prediction Model)
- [ ] 後端 API 串接 (Node.js / FastAPI)
- [ ] 真實資料源串接 (HL7 FHIR, bedside monitors)
- [ ] Vasopressor dose trend 圖表
- [ ] Urine output per kg/hr 趨勢
- [ ] GCS / RASS 評估量表
- [ ] 護理紀錄 / 醫師 Notes
- [ ] 24h / 48h 長期趨勢圖
- [ ] 多語言支援 (中/英切換)

---

## 📜 授權

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 授權。

---

## 🙏 致謝

- [React](https://reactjs.org/) — UI Framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Babel](https://babeljs.io/) — JSX Compiler
- 臨床指標參考：ICU 重症醫學教科書與臨床實務

---

<p align="center">
  <em>Built with ❤️ for ICU clinical education and portfolio demonstration</em>
</p>
