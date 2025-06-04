# myddpc-tools
# MyDDPC (Daily Driven Project Car) - Tools & Platform

MyDDPC is an online platform designed to help car enthusiasts discover the right vehicles and meticulously manage their automotive projects. It offers free, powerful tools for targeted vehicle discovery, detailed dimensional analysis, and performance comparisons. A premium 'MyDDPC Garage' tier will allow users to centralize their research, input custom data, manage detailed build lists, and connect with automotive resources.

**Current Status:** Actively developing new core tools: Discover, Dimensions, Performance/Efficiency. Revamping the existing platform with a focus on a streamlined, robust foundation.

## Core Technology Stack

* **Backend:** WordPress, PHP, MySQL
* **Frontend:** JavaScript, HTML, CSS
* **Hosting:** SiteGround
* **Version Control:** Git, GitHub (this repository)

## Key Documentation

For detailed operational procedures, backup strategies, and development workflows, please refer to the:
* **[MyDDPC Operations & Backup Guide (V1)](./docs/MyDDPC_Operations_And_Backup_Guide_V1.md)**

## Development Workflow

1.  **Local Development:** All plugin code is developed locally in Visual Studio Code (VSCode).
2.  **Deployment:** Changes are deployed directly to the live SiteGround environment via SFTP or SiteGround's File Manager.
3.  **Version Control:** All functional changes and updates are committed to this GitHub repository directly through VSCode's Git integration. The `main` branch reflects the current state of the code intended for the live environment.

## Repository Structure: WordPress Plugins

This repository primarily contains the custom WordPress plugins that power the MyDDPC platform. The structure within `wp-content/plugins/` is as follows:

wp-content/
└── plugins/
├── myddpc-car-lookup/        # Directory for "MyDDPC Car Lookup" plugin
│   ├── myddpc-car-lookup.php # Main plugin file
│   ├── includes/             # Optional: For PHP include files
│   └── assets/               # For CSS, JavaScript, images
│       ├── css/
│       │   └── car-lookup.css
│       ├── js/
│       │   └── car-lookup.js
│       └── images/
│           ├── placeholder.png
│           └── placeholder-uncropped.png
│
├── myddpc-garage/            # Directory for "MyDDPC Garage Manager" plugin
│   ├── myddpc-garage.php     # Main plugin file
│   ├── includes/             # Optional: For PHP include files
│   └── assets/               # For CSS, JavaScript
│       ├── css/
│       │   └── myddpc-garage-style.css
│       └── js/
│           ├── build-list.js
│           ├── garage-form.js
│           └── myddpc-garage-common.js
│
└── index.php                 # Standard empty PHP file to prevent directory listing


**Key Plugin Components:**

* **`plugin-name/`**: Each plugin resides in its own folder (e.g., `myddpc-car-lookup/`, `myddpc-garage/`).
* **`plugin-name.php`**: The main executable file for the plugin, containing the plugin header information and primary PHP code.
* **`includes/`**: (Optional) Used to organize PHP files, such as classes, functions, or template parts.
* **`assets/`**: Used to store static files like CSS stylesheets, JavaScript files, and images.
    * **`css/`**: For CSS files.
    * **`js/`**: For JavaScript files.
    * **`images/`**: For image files.
* **`index.php`**: An empty PHP file (`<?php // Silence is golden. ?>`) placed in directories (like `wp-content/plugins/`) to prevent direct browser access and directory listing if web server indexing is enabled.

## Database Structure (Production - SiteGround MySQL)

The MyDDPC platform utilizes a MySQL database hosted on SiteGround. The live WordPress installation uses a table prefix of `qfh_`. Custom plugins should be developed to use the WordPress `$wpdb->prefix` global variable to ensure compatibility (e.g., `$wpdb->prefix . 'vehicle_data'`).

Key custom tables currently in use on the production database include:

* **`qfh_vehicle_data`**: Stores detailed vehicle specifications for lookup.
* **`qfh_vehicle_images`**: Stores paths or URLs for vehicle stock images.
* **`qfh_user_garage`**: Stores users' saved vehicles (linked to their WordPress user ID).
* **`qfh_user_garage_builds`**: Stores build-list entries for vehicles in a user's garage.
* **`qfh_modification_categories`**: Defines categories for build-list items.

Schema details and any future modifications will be documented as needed within project tasks or specific design documents. Regular full-site backups (including the database) are managed as per the [Operations & Backup Guide](./docs/MyDDPC_Operations_And_Backup_Guide_V1.md).

---