# Grid State Management 架構改進

## 問題描述

原本的架構中，多個函數會同時修改 `grid` 狀態，導致 **race condition** 和狀態覆蓋問題：

1. `advanceTime` 在 `setTime` 回調中使用閉包捕獲的 `grid` 來更新敵人攻擊
2. `handleTileClick` 中的探索/戰鬥邏輯也會更新 `grid`
3. 這兩個更新會互相覆蓋，導致某些狀態丟失

## 解決方案：函數式更新 (Functional Updates)

### 核心原則

所有 `setGrid` 調用都改為使用**函數式更新**：

```typescript
// ❌ 錯誤：使用閉包中的舊值
setGrid(updatedGrid);

// ✅ 正確：使用最新的狀態
setGrid(prevGrid => {
  // 基於 prevGrid 進行修改
  return newGrid;
});
```

## 具體修改

### 1. advanceTime 函數 (L108-148)

**改動**：
- 將敵人攻擊邏輯從 `setTime` 回調中移出
- 使用 `setGrid(prevGrid => ...)` 確保基於最新狀態
- 移除對 `grid` 的依賴（從 `[addLog, grid]` 改為 `[addLog]`）

**好處**：
- `advanceTime` 不會因為 grid 改變而重新創建
- 總是使用最新的 grid 狀態
- 減少不必要的 re-render

### 2. 探索邏輯 (L226-263)

**改動**：
- 在 `advanceTime(10)` 之後使用 `setGrid(prevGrid => ...)`
- 確保探索更新基於敵人攻擊後的最新狀態

**執行順序**：
```
1. advanceTime(10) → 更新敵人攻擊進度
2. setGrid(prevGrid => ...) → prevGrid 已包含敵人攻擊更新
3. 在此基礎上添加探索結果
```

### 3. 戰鬥/交互邏輯 (L373-477)

**改動**：
- 啟用 `advanceTime` 的被動事件（移除 `false` 參數）
- 移除手動調用 `updateEnemyAttackProgress`
- 使用 `setGrid(prevGrid => ...)` 進行所有更新

**簡化**：
- 不再需要手動管理敵人攻擊邏輯
- 所有時間推進都會自動觸發敵人攻擊
- 代碼更簡潔，邏輯更清晰

## 架構優勢

### ✅ 狀態一致性
所有 grid 更新都基於最新狀態，不會有覆蓋問題

### ✅ 敵人攻擊正常運作
每次 `advanceTime` 都會正確更新敵人攻擊進度

### ✅ 可擴展性
未來如果需要添加其他被動效果，只需要在 `advanceTime` 中添加邏輯

### ✅ 性能優化
減少不必要的函數重新創建和 re-render

## 使用範例

### 玩家探索 tile
```
用戶點擊 → handleTileClick
  ├─ advanceTime(10)
  │   ├─ setTime(時間 +10)
  │   └─ setGrid(敵人攻擊進度更新)
  └─ setGrid(探索結果更新，基於上一步的 grid)
```

### 玩家戰鬥
```
用戶點擊敵人 → handleTileClick
  ├─ advanceTime(10)
  │   ├─ setTime(時間 +10)
  │   └─ setGrid(其他敵人攻擊進度更新)
  └─ setGrid(戰鬥結果更新，基於上一步的 grid)
```

## 注意事項

1. **所有 grid 更新都應該使用函數式更新**
2. **避免在 setGrid 外部修改 grid 陣列**
3. **如果需要禁用被動事件，使用 `advanceTime(minutes, false)`**

## 測試建議

- [ ] 探索 tile 時，敵人攻擊進度條正常更新
- [ ] 戰鬥時，其他敵人的攻擊進度正常累積
- [ ] 多個敵人同時攻擊時，所有傷害都正確計算
- [ ] 沒有狀態覆蓋或丟失的情況
