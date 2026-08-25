# PMS 內網檔案服務部署指南 (V2-Intranet)

零依賴單檔服務：靜態托管前端 + 檔案型資料 API。適用 Windows 內網環境，無需安裝 Node.js 或資料庫。

## 架構

```
內網資料夾 (DataDir)
  ├─ db.json          共用業務資料（database + systemParams + materialClasses）
  ├─ db.meta.json     版本與最後儲存時間（服務維護）
  └─ snapshots/       滾動快照 ×30（每次寫入前自動留存）
```

## 一次性部署（管理員 PowerShell）

```powershell
# 1. HTTP 綁定授權（免每次以管理員執行服務）
netsh http add urlacl url=http://+:8420/ user=Everyone

# 2. 防火牆開孔（供內網其他電腦連入）
netsh advfirewall firewall add rule name="PMS Intranet Service" dir=in action=allow protocol=TCP localport=8420
```

## 啟動服務

```powershell
cd server
powershell -ExecutionPolicy Bypass -File intranet-service.ps1 -DataDir "<內網共用資料夾路徑>" -Port 8420
```

- `<內網共用資料夾路徑>`：如 UNC 路徑（NAS 共用資料夾）或本機磁碟路徑
- 啟動後內網同事以瀏覽器開啟 `http://<服務主機IP>:8420/` 即可使用
- 按 Ctrl+C 停止服務

## 建置前端

```powershell
npm run build        # 產出 dist/
```

服務預設托管專案根目錄下的 `dist/`（可用 `-DistDir` 指定其他路徑）。更新版本時重新 build 即可，不需重啟服務。

## API

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 真實健康狀態：資料夾可寫性、版本、最後儲存時間、快照數 |
| GET | `/api/db` | 讀取 `db.json`，回應帶 `ETag: <version>`；404 = 尚未初始化 |
| PUT | `/api/db` | 樂觀鎖寫入：header `If-Match: <version>`；版本不符回 409 |

## 資料復原

快照位於 `<DataDir>/snapshots/`，取任一份覆蓋回 `db.json` 後重整頁面即可。

## 安全性邊界（現行版本）

- 無帳號權限機制：任何能連到服務埠的內網用戶皆可讀寫（帳號權限保留後續修訂）
- 僅限信任內網使用，**不可**將 8420 埠暴露至網際網路
- 資料檔為 JSON 明文，資料夾存取權限依賴 Windows 共用權限設定
