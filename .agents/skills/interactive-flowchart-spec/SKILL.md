---
name: interactive-flowchart-spec
description: "Use when creating flowcharts, process diagrams, or logic pipeline diagrams inside HTML specification/documentation pages — especially interactive SVG flowcharts with zoom/pan, ISO 5807 standard symbols, group containers for parallel checks, midpoint-docked edge routing, and embedding patterns (standalone page / iframe sandbox / collapsible sections). Distilled from the PMS 料事如神 project's data-logic specification work."
---

# 互動式流程圖規格製作（Interactive Flowchart Spec）

在 HTML 規格書／說明文件中製作**專業、可互動、零依賴**的流程圖。本 skill 沉澱自 PMS 專案兩大核心主軸（備料補貨／交期估算）流程圖的完整實作與三輪修正教訓。

## 何時使用

- 需要在規格文件中呈現業務流程、數據邏輯、決策鏈路
- 要求流程圖可縮放、可平移、支援手機、深淺色主題
- 文件需嵌入系統分頁（iframe / 獨立頁）並與系統數據連動

## 核心架構決策（勿妥協）

1. **零依賴原生 SVG + vanilla JS**：不引入 mermaid/d3 等外部庫——離線可用、iframe sandbox 安全、無版本風險。
2. **資料驅動佈局**：流程圖以資料定義（`nodes: {id, col, row, type, title, lines[]}` ＋ `edges: {from, to, route, label?, cls?}`），渲染器統一計算座標與路徑。**禁止手寫座標 SVG**——無法審計、無法程式化驗證。
3. **格點系統**：`col/row` 常數（節點寬高、欄距、列距）＋ PAD；支援小數 row 做交錯排列。
4. **互動四件套**：滾輪縮放（游標錨點）、拖曳平移（Pointer Events + setPointerCapture）、工具列按鈕（放大/縮小/復位）、resize 重算；並將 `fit()` 註冊到全域 registry（如 `window.__fcFit[key]`），供容器從隱藏變可見（如 `<details>` 展開）時重算。

## 標準符號（ISO 5807 / ANSI 流程圖規範）

| 節點類型 | 形狀 | 實作 |
|---|---|---|
| 起訖（Start/End） | 膠囊 | rect rx = 高度/2 |
| 處理（Process） | 矩形 | rect rx=10 |
| 判斷（Decision） | **菱形** | polygon 四頂點；標題自動折兩行；**副行不得放菱形內**（改放懸浮 tooltip 或步驟說明） |
| 資料（Data） | 平行四邊形 | polygon 斜角 16px |
| 預定義程序（Subprocess） | 雙線框矩形 | rect + 兩條直線 |
| 群組邊界（Subprocess boundary） | 虛線圓角容器 | 見下方「平行檢核」規則 |

- 每個節點內嵌 SVG `<title>` 作為懸浮詳解（title + lines）。
- 色彩僅用於**例外／預警類別**（紅缺料、橘爆倉、紫產能…），必須附圖例。
- 文字在節點內**依內容行數動態上下置中**（勿固定頂部偏移）。

## 邊線路由（最容易出錯的部分）

定義明確的路由類型，**每條邊必須顯式指定**：

| route | 情境 | 路徑 |
|---|---|---|
| `v` | 同欄 | 底邊中點 → 頂邊中點直線；標籤置線左側 |
| `h` | 同列 | 來源右邊線**中點** → 目標左邊線中點；標籤置線上方近起點 |
| `h2` | 同列跨多欄（中間有節點） | 底邊中點下行 → 列間水平 → 自目標**底邊中點**上行進入 |
| `elbow` | 異欄異列 | 底邊中點 → 列間水平 → 頂邊中點 |
| `hdown` | 近列 | 右邊線中點水平至目標欄中心 → 下行進入頂邊中點 |
| `sdown` | 匯流 | 左邊線中點水平 → 下行進入目標頂邊中點 |
| `gdown` | 群組容器 → 下游 | 容器底邊中點 → 下行 20px → 水平 → 目標頂邊中點 |

### 鐵律（違反即審計失敗）

1. **所有箭頭起訖點必須對齊圖塊邊線中點**（菱形＝頂點）；路徑末端內縮 2px 讓箭頭尖端觸線（marker refX 語意），審計容差 3px。
2. **任何線條不得穿越節點或文字**。規劃格點時先以座標推演水平段與節點邊界的淨距（建議 ≥13px）；交錯排列（如 col1 r / r+1.8，col2 r+0.9 / r+2.7）可讓肘線水平段落在列間淨空。
3. **同一進出點被多條邊使用時**，重疊段視為合流主幹（可接受）；若語意上需要區分，寧可重新排列版面。

## 邏輯語意檢核（MECE——圖形語意必須等於業務語意）

- **判斷菱形＝互斥分支**：一問擇一。**平行且可同時成立的檢核，禁止畫成菱形扇出**——改用群組容器（見下）。
- **同一檢核的多種結果**：合併為**一個**節點、行內標註各結果（如「供給足→黃燈／不足→紅燈」），不得拆成多顆並聯晶片（暗示可同時發生，語意矛盾）。
- **重複條件即缺陷**：同一判定條件在圖中只能出現一次（MECE）；發現重複，刪除教學性決策節點、由檢核晶片承擔。
- **群組容器**：平行檢核項目全部納入一個虛線邊界框（附標題），**容器對外僅一進一出**，內部項目之間與對外均不畫線。容器邊界由成員 bbox 自動計算（上方預留標題空間 34px、其餘 20px）。
- **編號順序＝視覺順序**；互斥結果以 ′ 標記時必須緊鄰本體。

## 三層驗證管線（缺一不可）

語法檢查會**漏掉執行期錯誤**（實例：未宣告變數 `BW is not defined` 讓三張圖全數渲染失敗，`new Function` 卻通過）。

1. **語法檢查**：`new Function(code)` 解析所有 `<script>` 區塊。
2. **執行期渲染煙霧測試**：以 DOM stub（fake `createElementNS/getElementById/appendChild/…`）實際執行腳本，斷言每張 SVG 取得 viewBox 且子元素數 > 0。
3. **幾何審計**：從文件解析 nodes/edges/groups 定義，重算每條邊起訖座標，斷言全部對齊邊線中點（容差 3px）＋ 無未知路由 ＋ 無遺漏節點。
4. 另加：標籤平衡（void element 白名單）、錨點完整性（`href="#x"` ↔ `id="x"`）。

## 內嵌與資料連動模式

- **獨立全版面頁**：`?page=xxx` 路由 + `fixed inset-0` + iframe `100dvh`（fallback `100vh`）；瀏覽器返回鍵經 `popstate` 還原。
- **iframe sandbox**：`sandbox="allow-scripts"` 下 iframe 內**不得觸碰 localStorage**（必拋 SecurityError）。父↔子通訊一律 `postMessage`（資料同步 + 控制指令如展開/收合）。
- **宿主 App 防護**：App 入口偵測「處於 iframe 內且 storage 不可用」時不啟動完整應用（改渲染提示）；所有 `localStorage` 讀寫必須 try/catch——漏一個 setItem 就會在 React commit 階段未捕捉崩潰。
- **SSOT**：文件檔即單一真相來源，以 `?raw` 匯入渲染，系統數據經 postMessage 注入文件內「即時同步面板」；單獨開啟文件時如實顯示「靜態模式」。
- **章節摺疊**：`<details>/<summary>` 原生元素；錨點跳轉自動展開並觸發圖表 refit。

## 非專業受眾分層（若文件對象含非本業務人員）

由淺入深：生活化比喻入門 → 角色情境卡 → 簡易流程（一分鐘版）→ 互動流程圖 → 專業章節（預設摺疊、附白話摘要）。配套：術語點擊浮窗、FAQ 對話框、節點懸浮詳解。**不得虛構使用者測試結果**——真人測試須如實標記為待辦。

## 參考實作

PMS 專案 `docs/PMS_Data_Logic_Specification.html`（v3.1+）：路由引擎 `routeEdge`、群組容器、三張流程圖定義、SSOT 面板、互動控制；對應 React 宿主 `src/components/DataLogicSpecView.tsx`。修改流程圖後務必跑完整三層驗證。

## 攜帶與安裝

- **安裝到其他環境**：將本資料夾（`interactive-flowchart-spec/`）整個複製到目標環境的 Claude 技能目錄（如 `~/.claude/skills/`）即可被自動匹配觸發；或直接把 SKILL.md 內容作為 prompt 規範貼給 AI 助手使用。
- **遷移檢查**：複製後確認 frontmatter 的 `name`/`description` 完整；description 決定自動觸發時機，請保留關鍵詞（flowchart、SVG、ISO 5807、spec）。
