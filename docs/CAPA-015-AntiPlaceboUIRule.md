# CAPA-015 報告：介面虛假擺設與 Mock 數據清理及防禦機制 (Anti-Placebo & Zero-Mock UI)

> **編號**：CAPA-015  
> **日期**：2026-08-24  
> **責任人**：Antigravity (Senior Full-Stack Architect)  
> **狀態**：✅ 已關閉 (Closed)  
> **影響等級**：中（消除 UI 虛假資訊與誤導性 Fallback 數據，建立零偽造規範）

---

## 1. 問題描述

1. **Navbar 靜態連線卡片**：原頂部常駐「🟢 內網伺服器連線中」，背後無任何網路/後端心跳連線狀態監聽，為純前端靜態 Mock 裝飾。
2. **SalesWorkbench 假數據 Fallback**：業務工作台在查詢無預測記錄或無訂單之料號時，預設 fallback 至偽造之假數據（`10,000` / `8,500` / `-15%` / 假建議），未真實呈現空狀態。
3. **ProcurementWorkbench 推估交期未明確標註**：無訂單料號以 `今日 + 20天` 模擬交期推算倒數，介面未明確標示為推估值。

---

## 2. MECE 六大維度根因分析 (RCA)

【技術層面】
- 原型開發時期為營造企業級儀表板氛圍，遺留了靜態連線標籤與 Mock fallback 數據，未在功能上線前徹底清除。

【流程層面】
- 缺乏「Zero-Mock UI」的強制審查門禁，使得開發過程中為了畫面美觀而塞入無效或誤導性的視覺擺設。

【工具層面】
- 代碼靜態分析未限制 Mock 物件在生產視圖中的使用。

【測試驗證層面】
- 單元測試著重於有資料時的運算正確性，忽略了「查無資料」或「邊界條件」時是否真實呈現空狀態。

【文檔層面】
- 規範中未明確寫入「禁止任何無實質功能的 UI 擺設」之條款。

【環境層面】
- 本系統本質為純前端 Client-Side SPA（本地運算 / LocalStorage / Excel 離線解析），並無常駐後端伺服器，不應出現「伺服器連線中」等與架構不符之字眼。

---

## 3. 矯正措施 (CAPA)

1. **Navbar 虛假擺設清理**：
   - 移除 [`src/components/Navbar.tsx`](file:///d:/Self-developed_Apps/Predictive-Material-System/src/components/Navbar.tsx) 的「內網伺服器連線中」卡片及無效輔助函式。
2. **SalesWorkbench Fallback 修正**：
   - 修正 [`src/components/SalesWorkbenchView.tsx`](file:///d:/Self-developed_Apps/Predictive-Material-System/src/components/SalesWorkbenchView.tsx) 的 `activeSummary`，改為真實空狀態（全 0 與「查無該品號需求」之真實提示）。
3. **ProcurementWorkbench 標籤透明化**：
   - 更新 [`src/components/ProcurementWorkbenchView.tsx`](file:///d:/Self-developed_Apps/Predictive-Material-System/src/components/ProcurementWorkbenchView.tsx)，明確標示「客戶交期:」與「預設交期 (無PO):」，消除歧義。

---

## 4. 預防措施與自進化沉澱 (Self-Evolution & Defense)

已將 **「零偽造與嚴禁虛假 UI 擺設 (Zero-Mock & Anti-Placebo UI)」** 寫入專案核心工程規範 [`AGENTS.md`](file:///d:/Self-developed_Apps/Predictive-Material-System/AGENTS.md) 與 [`GEMINI.md`](file:///d:/Self-developed_Apps/Predictive-Material-System/GEMINI.md) 第 5 條：

- **嚴禁無效裝飾擺設**：禁止在介面中加入任何無真實資料流或無後端心跳支持的「靜態連線中」、「假呼吸燈 (ping)」、「假負載/健康度/延遲」。
- **嚴禁偽造 Fallback 數據**：遇無資料或查詢為空時，一律呈現真實空狀態 (Empty State, 0 筆/無資料)，嚴禁私自塞入假數值偽裝成有運算。
- **透明度優先**：若存在任何模擬推估值，必須在 UI 上明確標示「(預設/無PO)」，絕不誤導使用者。

---

## 5. 驗證依據

- [✓] `tsc --noEmit`：0 錯誤
- [✓] 全專案 15 大視圖已完成全量審查
