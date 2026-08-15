// No-op migration.
// The original seed data is created by 0002_seed_initial_data.js (already applied).
// This file exists only to clear a pending-retry artifact from a prior build cycle.
migrate(
  (app) => {
    // intentionally empty — seeding already handled by 0002
  },
  (app) => {
    // intentionally empty
  },
)
