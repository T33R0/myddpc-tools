wp-content/
└── plugins/
    └── [00] myddpc-discover/
        ├── myddpc-discover.php
        ├── README-discover-tool.md                  ← Basic description + installation instructions
        ├── includes/
        │   ├── class-discover-query.php
        │   ├── class-discover-rest.php
        │   └── templates/
        │        └── template-discover-page.php
        ├── assets/
        │   ├── css/
        │   │   └── discover.css
        │   └── js/
        │        └── discover.js
        └── uninstall.php               ← Cleanup (if needed)

**Notes on structure:**
- `myddpc-discover.php`: Main plugin file that registers hooks, shortcodes, enqueues assets, and registers REST routes.
- `includes/class-discover-query.php`: PHP class responsible for building/sanitizing SQL queries based on filter inputs and returning result sets.
- `includes/class-discover-rest.php`: PHP class that registers REST API endpoints (`/myddpc/v1/discover/filters` and `/myddpc/v1/discover/results`) and routes requests to `class-discover-query`.
- `includes/templates/template-discover-page.php`: Template markup for the Discover page: sidebar container for filters + main container for results table and pagination controls.
- `assets/css/discover.css`: Minimum styling for 20%/80% two-column layout, filter inputs, table, modal popup, and basic responsive adjustments.
- `assets/js/discover.js`: Frontend logic to (a) fetch filter‐options (via REST), (b) send filter‐values to REST endpoint for results, (c) render the results table (limit 50 rows), (d) handle user interactions (changing filters, selecting row count, opening a detail popup, etc.).
- `uninstall.php`: (Optional) Clean up plugin-specific tables or stored options if the plugin is ever removed.