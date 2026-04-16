# Auto-Learn

`auto-learn` builds and consumes a persisted `UIMap` for Android UI automation.

## Main Concepts

- `UIMap`
  - The persisted learning asset saved under `.ui-tars/app-maps/*.ui-map.v2.json`.
  - Contains pages, regions, elements, navigation edges, and locator strategies.
- `RuntimeMapView`
  - A budget-aware projection derived from `UIMap`.
  - Intended for smaller execution models and prompt injection.

## Main Flow

1. `manager.ts`
   - Orchestrates learning on device screenshots and actions.
2. `tab-learner.ts`
   - Learns persistent navigation targets.
3. `page-learner.ts`
   - Learns interactive elements on a page.
4. `ui-map-sync.ts`
   - Converts learned tab/page artifacts into the primary `UIMap` structure.
5. `runtime-map-view.ts`
   - Builds compact runtime views from a full `UIMap`.
6. `map-context.ts`
   - Extracts navigation subtasks and target labels from `RuntimeMapView`.

## Design Rules

- Internal identity uses stable IDs such as `page_1` and `element_page_1_3`.
- Learned UI labels are stored as data and are never used as internal keys.
- Full maps stay on disk; runtime execution uses `RuntimeMapView`.
- Compatibility code lives under `compat/` and is not part of the primary path.
