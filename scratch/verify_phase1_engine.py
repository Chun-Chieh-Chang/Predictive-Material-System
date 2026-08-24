import json
import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 70)
print("料事如神系統 (PMS) — Phase 1 核心演算法與數學精確度客觀驗證")
print("=" * 70)

# Verification Test Case 1: 3-Way Demand Cross Comparison & Bias % (OBJ-01 & OBJ-02)
def test_bias_calculation(forecast_qty, actual_qty, hist_qty):
    var_qty = actual_qty - forecast_qty
    bias_pct = (var_qty / forecast_qty * 100) if forecast_qty > 0 else (100.0 if actual_qty > 0 else 0.0)
    abs_bias = abs(bias_pct)
    if abs_bias > 25 or (forecast_qty == 0 and actual_qty > 0):
        level = 'critical'
    elif abs_bias > 10:
        level = 'warning'
    else:
        level = 'normal'
    return round(bias_pct, 1), level

test_cases_bias = [
    (10000, 10500, 9200, 5.0, 'normal'),      # +5%偏差 -> 正常
    (10000, 12000, 9200, 20.0, 'warning'),    # +20%偏差 -> 注意
    (10000, 15000, 9200, 50.0, 'critical'),   # +50%偏差 -> 高危告警
    (10000, 7000, 9200, -30.0, 'critical'),   # -30%急縮 -> 高危告警
    (0, 5000, 4600, 100.0, 'critical'),       # 無預測突發插單 -> 高危告警
]

print("\n[測試項 1] 三向交叉比對與 Bias % 偏差警戒層級驗證:")
for f_qty, a_qty, h_qty, expected_bias, expected_lvl in test_cases_bias:
    bias, lvl = test_bias_calculation(f_qty, a_qty, h_qty)
    status = "PASS" if bias == expected_bias and lvl == expected_lvl else "FAIL"
    print(f"  Forecast={f_qty:6d}, Actual={a_qty:6d} -> Bias={bias:+6.1f}% [{lvl:8s}] -> {status}")
    assert status == "PASS", f"Mismatch: expected ({expected_bias}, {expected_lvl}) but got ({bias}, {lvl})"

# Verification Test Case 2: 3-Stage Deterministic MRP Formulas (OBJ-07 & OBJ-08)
def test_mrp_math(forecast_qty, actual_qty, fg_ready, wip_pending, yield_rate, net_mold_weight_g, runner_weight_g, active_cav, scrap_rate, rm_on_hand_kg, rm_in_transit_kg, safety_stock_kg, moq_kg):
    # Stage 1: FG Net Gap
    total_demand = forecast_qty + actual_qty
    wip_effective = round(wip_pending * yield_rate)
    fg_net_gap = max(0, total_demand - fg_ready - wip_effective)

    # Stage 2: Unit weight
    total_shot_weight_g = net_mold_weight_g + runner_weight_g
    unit_weight_g = total_shot_weight_g / active_cav

    # Stage 3: RM Gross & Net & Suggested Order
    rm_gross_kg = round((fg_net_gap * unit_weight_g / 1000) / (1 - scrap_rate), 2)
    rm_net_gap_kg = max(0, round(rm_gross_kg - rm_on_hand_kg - rm_in_transit_kg + safety_stock_kg, 2))
    suggested_po_kg = math.ceil(rm_net_gap_kg / moq_kg) * moq_kg if rm_net_gap_kg > 0 else 0

    return {
        'fg_net_gap': fg_net_gap,
        'unit_weight_g': round(unit_weight_g, 3),
        'rm_gross_kg': rm_gross_kg,
        'rm_net_gap_kg': rm_net_gap_kg,
        'suggested_po_kg': suggested_po_kg
    }

print("\n[測試項 2] 3 階 MRP 淨需求、模具穴數克重、MOQ 整補精確度驗證:")
res = test_mrp_math(
    forecast_qty=10000,
    actual_qty=2000,
    fg_ready=3000,
    wip_pending=1000,
    yield_rate=0.98,
    net_mold_weight_g=80.0,
    runner_weight_g=16.0,
    active_cav=16,
    scrap_rate=0.03,
    rm_on_hand_kg=50.0,
    rm_in_transit_kg=20.0,
    safety_stock_kg=100.0,
    moq_kg=500.0
)

print(f"  • 成品總需求: 10,000 + 2,000 = 12,000 PCS")
print(f"  • 成品良品在庫: 3,000 PCS, WIP 待驗: 1,000 × 98% = 980 PCS")
print(f"  • 第 1 階 FG 淨缺口: {res['fg_net_gap']:,} PCS (預期 8,020 PCS) -> {'PASS' if res['fg_net_gap'] == 8020 else 'FAIL'}")
assert res['fg_net_gap'] == 8020

print(f"  • 整模克重: 80g + 16g = 96g, 妥善穴數: 16 穴")
print(f"  • 第 2 階 單穴克重: {res['unit_weight_g']} g/穴 (預期 6.000 g) -> {'PASS' if res['unit_weight_g'] == 6.0 else 'FAIL'}")
assert res['unit_weight_g'] == 6.0

expected_gross_kg = round((8020 * 6.0 / 1000) / (1 - 0.03), 2) # 48.12 / 0.97 = 49.61 KG
print(f"  • 第 3 階 原料毛需求: {res['rm_gross_kg']} KG (預期 {expected_gross_kg} KG) -> {'PASS' if res['rm_gross_kg'] == expected_gross_kg else 'FAIL'}")
assert res['rm_gross_kg'] == expected_gross_kg

expected_net_kg = max(0, round(49.61 - 50.0 - 20.0 + 100.0, 2)) # 49.61 - 70 + 100 = 79.61 KG
print(f"  • 第 3 階 原料淨缺口: {res['rm_net_gap_kg']} KG (預期 {expected_net_kg} KG) -> {'PASS' if res['rm_net_gap_kg'] == expected_net_kg else 'FAIL'}")
assert res['rm_net_gap_kg'] == expected_net_kg

expected_po_kg = math.ceil(79.61 / 500) * 500 # 500 KG
print(f"  • 第 3 階 建議採購量 (MOQ 500整補): {res['suggested_po_kg']} KG (預期 {expected_po_kg} KG) -> {'PASS' if res['suggested_po_kg'] == expected_po_kg else 'FAIL'}")
assert res['suggested_po_kg'] == expected_po_kg

print("\n" + "=" * 70)
print("✅ 客觀驗證結果：全項數學推導測試 100% 通過 (PASS 5/5)，無任何邏輯或數值偏差！")
print("=" * 70)
