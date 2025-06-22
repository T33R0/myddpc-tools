# MyDDPC User System

A complete user account system for the My Daily Driven Project Car (MyDDPC) platform. This WordPress plugin provides secure, scalable user registration, account management, saved items, and custom roles, all using best practices and custom database tables.

## Features
- Custom database tables for saved items and user activity
- Custom user role: Garage Member
- AJAX-powered item saving, deletion, and account updates
- Shortcode-based user account page with router
- Upgrade banner for upsell
- Secure, extensible, and follows WordPress standards

## Installation
1. Upload `myddpc-user-system.php` and `myddpc-ajax-handler.js` to your WordPress plugins directory.
2. Activate the plugin from the WordPress admin dashboard.
3. The plugin will automatically create the required database tables and roles on activation.

## Usage
- Add the shortcode `[myddpc_account_page]` to any page to display the user account system.
- The account page includes:
  - **Saved Items**: View, and delete saved research/tools/items.
  - **Account Settings**: Change display name and password.
  - **Upgrade Banner**: Promotional banner for upsell.

### Shortcodes
- `[myddpc_account_page]` — Renders the full user account page. Supports `?view=saved_items` and `?view=account_settings` via URL query parameter.

## AJAX Endpoints
- `myddpc_save_item` — Save a new item (requires login and capability).
- `myddpc_delete_item` — Delete a saved item (requires login and ownership).
- `myddpc_update_account_settings` — Update display name or password (requires login).

All AJAX requests require a valid nonce, passed via the localized JS object `myddpc_ajax_data`.

## Developer Notes
- Custom tables: `wp_myddpc_saved_items`, `wp_myddpc_user_activity`
- Custom role: `myddpc_garage_member` (capabilities: `can_access_garage`, `can_customize_tools`)
- Adds `can_save_items` capability to the `subscriber` role
- All code is self-contained in the plugin file for easy maintenance

## Security
- All AJAX endpoints require a valid nonce and user authentication
- Capability and ownership checks are enforced on all data operations

## Extending
- Add new item types or views by expanding the router and item type logic
- Style the output using custom CSS classes prefixed with `myddpc-`

---
For support or feature requests, contact the MyDDPC team. 