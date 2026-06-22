---
name: HomeScreen layout
description: HomeScreen was fully redesigned from absolute-positioned layout to ScrollView-based card layout.
---

## The Rule
HomeScreen (artifacts/crewpay/App.tsx, `function HomeScreen`) is now ScrollView-based, NOT absolute-positioned. Background is `#f8f9f4`. 

**Why:** Original layout used `position: 'absolute'` with fixed `top: y(...)` coordinates for every element, making it inflexible and causing clipping. Replaced with a `ScrollView` wrapped in `{activeTab === 'home' ? ... : null}`.

## Structure
- Main container: `<View style={{ backgroundColor: '#f8f9f4', flex: 1 }}>`
- `{activeTab === 'home' ? <ScrollView ...>...</ScrollView> : null}` — new scrollable home content
- `{lastAction ? <Animated.View>...</Animated.View> : null}` — toast (absolute)
- `{activeTab === 'activity' ? <View absolute>...</View> : null}` — activity overlay (absolute, top:0 bottom:y(114))
- `{activeTab === 'settings' ? <HomeSettingsPanel /> : null}` — settings panel (absolute, top:0 bottom:y(104), zIndex:4)
- `{!homeChromeHidden ? <>bottom nav + FAB</> : null}` — nav (absolute, zIndex:8/9)
- Overlays: quickActions, addMoney, topUp (absolute, zIndex 10+)

## ScrollView content (home tab)
1. Header row: role label + switch button + bell icon (inline flex)
2. Sync banner (conditional)
3. Balance/workspace card (white card with shadow, balance + add money button)
4. Stats row: Teams | Tasks | Submissions/Reviews (3 white cards in a row)
5. Action cards grid (2-column, dynamic width)
6. Recent Transactions section (CrewLead only, shows walletTransactions.slice(0,5))
7. Promo slide (crewmate only)
8. Empty state (when !hasTeam)

## How to apply
When adding new home page sections, insert them inside the ScrollView in `{activeTab === 'home' ? ... : null}`. Do NOT use `position: 'absolute'` for new home content elements.
