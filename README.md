<p align="center">
  <img src="https://img.shields.io/badge/Three.js-v0.160-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

# Rebar 3D Designer

### Parametric Steel Reinforcement Visualization System

> **3D** structural engineering tool for designing, visualizing, and calculating steel reinforcement (rebar) configurations in concrete structures.
>
> 專業的 3D 鋼筋配筋設計與視覺化系統，適用於土木工程、建築設計與結構分析領域。

## 📋 Quick Summary

> 🏗️ **專業級 3D 鋼筋配筋設計系統，直接在瀏覽器中完成結構工程設計！** 本專案使用 Three.js + WebGL 2.0 打造互動式 3D 視覺化環境，支援 7 種鋼筋類型：📐 主筋、箍筋、繫筋、腰筋、彎鉤、螺旋筋與鋼筋網片，涵蓋 D10 至 D36 全系列規格。🔧 參數化引擎可即時生成 3D 模型，自動計算鋼筋重量、間距配置與保護層厚度，完全符合 **CNS 560 規範**。📁 支援 **DXF/DWG 匯入**——上傳 AutoCAD 平面圖後，系統自動辨識牆體與柱子並生成完整 3D 建築模型。🎮 操作直覺：滑鼠旋轉縮放、點選元素獨立調整、多視角切換（俯視/正視/3D）。⚡ 無需安裝，開啟 HTML 即可使用，僅需網路連線載入 Three.js CDN。💡 專為土木工程師、建築設計師與結構分析人員打造，大幅縮短配筋設計與校核流程。

---

## ✨ Highlights / 專案亮點

| Feature | Description |
|---------|-------------|
| **Parametric Rebar Engine** | 支援 5 種鋼筋類型（主筋、箍筋、繫筋、腰筋、彎鉤），參數化即時生成 3D 模型 |
| **Real-time 3D Preview** | Three.js 驅動的即時渲染，支援旋轉、縮放、多視角切換 |
| **Engineering Calculations** | 自動計算鋼筋重量、間距配置、保護層厚度，符合 CNS 規範 |
| **DXF/DWG Import** | 匯入 AutoCAD 平面圖，自動辨識牆體與柱子並生成 3D 建築模型 |
| **Interactive Design** | 點選任意結構元素，獨立調整高度與配筋參數 |

---

## 🏗️ Architecture / 系統架構

```
rebar-3d-designer/
│
├── rebar-drawing.js      # Core Engine (27.5KB)
│                         # 鋼筋繪製核心 - 5 種鋼筋類型、材料密度計算、
│                         # 3D 幾何生成、DXF 匯入、場景管理
│
├── main.js               # Scene Manager (12.9KB)
│                         # Three.js 場景初始化、OrbitControls、
│                         # 光源/陰影系統、動畫循環
│
├── index.html            # Interactive UI (15.6KB)
│                         # 工具列、參數面板、鋼筋清單、狀態列
│
├── quickstart.html       # Quick Start Demo (11.3KB)
│                         # 快速原型設計介面
│
└── QUICK_GUIDE.md        # Usage Guide
                          # DXF 匯入到 3D 建模的完整工作流程
```

---

## 🛠️ Tech Stack / 技術棧

```
  Rendering      Three.js v0.160  +  WebGL 2.0  +  PCF Soft Shadows
  Controls       OrbitControls  |  Multi-view (Top / Front / 3D)
  CAD Import     DXF/DWG Parser  ->  Auto wall/column detection
  Calculations   Weight tables (D10-D36)  |  Cover depth  |  Spacing
  UI             Vanilla HTML5/CSS3  |  Real-time parameter sliders
```

---

## 🔩 Rebar Types / 支援鋼筋類型

| Type | Chinese | Application |
|------|---------|-------------|
| **Straight Bar** | 主筋 (直鋼筋) | 梁、柱、板的主要受力鋼筋 |
| **Stirrup** | 箍筋 | 梁柱約束，抗剪力 |
| **Tie Bar** | 繫筋 | 柱內橫向連結 |
| **Waist Bar** | 腰筋 | 深梁側面輔助鋼筋 |
| **Hook Bar** | 彎鉤 | 錨固增強，帶彎鉤端部 |
| **Spiral** | 螺旋筋 | 圓形柱螺旋箍筋 |
| **Mesh** | 鋼筋網 | 雙向鋼筋網片，用於樓板 |

### Supported Rebar Grades / 鋼筋規格

| Grade | Diameter | Unit Weight (kg/m) | Material |
|-------|----------|-------------------|----------|
| D10 | 10.0 mm | 0.617 | SD280 / SD420 / SD490 |
| D13 | 12.7 mm | 0.995 | SD280 / SD420 / SD490 |
| D16 | 15.9 mm | 1.578 | SD280 / SD420 / SD490 |
| D19 | 19.1 mm | 2.253 | SD280 / SD420 / SD490 |
| D22 | 22.2 mm | 3.042 | SD280 / SD420 / SD490 |
| D25 | 25.4 mm | 3.973 | SD280 / SD420 / SD490 |
| D29 | 28.6 mm | 5.059 | SD280 / SD420 / SD490 |
| D32 | 32.3 mm | 6.404 | SD280 / SD420 / SD490 |
| D36 | 35.8 mm | 7.907 | SD280 / SD420 / SD490 |

---

## 🏁 Quick Start / 快速開始

### 1. Open in Browser / 開啟瀏覽器

```bash
# No build step required - just open index.html
# 無需安裝，直接開啟（需網路連線載入 Three.js CDN）
open index.html
```

### 2. Import a CAD Floor Plan (Recommended) / 匯入 CAD 平面圖

```
1. Click "匯入 DXF" on the toolbar
2. Select your .dxf floor plan file
3. The system auto-generates a 3D building model
4. Walls and columns are detected automatically
```

### 3. Design Rebar / 配置鋼筋

```
1. Select rebar type from the left panel (直鋼筋 / 箍筋 / ...)
2. Set grade (D10-D36), length, spacing, quantity
3. Double-click in the 3D viewport or press [A] to place
4. Click any rebar to select -> adjust -> [Delete] to remove
```

### Controls / 操作方式

| Action | Input |
|--------|-------|
| **Rotate** | Left-click drag |
| **Pan** | Right-click drag / Shift + Left-click |
| **Zoom** | Scroll wheel |
| **Add Rebar** | Double-click / `A` key |
| **Delete** | Select + `Delete` key |
| **View Switch** | Toolbar buttons (Top / Front / 3D) |

---

## 📊 Engineering Formulas / 工程計算

### Weight Calculation / 重量計算

```
Weight (kg) = Length (m) x Unit Weight (kg/m)
```

### Cover Depth Standards / 保護層厚度標準

| Environment | Cover Depth |
|-------------|-------------|
| Indoor / 室內 | 30-40 mm |
| Outdoor / 室外 | 50 mm |
| Soil Contact / 土壤接觸 | 70 mm |

---

## 🌐 Browser Requirements / 瀏覽器需求

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 15+ |

Requires **WebGL 2.0** support.

---

## 📚 Reference Standards / 參考規範

- **CNS 560** - 鋼筋混凝土用鋼筋
- **建築技術規則** - 保護層厚度、配筋間距
- **混凝土結構設計規範** - 結構強度計算

---

## 📄 License

MIT License

---

<p align="center">
  <sub>Built with Three.js and modern web technologies for structural engineering professionals.</sub>
  <br />
  <sub>使用 Three.js 與現代 Web 技術打造的專業結構工程軟體。</sub>
</p>
