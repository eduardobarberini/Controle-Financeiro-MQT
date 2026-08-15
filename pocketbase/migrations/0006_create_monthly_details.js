// No-op migration.
// The monthly_details collection is created by 0003_create_monthly_details.js (already applied).
// Recreating it would throw "Collection name must be unique", so this is intentionally empty.
migrate(
  (app) => {
    // intentionally empty — collection already created by 0003
  },
  (app) => {
    // intentionally empty
  },
)
