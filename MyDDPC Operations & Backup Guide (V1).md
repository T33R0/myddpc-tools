## MyDDPC Operations & Backup Guide (V1)

**Last Updated:** June 02, 2025

**1. Introduction & Purpose**
This guide outlines the standard operating procedures for the MyDDPC (Daily Driven Project Car) platform, covering the technology stack, development workflow, and critical backup strategies. Its purpose is to:
- Provide a clear action plan for the developer to finalize the operational setup.
- Serve as a foundational document for any future team members, ensuring consistency and best practices.
- Ensure the integrity and recoverability of the MyDDPC platform in the event of a incident causing loss of normal operations.

**2. Technology Stack Overview**
- **Hosting Provider:** SiteGround (StartUp)
    - Access: myddpc@gmail.com (Google SSO)
    - Key Features: Daily & Hourly Automated Backups, phpMyAdmin, File Manager, SFTP.
- **Database:** MySQL (Managed via SiteGround > phpMyAdmin)
- **Content Management System (CMS):** WordPress (6.8.1)
    - Admin Access: `myddpc.com/wp-admin`
- **Version Control:** Git, hosted on GitHub
    - Repository URL: `https://github.com/T33R0/myddpc`
    - Primary Branch for Live: `main`
- **Local Development & Code Editing:** Visual Studio Code (VSCode)
- **Documentation & Notes:** Obsidian (Markdown-based, local-first notes).
- **Cloud Storage (for Backups/Files):** `myddpc@gmail.com` Google Drive.

**3. Local Development & Deployment Workflow**
All development of new features, themes, or custom plugin code occurs in VSCode on the developer's local desktop.
- **A. Code Development:**
    1. Create or modify PHP, JS, CSS files in VSCode within your local project directory that mirrors the WordPress structure.
    2. Original/master copies of these developed files are stored on your local desktop.
- **B. Deployment to Live Site (SiteGround):**
    1. **Critical: Before deploying significant changes, perform a Manual Full Backup (see Section 4.C).**
    2. Connect to SiteGround:
        - For individual file changes or quick uploads: Use SiteGround File Manager.
        - For multiple files or larger uploads: ==Use an SFTP client (e.g., FileZilla, Cyberduck) configured with your SiteGround SFTP credentials==.
    3. Upload Files:
        - Carefully navigate to the correct directory within your WordPress installation on SiteGround:
	        - `myddpc.com/public_html/wp-content/themes/grand-sunrise-tt1/`
	        - `myddpc.com/public_html/wp-content/plugins/`:
		        - `myddpc-car-lookup` - lookup tool ==(to be heavily modified/replaced)==
		        - `myddpc-garage` - garage and project builder tool ==(to be replaced)==
        - Upload the new or modified files from your local VSCode project directory, overwriting the existing ones on the server. **Double-check paths.**
        - Document file changes using respective change log (i.e. `plugins-changelog.md`) and follow existing documentation format.
- **C. Testing:**
    1. Immediately after uploading, thoroughly test the changes on the live MyDDPC site in multiple browsers on desktop and phone.
    2. Check for any errors or unexpected behavior.
- **D. Version Control (GitHub):**
    1. Once changes are tested and confirmed functional on the live site, commit them to GitHub from VSCode:
        - Open your project in VSCode.
        - Use the integrated Git features (Source Control panel).
        - Stage the changes.
        - Write a clear, descriptive commit message (e.g., "Feature: Add comparison to Dimensions tool UI").
        - Commit and Push to the `main` branch (or your designated development branch if you adopt one later).

**4. Backup Strategy & Procedures (CRITICAL)**
**Why Full Backups are Essential:** Copying individual files is good for quick rollbacks of specific code but does _not_ protect against database corruption, WordPress core issues, full site compromises, or issues with plugin interactions. A **full backup** includes _all_ WordPress files (core, themes, plugins, uploads) AND your entire MySQL database, ensuring the entire site can be restored to a previous state.

**What Constitutes a MyDDPC Full Backup:**
- **WordPress Files:** All folders and files within your `public_html/` on SiteGround. This includes:
    - WordPress core files.
    - All themes (`wp-content/themes/`).
    - All plugins (`wp-content/plugins/`).
    - Your uploads/media library (`wp-content/uploads/`).
- **MySQL Database:** The entire database used by your WordPress installation, containing all posts, pages, user data, settings, and plugin data.

**A. SiteGround Automated Daily Backups (Primary Safety Net):**
- SiteGround, even at the StartUp plan, automatically creates backups of the site every hour (on the 37-38th minute) and uses the primary 11:XXam as the daily backup.
- Backups are stored for 30 days at this plan level.
- **Scope:** Full site (Files + Database).
**B. Manual Full Backups via SiteGround (Before Major Changes):**
- **Action (Perform as needed, e.g., before launching a new tool):**
    1. Go to SiteGround > Site Tools > Security > Backups.
    2. Under "Create Manual Backup," name the file using proper naming convention (see 4.D).
    3. Click "Create." This backs up both files and the database.
    4. Confirm the backup appears in your list of available backups.
- Download the backup and store locally on developer's desktop (see 4.D).
**C. Comprehensive Off-Site Backups:**
- Using **Updraft Plus - Free Version** sending directly to myddpc@gmail.com Google Drive, automated weekly with a max of 4 stored backups (not including initial manual backup on 02 June 2025, ~390 MB total)
	- backup path is *My Drive > UpdraftPlus* 
**D. Backup Storage & Naming Conventions:**
- **SiteGround:** Managed automatically. Manual backups named descriptively.
- **Google Drive (`myddpc@gmail.com`):**
    - UpdraftPlus: `backup_YYYY-MM-DD-####_CCP_alphanumeric-(db/others/plugins/themes/uploads).zip` (five files total, first manual backup ~390 MB).
    - SiteGround: auto backup uses `10-digit #-8-digit alphanumeric.tar.gz`; if downloaded rename to `MyDDPC_SiteGround_YYYY-MM-DD.tar.gz`.
- **Local Desktop/External Drive:** If you download backups from UpdraftPlus or SiteGround for local archiving, use a file path `Storage (F:) > MyDDPC Site Backups`.
==**E. Restore Testing (Future Action - Critical):**
- Once the SiteGround plan is upgraded with staging, schedule a quarterly test:
    1. Take a full off-site backup (e.g., from Google Drive via UpdraftPlus).
    2. Restore it to your staging environment.
    3. Thoroughly test site functionality.
- **Purpose:** To ensure your backups are complete, functional, and that you are comfortable with the restore process.

**5. Version Control (GitHub Workflow)**
- **Branching:** For now, `main` branch is used for live, reflecting your current direct-to-live deployment. Each specific focus/plugin/tool has a `develop` branch for larger features; use before merging to `main`.
- **Commits:**
    - Commit frequently after deploying and testing functional units of code.
    - Use descriptive commit messages (e.g., "Fix: Corrected horsepower display on Dimensions tool H2H view").
    - All commits are done via VSCode's GitHub integration.
	    - If unable to commit through VSCode, alternative commit platforms could be through the GitHub Window App or directly through the GitHub website.

**6. Credentials Management**
- **Secure Storage:** All critical credentials (SiteGround login, WordPress Admin, `myddpc@gmail.com`, GitHub, SFTP) are stored in the Google Password Manager for both `teehanrh@gmail.com` and `myddpc@gmail.com`. The intent is to create redundancy by having both managers hold credentials for both profiles. Additionally, important or less frequently used credentials are stored in Obsidian: [MyDDPC Credentials](ddpc_credentials.md).
- **Documentation:** This document will _not_ contain passwords. It will only reference the _location_ of secure storage.

**7. Key Configurations & Notes (Managed in Obsidian)**
- Maintain notes in the Obsidian vault for:
    - Specific WordPress settings critical to MyDDPC (e.g., permalink structure, reading/writing settings).
    - List of essential [active plugins](ddpc_all_tools) and their purpose/key configurations.
    - Locations and descriptions of [custom PHP/JS/CSS code snippets](ddpc_custom_code_snippets.md).
    - [Database schema](ddpc_db_schema.canvas) notes or diagrams relevant to custom tables (if any).
    - Notes on API keys or third-party service integrations (store actual keys in your password manager).

**8. Troubleshooting Quick Reference**
- **SiteGround Cache:** Clear via SG Optimizer plugin > Caching > Purge SG Cache.
- **WordPress Errors:**
    - Enable `WP_DEBUG` in `wp-config.php` for detailed error messages (set to `false` on live unless actively debugging).
    - Check PHP error logs via SiteGround > Site Tools > Statistics > Error Log.
    - Standard WordPress troubleshooting: Deactivate plugins one-by-one, switch to a default theme.
- **Contact Support:**
    - SiteGround Support: [Link to SiteGround Support Portal]
    - WordPress.org Forums/Codex: [dev.wordpress.org]