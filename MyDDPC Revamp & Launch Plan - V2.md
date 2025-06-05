## MyDDPC Revamp & "MyDDPC Garage" Launch Plan - V2

**Target Launch Date (Paid Version): July 1st, 2025**
This plan outlines the sequential phases and key deliverables to revamp the car lookup tool and launch the "MyDDPC Garage" paid tier. It incorporates considerations for minimizing rework, phased design, live development, informal testing, and clear project communication.
### Project Overview & Feature Descriptions

**Project Summary:** The MyDDPC Revamp project aims to transform the existing car lookup tool into a multi-functional platform for automotive enthusiasts. It will introduce three core free tools: "Discover" (for finding vehicles based on qualities), "Dimensions" (for vehicle size and fitment analysis), and "Performance/Efficiency" (for power and economy insights). Users can create free accounts to save their findings. These tools will converge into a premium paid service, "MyDDPC Garage," allowing users to input personal data (like garage dimensions), manage modified vehicle builds, project impacts of changes, and connect with resources like shops and suppliers. The goal is to launch the paid version by July 1st, 2025.

### Core Tool/Feature Descriptions
1. [**Discover Tool (Free)**](ddpc_tool_discover_v1.md)
    ### Discover Tool

    **Query:** "I need a vehicle that..."

    **Function:** Helps users who know desired vehicle qualities but not specific models. Provides a filtered lookup producing a table of vehicles matching selected attributes (e.g., RWD, V8, seats 4, good cargo space).

    **What:** This tool would allow users to search and filter the entire database of over 73,000 vehicle trims from 1990-2025 based on specific technical characteristics and configurations available within the 121 columns of data. It moves beyond traditional browsing by make, model, or year to find vehicles based purely on desired attributes like drivetrain type (RWD), engine configuration (V8), passenger capacity (seats 4), and cargo space dimensions (if available in the data). The output is a list or table of vehicles that match all selected criteria.

    **Why:** Enthusiasts often have specific technical needs or preferences when looking for a vehicle, whether for a daily driver, a project car, or a potential modification platform. They might be interested in discovering vehicles that share a desirable characteristic like a specific engine type, drivetrain layout, or physical dimension that makes it suitable for a particular purpose or modification. This tool empowers them to explore the entire market based on these technical criteria.

    **Problem:** Finding vehicles based on detailed, specific technical attributes across different makes, models, and decades is extremely difficult using existing, standard browsing or search methods. While some forums or websites might discuss specific platforms, there isn't a centralized, comprehensive database covering 35 years of vehicles sold in the US (larger year range and additional markets to come) that allows users to filter by a wide array of detailed technical specs simultaneously. The current landscape is fragmented, making this kind of in-depth, cross-model discovery challenging.

    **Solution:** The database (`qfh_vehicle_data`) provides the centralized, structured source for the detailed production specifications (121 columns) across a vast range of vehicles and years. The "Discover" tool leverages this depth and breadth by building a sophisticated search and filtering interface on top of the database. This allows users to query the data based on any combination of available attributes in your 121 columns, effectively unlocking the database for niche or specification-driven discovery that is not well-supported by existing tools.

    **Implementation:** Requires accessing and exposing the detailed technical specification data from the 121 columns to a user interface. Building a robust search and filtering engine that can handle queries across multiple attributes and return results in a structured format (like a table).

    **Sample I/O:** User selects 2dr, AWD, European/German; table produces Audi TT, A5, S5, BMW M235, etc.

    **Tool UI:** The top of the page is a header, left side of the page (20%) has filter options, body (80%) has vehicles shown in a table which will default to display the database unfiltered and should only show a max of 50 rows (with options for user to choose 10, 25, or 50); the table rows will reduce down as the user selects filters, then expand back as the user deselects filters. Users can click on a vehicle to bring a popup that shows an image and the same information in a more visually appealing format; maybe includes a description or analysis (what the vehicle is best known for, or modification friendly, etc.); provides option to save the vehicle (when signed in).

    **Considerations:** Some filters may need to be ranges; pulling from the full db with a responsive table could be demanding (but limiting the row count could mitigate, maybe limit to one page too); some info is valuable to display but shouldn't be used as a filter (i.e. Trim, as that would be dependent on the YMM and not a quality people will use to discover a vehicle), this just means we'll need to map info that isn't a filtering option; 

    ---
    ### Recommended Data Points (Filters) for "Discover" Tool

    The column names are taken directly from the "full teoalida columns and types.txt".

    **1. Basic Vehicle Identifiers & Type:** * `Year` (Range filter) * `Country of origin` (Multi-select filter; e.g., USA, Japan, Germany, Europe/France, Europe/Germany, Asia/Japan etc. as seen in your screenshot ) * `Body type` (Multi-select filter; e.g., Sedan, Coupe, SUV, Truck, Hatchback, Convertible, Van) * `Car classification` (Multi-select filter; e.g., Mid-Size Cars, Small Sport Utility Vehicles. This can complement `Body type`)

    **2. Performance & Drivetrain Characteristics:** * `Drive type` (Multi-select filter; RWD, FWD, AWD, Four Wheel Drive etc.) * `Transmission` (Multi-select filter; Manual, Automatic, Automated Manual, CVT etc.) * `Cylinders` (Multi-select/Range filter; e.g., 3, 4, 5, 6, 8, 10, 12) * `Engine size (l)` (Range filter; e.g., 1.0 - 8.0L) * `Horsepower (HP)` (Range filter; e.g., 100 - 700+ HP) * `Torque (ft-lbs)` (Range filter; e.g., 100 - 700+ ft-lbs) * `Curb weight (lbs)` (Range filter; relevant for performance and handling)

    **3. Practicality, Size & Utility:** * `Doors` (Multi-select filter; e.g., 2, 3, 4, 5) * `Total seating` (Multi-select/Exact number filter; e.g., 2, 4, 5, 7+) * `Cargo capacity (cu ft)` (Range filter; for primary cargo space) * `Maximum towing capacity (lbs)` (Range filter; useful for trucks/SUVs) * `Ground clearance (in)` (Range filter; for practicality or off-road suitability)

    **4. Fuel & Efficiency:** * `Fuel type` (Multi-select filter; e.g., Gasoline, Diesel, Electric, Hybrid, Flex-fuel) * `EPA combined MPG` (Range filter; for gasoline/diesel/hybrid vehicles) * `EPA electricity range (mi)` (Range filter; specifically for Electric Vehicles. Note its lower data completion of 2.28%, so manage user expectations if this filter yields few results initially)
    ### Spec List for "Discover" Tool Filters

    Here are the exact column names from the `full teoalida columns and types.txt` file corresponding to the recommended filters:

    - `Year` (100%)
    - `Make` (100%)
    - `Model` (100%)
    - `Trim` (100%) - display only
    - `Platform code / generation` (100%)
    - `Country of origin` (100%)
    - `Body type` (100%)
    - `Car classification` (100%)
    - `Drive type` (100%)
    - `Transmission` (99.29%)
    - `Cylinders` (98.45%)
    - `Engine size (l)` (98.45%)
    - `Horsepower (HP)` (99.67%)
    - `Torque (ft-lbs)` (98.09%)
    - `Curb weight (lbs)` (89.73%)
    - `Doors` (100%)
    - `Total seating` (82.74%)
    - `Cargo capacity (cu ft)` (65.91%)
    - `Maximum towing capacity (lbs)` (55.58%)
    - `Ground clearance (in)` (64.82%)
    - `Fuel type` (99.98%)
    - `EPA combined MPG` (83.16%)
    - `EPA city/highway MPG` (83.07%)
    - `Range in miles (city/hwy)` (98.45%)
    - `EPA combined MPGe` (2.28%)
    - `EPA city/highway eMPG` (2.13%)
    - `EPA electricity range (mi)` (2.03%)
    - `EPA kWh/100 mi` (1.88%)
    - `EPA time to charge battery (at240V) (hr)` (1.96%)
    - `Battery capacity (kWh)` (1.27%)

2. [**Dimensions Tool (Free)**](ddpc_tool_dimensions_v1.md)
    ## Dimensions Tool
    [[ddpc_site_dimensions]]

    **Query:** "Will this vehicle fit in my garage?" or "How does this vehicle handle in parking lots?" or "Do I need to worry about speed bumps in this vehicle?"

    **Function:** Provides detailed vehicle dimension specifications (length, width, height, wheelbase, track, turning radius, approach/departure angles). Includes practical insights for real-world scenarios like speed bumps and parking spaces. Features a head-to-head comparison for two vehicles.

    **What:** This tool would access and display the detailed external dimensions for any selected vehicle year/make/model/trim from your database. It would provide key measurements like length, width, height, wheelbase, track width, and turning radius. The database includes data like ground clearance or approach/departure angles, so these would also be displayed. The tool could include interpretations relevant to practical scenarios like clearing speed bumps (using ground clearance) or fitting into standard parking spots (using length/width) or fitment in the user's garage. A head-to-head comparison feature would display these dimensions side-by-side for two chosen vehicles.

    **Why:** A significant, practical pain point for car owners is determining whether a vehicle will physically fit in their garage, parking space, or navigate common driving obstacles. This is a real and frustrating problem for homeowners, as evidenced by sources discussing garage size planning and storage solutions, especially those with multiple vehicles, track vehicles, and/or home shops. People often research vehicles extensively but face uncertainty about practical physical fitment.

    **Problem:** While vehicle dimensions are published, there isn't a readily available tool that centralizes this detailed dimensional data for over 73,000 specific trims from 1990-2025. More importantly, existing tools that cover vehicle shopping or ownership costs typically do not focus on specific physical fitment based on detailed dimensions from a vast, searchable database. Users have to look up dimensions piecemeal and mentally try to visualize fitment.

    **Solution:** The database (`qfh_vehicle_data`) provides the comprehensive source of detailed dimension data across a wide range of vehicles and years. The Dimensions tool leverages this data to provide centralized access to these critical measurements. The comparison feature allows for easy side-by-side review of dimensions. Adding practical insights based on these numbers directly addresses real-world concerns. The tool sets up the call for a user to create a premium account where they can input custom garage dimensions to see a personal application.

    **Implementation:** Requires accessing and displaying dimension-related data points. Developing an interface to display these specs clearly and building the head-to-head comparison logic. Incorporating practical context based on the data.

    **Sample I/O:** User inputs YMMT, output are dimension stats with some present definitions for angle of approach, diagrams for parking space, street-side parking, and u-turn radius.

    **Tool UI:** (Adjust wireframe to match this description) Top of the page is a header, top of body is a YMM selector section (with option to select a previously saved vehicle) followed by H2H option with second vehicle's sections appearing alongside. Next body shows (from top to bottom) vehicle YMMT, picture, dimensions & measurements & angle of approach (angle over speedbumps, slow over speedbumps, no major clearance considerations, off-road ready), followed by three diagrams: one overhead that shows width and length with a rectangle around it with some padding to consider a standard parking space, the space shows how much extra room surrounds the vehicle; the second shows side profile (length) with barriers front and rear (to simulate street-side parking); third is another overhead that demonstrates a turning radius in a typical two-lane road (u-turn-ability). Users have the ability to save one or both vehicle specs to their garage (when signed in).

    **Considerations:** The parking footprint, street-side, and turning radius diagrams should be the same structure and fixed in place, then the selected vehicle and measurements overlayed (this demonstrates a fixed size for parking and turning, then changes the size of the vehicle relative to the user selected options); we'll use standard graphics for each body type (coupe, sedan, suv, truck, etc.) to show custom adaption without having to have each real vehicle formatted (we can fix this later based on demand and feasibility).

    ---
    ### Recommended Data Points for "Dimensions" Tool

    These are the core external dimensions crucial for fitment and practical maneuverability. The column names are from your `full teoalida columns and types.txt` file.

    **Primary Dimensions to Display:**

    - `Length (in)`
        
    - `Width (in)` (Note: Be mindful if Teoalida's definition for this column includes or excludes mirrors. Your user description mentioned "Width (excluding mirrors)", so clarify this from the data source if possible.)
        
    - `Height (in)`
        
    - `Wheelbase (in)`
        
    - `Ground clearance (in)` (Essential for speed bumps, driveway angles)
        
    - `Turning circle (ft)` (Note: This is typically the diameter. Turning _radius_ would be half this value. The column name is "Turning circle")
        
    - `Angle of approach (degrees)` (Use with caution due to lower data completion - 29.08%)
        
    - `Angle of departure (degrees)` (Use with caution due to lower data completion - 29.08%)
        

    **Supporting/Contextual Data (Consider displaying alongside primary dimensions):**

    - `Doors` (Number of doors can be a quick reference, e.g., longer doors on coupes need more side clearance)
        
    - `Front track (in)` (Lower data completion - 37.70%)
        
    - `Rear track (in)` (Lower data completion - 37.59%)
        

    ### Spec List for "Dimensions" Tool Data

    For your direct reference when building the tool, these are the exact column names with percentage of collected data:

    - `Year` (100%)
    - `Make` (100%)
    - `Model` (100%)
    - `Trim` (100%)
    - `Platform code / generation` (100%)  - display only
    - `Country of origin` (100%) - display only
    - `Body type` (100%) - display only
    - `Car classification` (100%) - display only
    - `Length (in)` (99.64%)
    - `Width (in)` (97.17%)
    - `Height (in)` (98.50%)
    - `Wheelbase (in)` (99.77%)
    - `Ground clearance (in)` (64.82%)
    - `Turning circle (ft)` (85.94%)
    - `Angle of approach (degrees)` (29.08%)
    - `Angle of departure (degrees)` (29.08%)
    - `Doors` (100%)
    - `Front track (in)` (37.70%)
    - `Rear track (in)` (37.59%)

3. [**Performance/Efficiency Tool (Free)**](ddpc_tool_performance_v1.md)
    ## Performance & Efficiency Tool
    [[ddpc_site_performance]]

    **Query:** "Is this a good commuter?" or "How powerful is this vehicle?" or "Can I tow with this vehicle?"

    **Function:** Displays a vehicle's specifications with graphs related to power (horsepower, torque), acceleration, and fuel economy. Features a user-selectable head-to-head option comparison for two vehicles.

    **What:** This tool would extract and present key performance and efficiency metrics for any selected known vehicle (year/make/model/trim). This includes displaying horsepower (HP) and torque figures, and fuel economy ratings (City, Highway, Combined MPG). It could visualize these metrics using graphs or charts to show trends (e.g., efficiency vs. weight) or compare performance envelopes. A head-to-head comparison feature would allow users to directly compare these specs for two vehicles. While acceleration (like 0-60 times) is a common performance metric, if it's not directly in the database, the tool would rely on correlating HP, Torque, Weight, and potentially drivetrain/transmission data (calculator on carspecs.us).

    **Why:** Automotive enthusiasts and typical car buyers alike are interested in a vehicle's power and efficiency. Performance metrics are central to the enthusiast experience, while fuel economy is a key consideration for commuters and those concerned about usage costs. People often weigh the trade-offs between performance and efficiency based on the user's need and intended use for the vehicle. Understanding "how powerful" a car is (HP/Torque) and its efficiency ("good commuter") are fundamental questions.

    **Problem:** While performance and fuel economy data are available on various sites, there isn't always a tool that clearly visualizes or explains the relationship between a vehicle's specific production specifications and both its performance and fuel economy side-by-side across a large, historical dataset. It can be difficult for users to see, for example, how a change in engine size or vehicle weight directly impacts both HP/Torque and MPG across different trims or model years.

    **Solution:** The database (`qfh_vehicle_data`) contains the specific performance (HP, Torque), weight, engine, drivetrain, transmission, and fuel economy data points for over 73,000 trims. The Performance/Efficiency tool leverages this data to present these crucial metrics clearly. Using graphs and comparisons, it can provide data-backed insights into the engineering trade-offs inherent in each vehicle's design and how the combination of specs translates into performance versus efficiency, filling a gap in readily available visualized data.

    **Implementation:** Requires selecting the relevant data points (HP, Torque, Weight, Engine size/type, Transmission type, MPG) from the database. Building an interface to display these numbers and create visualizations (graphs, charts) for a single vehicle or for comparison between two vehicles.

    **Sample I/O:** Users select YMMT drivetrain and transmission type (option for two vehicles head-2-head); output is first performance focused with hp, hp rpm, tq, tq rpm, engine displacement, cylinders, cams, valves, valve timing, weight, 0-60 (calculated), then efficiency stats (adapted for engine type: ICE or electric) like fuel type, city/hwy mpg, est fuel range; below that is a graph representation of power vs efficiency demonstrating the relationship (not yet sure how to display).

    **Tool UI:** (Adjust the wireframe to match this description) The top of the page is a header, left side (20%) has YMMTDtTx selectors (with an option to select a previously saved vehicle) followed by H2H option with the second vehicle's selections appearing below (with an additional option to select a saved vehicle); body (80%) shows (from top to bottom) vehicle YMMT, picture, power specs, efficiency specs, then graphical representation. H2H splits the specs portion of the body 50:50, but shares the same graph with both vehicles being represented on the same graph. Users have the ability to save one or both vehicle specs to their garage (when signed in).

    **Considerations:** Will likely need to calculate 0-60 (what is needed to most accurately calculate this? pre-calc in db or on the fly?); what other performance/efficiency stats are valuable and can be shown/calculated from the given data? Need to adapt the field labels based on fuel type (ICE or EV). Optimize responsiveness for desktop. mobile, tablet.

    ---
    ### Recommended Data Points for "Performance/Efficiency" Tool

    These specs will provide a comprehensive overview of a vehicle's power, drivetrain, and fuel consumption characteristics. Column names are from your `full teoalida columns and types.txt`.

    **1. Engine & Power Specifications:**

    - `Engine size (l)`
    - `Cylinders`
    - `Cam type` (e.g., DOHC, SOHC - provides context)
    - `Horsepower (HP)`
    - `Horsepower (rpm)` (to show where peak HP occurs)
    - `Torque (ft-lbs)`
    - `Torque (rpm)` (to show where peak torque occurs)
    - `Curb weight (lbs)` (Useful for inferring power-to-weight, though we won't calculate it in V1 display)

    **2. Drivetrain Specifications:**

    - `Drive type`
    - `Transmission`

    **3. Fuel & Efficiency (for ICE - Internal Combustion Engine & Hybrids):** (Display this section if `Fuel type` is Gasoline, Diesel, Hybrid, Flex-fuel etc.)

    - `Fuel type`
    - `EPA combined MPG`
    - `EPA city/highway MPG` (e.g., display as "25 City / 35 Hwy MPG")
    - `Fuel tank capacity (gal)`
    - `Range in miles (city/hwy)` (e.g., display as "300 City / 420 Hwy miles")

    **4. Energy & Efficiency (for EV - Electric Vehicles):** (Display this section if `Fuel type` is Electric. Note the lower data completion for some EV fields.)

    - `Fuel type` (will show as "Electric")
    - `EPA combined MPGe`
    - `EPA city/highway MPGe` (e.g., display as "110 City / 98 Hwy MPGe")
    - `EPA electricity range (mi)`
    - `EPA kWh/100 mi` (A direct measure of electric efficiency)
    - `Battery capacity (kWh)`
    - `EPA time to charge battery (at 240V) (hr)`

    ### Spec List for "Performance/Efficiency" Tool Data

    For your direct reference when building here are the exact column names with percentage of collected data:

    - `Year` (100%)
    - `Make` (100%)
    - `Model` (100%)
    - `Trim` (100%)
    - `Platform code / generation` (100%)  - display only
    - `Country of origin` (100%) - display only
    - `Body type` (100%) - display only
    - `Car classification` (100%) - display only
    - `Drive type` (100%) - display only
    - `Transmission` (99.29%) - display and 0-60mph calc
    - `Cylinders` (98.45%) - display only
    - `Engine size (l)` (98.45%) - display only
    - `Cam type` (81.25%) - display only
    - `Valves` (81.25%) - display only
    - `Valve timing` (62.60%) - display only
    - `Horsepower (HP)` (99.67%) - display and 0-60mph calc
    - `Horsepower (rpm)` (96.78%) - display only
    - `Torque (ft-lbs)` (98.09%) - display only
    - `Torque (rpm)`(96.02%) - display only
    - `Curb weight (lbs)`(89.73%) - display and 0-60mph calc
    - `Fuel type` (99.98%) - display only
    - `EPA combined MPG` (83.16%) - display only
    - `EPA city/highway MPG` (83.07%) - display only
    - `Range in miles (city/hwy)` (98.45%) - display only
    - `Fuel tank capacity` (97.52%) - display only
    - `EPA combined MPGe` (2.28%) - display only
    - `EPA city/highway eMPG` (2.13%) - display only
    - `EPA electricity range (mi)` (2.03%) - display only
    - `EPA kWh/100 mi` (1.88%) - display only
    - `EPA time to charge battery (at240V) (hr)` (1.96%) - display only
    - `Battery capacity (kWh)` (1.27%) - display only

4. [**User Accounts & Saving (Free)**](ddpc_tool_user_accounts_v1.md)
    **Function:** Allows users to create a free account to save vehicles, search results from the tools, and eventually, their "MyDDPC Garage" data. Login is required to save any information.

5. [**MyDDPC Garage (Paid Tier)**](ddpc_tool_my_garage_v1.md)
    ## My Garage Tool
    [[ddpc_site_my_garage]]

    **Function:** A premium subscription service where users can:
        - Save information from the free tools.
        - Input and save their personal garage dimensions.
        - "Claim" vehicles and modify their specifications to track builds.
        - Create and manage build lists (parts, modifications).
        - Project potential impacts of vehicle changes (MVP: manual spec adjustment).
        - Access curated lists and connections to shops, part suppliers, tools, and guides.

    **What:** This paid tier offers a personalized dashboard and management system centered around the user's specific vehicle(s) [user function]. It allows users to save the detailed specification data obtained from the free tools [user function], providing a personal archive of their research. Users can input and save dimensions of their actual garage or parking spaces [user function], directly tying into the pain point addressed by the Dimensions Tool1.... The "claim" feature allows users to select vehicles they own or are working on from your database and customize their specifications, reflecting modifications or wear [user function]. Users can then create and manage lists of parts used and modifications applied [user function]. A key feature is the ability to project potential impacts of changes (initially via manual spec adjustment, potentially expanding later) [user function], linking modified specs back to anticipated performance or efficiency changes (drawing on the concepts from the Performance/Efficiency tool)8.... Finally, it provides curated lists and connections to relevant external resources like trusted shops, parts suppliers, tools needed for maintenance/mods, and guides [user function, 19, 23, 24, 64, 65, 59, 60, 61, 62].

    **Why:** Automotive enthusiasts require tools to manage information about their specific vehicles and projects [implied by mod discussions, build threads, maintenance logs 17, 18, 19, 20, 49, 50, 53, 54, 56, 57, 60, 61, 62, 65]. Tracking modifications, parts used, and the specific state of their modified vehicle (by adjusting specs from stock) is a core activity [implied by tuning/mod guides 7, 8, 9, 10, 11, 12, 36, 44, 46, 60, 61, 62, 65]. Managing personal garage dimensions provides a valuable, practical reference1.... Access to curated resources helps users find the information and services they need within a fragmented automotive landscape3..., addressing pain points related to finding reliable shops or parts3....

    **Problem:** While tools exist for maintenance tracking6... or finding parts/shops individually7..., there isn't a centralized platform that allows enthusiasts to integrate detailed base vehicle specifications (from a comprehensive database like yours) with their personal modifications, physical space constraints (garage dimensions), and relevant external resources [implied by fragmentation 59, 60, 65]. Tracking the impact of modifications is complex and often relies on fragmented info or costly dyno testing; a tool allowing any level of impact projection based on modified specs is a gap [implied by tuning complexity 7, 8, 9, 10, 11, 12]. Managing a build list and accessing correlated resources in one place addresses fragmentation3....

    **Solution:** The MyDDPC Garage provides a premium, integrated solution that builds upon the value offered by your free tools [user function]. By allowing users to save data, input personal constraints (garage size), and modify vehicle specs [user function], it creates a personalized digital twin of their vehicle within the context of their own physical environment [implied by user function]. The ability to track modifications and build lists [user function] leverages the underlying vehicle data from your database [your query]. Projecting impacts, even manually adjusting specs, provides a unique simulation capability linked to the detailed data [user function, 54, 57]. Curating resources directly combats the fragmentation of finding shops, parts, and guides3..., positioning the tool as a central hub for managing an enthusiast's vehicle life [implied by comprehensive features].

    **Implementation:** Requires building a user account system, implementing database features for saving user data (saved vehicles, garage dimensions, modified specs, build lists), developing an interface for editing specs and managing lists, adding logic for basic impact calculation based on manually adjusted specs (drawing on formulas related to HP, Torque, Weight, etc., possibly from sources like35), and building a system to curate and link external resources3....

    ---

    ### Key Features & Managed Data for "MyDDPC Garage"

    This outlines what users can do and what information will be stored and managed within their personal Garage.

    1. **Personalized Dashboard:**
        - Overview/summary of "My Vehicles."
        - Display of saved "My Garage Dimensions."
        - Quick access to "Saved Research" (from free tools).
        - Entry points to "Build Lists" and the "Resource Hub."
    2. **Saved Research Management:**
        - A consolidated view of all vehicles, comparisons, and search results saved from the "Discover," "Dimensions," and "Performance/Efficiency" tools.
        - Ability to organize or delete saved items.
    3. **"My Garage Dimensions" Management:**
        - User input fields for:
            - Garage Name/Label (e.g., "Main Garage," "Workshop Bay")
            - Length (e.g., inches/feet or cm/meters)
            - Width
            - Height
            - Door Opening Width
            - Door Opening Height
            - Notes (e.g., "Sloped floor," "Post in middle")
        - Storage and display of these dimensions.
    4. **"My Vehicles" (Claimed/Owned Vehicles):**
        - A list/gallery of vehicles the user designates as theirs.
        - For each vehicle:
            - **Base Data:** Inherited stock specifications from the main MyDDPC database.
            - **Custom Nickname/Label:** e.g., "Project Z3," "Daily S6."
            - **Status:** e.g., "Current Project," "Daily Driver," "Future Build," "Sold."
            - **User-Uploaded Photos:** A gallery for their specific car.
            - **Modified Specifications:**
                - Ability for users to edit key performance and dimension specs (e.g., Horsepower, Torque, Weight, Suspension Height, Wheel/Tire Sizes).
                - Clear display of "Stock Spec" vs. "User Modified Spec" side-by-side.
            - **Build Lists:**
                - A structured list/table for tracking parts and modifications.
                - Columns/Fields: Part Name, Part Category (e.g., Engine, Suspension, Brakes, Interior, Exterior, Wheels/Tires), Brand, Part Number, Status (e.g., Planned, Purchased, Installed, Needs Repair), Purchase Date, Supplier, Cost, Notes.
                - CRUD operations (Create, Read, Update, Delete) for build list items.
            - **Project Potential Impacts (MVP):**
                - Primarily, the display of user-adjusted specifications alongside stock ones.
                - (Future: Simple derived stats like new power-to-weight if HP and Weight are modified).
    5. **Resource Hub:**
        - Access to curated lists/databases of:
            - **Shops:** Searchable/filterable by specialty (e.g., Tuning, Fabrication, Bodywork) and potentially region (V2).
            - **Part Suppliers:** Searchable/filterable by vehicle make focus, part types.
            - **Tools:** Curated list of recommended tools for common DIY tasks, with links.
            - **Guides & Articles:** Links to external (or internal) DIY guides, maintenance procedures, tuning articles, relevant to enthusiast activities.
        - Basic search and filtering capabilities for these resources.

    ### Spec List for "MyDDPC Garage" Features & Data

    - **User Account Linkage:** All Garage data is tied to a specific paid user account.
    - **Dashboard Module:**
        - Widgets for My Vehicles summary, My Garage Dimensions quick view.
    - **Saved Research Module:**
        - Data: Links/references to saved items from free tools.
        - Functions: View, Delete, Organize.
    - **Garage Dimensions Module:**
        - Data: Garage Name, Length, Width, Height, Door Width, Door Height, Notes.
        - Functions: Add New Garage, Edit Garage, Delete Garage.
    - **My Vehicles Module:**
        - Data per vehicle: Base Vehicle ID (from main DB), Custom Nickname, Status, User Photos, List of Modified Specs (Spec Name, Stock Value, User Value), Build List.
        - Functions: Add New Vehicle (from DB), Remove Vehicle, Edit Nickname/Status, Upload Photos, Edit Modified Specs, Manage Build List.
    - **Build List Sub-Module (per vehicle):**
        - Data per item: Part Name, Category, Brand, Part #, Status, Date, Supplier, Cost, Notes.
        - Functions: Add Part, Edit Part, Delete Part, Sort/Filter Build List.
    - **Resource Hub Module:**
        - Data: Curated lists of Shops, Suppliers, Tools, Guides (Name, Description, Category/Specialty, Link, Notes).
        - Functions: Search Resources, Filter Resources by Category/Tags.

### Guiding Principles & Approach
- **Minimize Duplication (Function First, Then Style):** Core PHP/JS functionality will be developed and tested first. Visual styling (CSS) will be applied afterwards as a distinct layer. This separation helps prevent functional regressions when visual changes are made.
- **Live Site Development Strategy:** Given no current traffic, development will occur directly on the live SiteGround environment.
    - **Mitigation:** Implement a robust backup schedule (daily or more frequent during heavy development). Perform major updates during off-peak hours. Consider using a "Maintenance Mode" plugin during significant structural changes if needed. If SiteGround offers easy staging/dev subdomains with one-click push to live, this would be a safer alternative for larger feature rollouts.
- **Iterative Design & Wireframing:** Functional wireframes will be established first (Phase 0). Detailed visual design and CSS styling will be applied iteratively _after_ the core functionality of each tool/section is confirmed to be working.
- **Informal Testing Loops:** Close friends will be involved at specific milestones for feedback and bug identification.

### Proposed Site Structure & Page Layout
To maintain clarity and ease of navigation, a minimal number of distinct pages is recommended:

1. [**Homepage**](ddpc_site_homepage.md)
    Overview of MyDDPC, entry points to the tools, and a clear call-to-action for "MyDDPC Garage."
    ### Prompt for AI Wireframe Generator ("MyDDPC Homepage Wireframe")

    "Create a wireframe UI for the homepage of 'MyDDPC', an online platform for car enthusiasts. The design should be modern, clean, visually engaging (using automotive themes subtly), and consistent with the styling of the previously designed MyDDPC tool pages (Discover, Dimensions, Performance/Efficiency, Garage). The homepage should clearly present the site's value proposition and guide users to its key features.

    **Overall Page Structure:** A standard scrolling webpage layout with a clear Header, distinct content sections, and a Footer.

    **1. Header (Persistent across site):**

    - **Left:** 'MyDDPC' Logo.
    - **Center/Right:** Navigation links: 'Discover', 'Dimensions', 'Performance/Efficiency', 'MyDDPC Garage'.
    - **Far Right:** 'Login' and 'Sign Up' buttons (or a user profile icon if logged in).

    **2. Hero Section (Full-width, immediately visible):**

    - **Background:** A high-quality, subtly dynamic automotive-themed image or abstract design (e.g., clean engine components, data visualizations, or a stylized car outline).
    - **Headline (Large, impactful text):** e.g., "Intelligent Car Discovery & Project Management Starts Here." or "Your Ultimate Toolkit for Vehicle Insights and Builds."
    - **Tagline (Smaller text below headline):** e.g., "Explore detailed vehicle specs, analyze dimensions and performance, and manage your dream car projects with MyDDPC."
    - **Primary Call to Action (Button):** e.g., "Explore Free Tools" or "Get Started Free".
    - **Secondary Call to Action (Optional, ghost button or link):** e.g., "Learn About MyDDPC Garage".

    **3. Introduction / "What is MyDDPC?" Section (Brief):**

    - **Small Headline:** e.g., "Empowering Your Automotive Passion."
    - **Short Paragraph (2-3 sentences):** Briefly explain that MyDDPC offers tools for in-depth vehicle research, comparison, and personalized project car management.

    **4. "Free Tools Showcase" Section:**

    - **Headline:** e.g., "Discover, Analyze, Compare – For Free."
    - **Layout:** Use a 3-column card-based layout to feature each free tool:
        - **Card 1: Discover Tool**
            - Icon representing discovery/search.
            - Title: "Discover Tool"
            - Short Description: "Find vehicles based on specific qualities and technical attributes, even if you don't know the model."
            - Button: "Try Discover"
        - **Card 2: Dimensions Tool**
            - Icon representing dimensions/measurement.
            - Title: "Dimensions Tool"
            - Short Description: "Analyze detailed vehicle dimensions, visualize footprints, and see if it fits your space."
            - Button: "Analyze Dimensions"
        - **Card 3: Performance/Efficiency Tool**
            - Icon representing speed/graphs/fuel.
            - Title: "Performance/Efficiency Tool"
            - Short Description: "Compare engine power, fuel economy, and key performance metrics side-by-side."
            - Button: "Check Performance"

    **5. "MyDDPC Garage" (Paid Tier) Promotion Section:**

    - **Headline:** e.g., "Unlock Your Ultimate Project Hub: MyDDPC Garage" or "Take Control with MyDDPC Garage."
    - **Layout:** Visually distinct section, perhaps with a slightly different background color or a prominent graphic/mockup representing a personalized dashboard.
    - **Key Features Highlight (Bullet points or icon-text pairs):**
        - "Save Your Research: Keep all your findings in one place."
        - "Personalize Your Specs: Track modifications and see how they change your vehicle."
        - "Manage Build Lists: Detail every part of your project."
        - "Input Garage Dimensions: Ensure your dream car fits your reality."
        - "Access Curated Resources: Connect with shops, suppliers, and guides."
    - **Strong Call to Action (Button):** e.g., "Explore MyDDPC Garage" or "Upgrade to Premium".

    **6. Value Proposition / How It Works (Optional Simple Section):**

    - **Headline:** e.g., "Streamline Your Automotive Journey."
    - **Simple 3-Step Graphic or Numbered List:**
        - 1. Research & Discover: Use our free tools to find and analyze vehicles.
        - 2. Save & Personalize: Log in to save data and manage your projects in the Garage.
        - 3. Build & Connect: Track modifications and access key resources.

    **7. Footer (Consistent across site):**

    - Links: 'About MyDDPC', 'Contact Us', 'Terms of Service', 'Privacy Policy'.
    - Social media icons (placeholders).
    - Copyright: '© [Current Year] MyDDPC. All rights reserved.'

    **General Style Notes for AI:**

    - The design should feel modern, tech-oriented, and trustworthy.
    - Use clear typography suitable for data and information presentation.
    - Incorporate subtle automotive design cues without being cluttered.
    - Ensure strong visual hierarchy to guide the user's eye through the page.
    - Call to action buttons should be prominent and clear.

2. [**Discover Tool Page**](ddpc_site_discover.md)
    ### Prompt for "Google Stitch" (AI Wireframe UI Site Page Generator)

    "Create a clean, modern wireframe UI for a vehicle discovery tool page on a car enthusiast website. The page should be titled 'Discover Your Next Vehicle' with a subtitle 'Find vehicles based on the qualities you need.'

    The layout should feature a persistent left sidebar for filters and a main content area on the right for displaying results.

    **Left Sidebar - Filters:**

    - The filter area should be clearly sectioned into logical groups: 'Basic,' 'Performance & Drivetrain,' 'Practicality & Size,' and 'Fuel & Efficiency.'
    - Represent various filter input types:
        - Dropdowns or checkbox groups for multi-select categorical filters like 'Body Type,' 'Drive Type,' 'Fuel Type,' 'Country of Origin.'
        - Numerical range sliders for filters like 'Year,' 'Horsepower (HP),' 'Torque (ft-lbs),' 'Curb Weight (lbs),' 'Cargo Capacity (cu ft),' 'EPA Combined MPG.'
        - Segmented controls or button groups for 'Cylinders' or 'Total Seating.'
    - Include prominent 'Apply Filters' and 'Reset Filters' buttons at the bottom of the sidebar.

    **Main Content Area - Results:**

    - At the top, display a text indicator for 'X vehicles found.'
    - Below that, show a results table. Each row represents a vehicle.
    - Table columns should include: a small placeholder for 'Vehicle Image,' 'Make,' 'Model,' 'Year,' 'Trim,' and a few key highlightable specs like 'HP,' 'Drive Type,' 'Seating,' and 'MPG/Range.'
    - Each vehicle row in the table should look clickable, suggesting navigation to a detailed view.
    - Include sorting options for the table results (e.g., sort by Year, HP, etc.) via dropdowns or clickable column headers.
    - Show pagination controls at the bottom of the results table if there are many results.
    - Place a 'Save Search' button (perhaps with a star icon) near the top of the results area, intended for logged-in users.

    The overall aesthetic should be functional, intuitive, and geared towards easy data consumption, with clear visual hierarchy. Use placeholder icons where appropriate (e.g., for sorting, saving)."

3. [**Dimensions Tool Page**](ddpc_site_dimensions.md)
    ### Prompt for AI Wireframe Generator ("MyDDPC Dimensions Tool Wireframe with Diagram")

    "Create a clean, modern wireframe UI for the 'MyDDPC Dimensions Tool' page, designed for a car enthusiast website. The page title should be 'Vehicle Dimensions Analyzer'. Maintain a similar visual style (fonts, button styles, layout principles) to the 'MyDDPC Discover Tool Wireframe' for site consistency.

    **Overall Layout:**

    - A top section for vehicle selection (one or two vehicles).
    - A main content area below to display dimension data, a visual diagram, and practical insights.

    **Vehicle Selection Section (Top):**

    - Clearly allow the user to select Vehicle 1 using dropdowns for Year, Make, Model, and Trim.
    - Display a prominent button or link: '+ Add Vehicle for Comparison'.
    - If a second vehicle is added, provide identical Year, Make, Model, Trim dropdowns for Vehicle 2.
    - When two vehicles are selected, the main content area should adapt to show data and potentially side-by-side diagrams. Default to a single vehicle view initially for the diagram implementation in the wireframe.

    **Main Content Area - Single Vehicle View:**

    - **Vehicle Identification:** Display selected Vehicle 1's Make, Model, Year, Trim, and a placeholder for its image.
        
    - **Visual Diagram Section:**
        
        - Prominently display a top-down diagram representing the vehicle's footprint and turning radius.
        - **Footprint:** Show a simple rectangular or more accurate outline representing the vehicle's length and width. Clearly label these dimensions.
        - **Turning Radius:** Illustrate the turning circle with a dashed line, centered appropriately relative to the vehicle footprint. Label the turning circle diameter (or radius, if your data provides that directly). Indicate the direction of turn with an arrow.
        - The diagram should be scalable or provide clear visual cues to understand the relative size and turning ability of the vehicle.
        - Include the numerical values for 'Length (in)', 'Width (in)', and 'Turning circle (ft)' directly near or within the diagram for immediate reference.
    - **Dimensions Display (Tabular/List):** Below the diagram, list the remaining dimension specs clearly with their values and units (e.g., 'Height: XX.X in', 'Ground Clearance: X.X in', 'Wheelbase: XXX.X in', 'Angle of approach: XX degrees', 'Angle of departure: XX degrees'). Use a clean, readable list or multi-column layout.
        
    - **Practical Insights Section:** A dedicated box or area titled 'Practical Fitment Considerations'. This section should display contextual information related to the displayed dimensions and the diagram:
        
        - 'Garage Fit Visualization: The top-down diagram gives a visual representation of the vehicle's footprint relative to typical garage sizes. Consider drawing your garage dimensions (mentally or with a simple sketch) to compare.'
        - 'Maneuverability: The turning circle shown in the diagram indicates the minimum space required for a U-turn. A smaller circle generally means better maneuverability in tight spaces.'
        - 'Ground Clearance & Angles: [Same as before]'
    - **Call to Action (Logged-in users):** A button 'Save to MyDDPC Garage' or 'Visualize in My Garage' (this hints at the future paid feature).
        

    **Main Content Area - Dual Vehicle (Head-to-Head) View (Consider for Later Wireframe Iteration if Complexity is High):**

    - For the initial wireframe focused on the diagram, you can indicate that in comparison mode, the tabular dimension data will be side-by-side. A visual comparison of footprints and turning circles might be represented by showing two outlines and turning circles overlaid or adjacent to each other, if the AI tool allows for this level of complexity. If not, prioritize the single vehicle diagram for this wireframe.

    **General UI Elements:**

    - Use clear typography and spacing for readability.
    - Buttons should be styled consistently.
    - A 'Reset/Clear Vehicles' button in the selection area.

    The focus of this revised prompt is to integrate a clear, top-down visual representation of the vehicle's physical size and turning ability, directly addressing the core questions of the "Dimensions" tool. Ensure the AI understands the need for labeled dimensions within or near the diagram."

4. [**Performance/Efficiency Tool Page**](ddpc_site_performance.md)
    ### Prompt for AI Wireframe Generator ("MyDDPC Performance/Efficiency Tool Wireframe")

    "Create a clean, modern wireframe UI for the 'MyDDPC Performance/Efficiency Tool' page, for a car enthusiast website. The page title should be 'Vehicle Performance & Efficiency Analyzer'. Maintain a similar visual style (fonts, button styles, layout principles) to the 'MyDDPC Discover Tool Wireframe' and 'MyDDPC Dimensions Tool Wireframe' for site consistency.

    **Overall Layout:**

    - A top section for vehicle selection (one or two vehicles).
    - A main content area below to display performance/efficiency data, graphs, and qualitative summaries.

    **Vehicle Selection Section (Top):**

    - Clearly allow the user to select Vehicle 1 using dropdowns for Year, Make, Model, and Trim.
    - Display a prominent button or link: '+ Add Vehicle for Comparison'.
    - If a second vehicle is added, provide identical Year, Make, Model, Trim dropdowns for Vehicle 2.
    - When two vehicles are selected, the main content area should switch to a side-by-side comparison view, especially for graphs. Default to a single vehicle view.

    **Main Content Area - Single Vehicle View:**

    - **Vehicle Identification:** Display selected Vehicle 1's Make, Model, Year, Trim, and a placeholder for its image.
    - **Data Display Sections:** Organize specs into clear sections:
        - **'Engine & Power':** List `Engine size (l)`, `Cylinders`, `Cam type`, `Horsepower (HP)` (with peak RPM), `Torque (ft-lbs)` (with peak RPM), `Curb weight (lbs)`.
        - **'Drivetrain':** List `Drive type`, `Transmission`.
        - **'Fuel & Efficiency':** (Dynamically show ICE/Hybrid or EV specific data based on `Fuel type`)
            - For ICE/Hybrid: `Fuel type`, `EPA combined MPG`, `EPA city/highway MPG`, `Fuel tank capacity (gal)`, `Range in miles (city/hwy)`.
            - For EV: `Fuel type`, `EPA combined MPGe`, `EPA city/highway MPGe`, `EPA electricity range (mi)`, `EPA kWh/100 mi`, `Battery capacity (kWh)`, `EPA time to charge battery (at 240V) (hr)`.
    - **Graphs (Single Vehicle):**
        - A simple bar chart for 'Fuel Economy', showing 'City MPG/MPGe', 'Highway MPG/MPGe', and 'Combined MPG/MPGe' values.
        - Placeholder for potential future simple power visualization (e.g., basic bar showing HP value).
    - **Qualitative Summary Section:** A box titled 'Performance & Commuting Profile'. Use placeholder text like:
        - 'Power: With [Horsepower (HP)] HP and [Torque (ft-lbs)] ft-lbs of torque, this vehicle offers [e.g., spirited acceleration, adequate power for daily driving].'
        - 'Commuter Suitability: Based on its [EPA combined MPG/MPGe] and [Range], this vehicle is [e.g., excellent, good, average] for commuting purposes. Consider its [Fuel Type] for running costs.'
    - **Call to Action (Logged-in users):** A button 'Save to MyDDPC Garage'.

    **Main Content Area - Dual Vehicle (Head-to-Head) View:**

    - **Vehicle Identification:** Clearly label columns or sections for Vehicle 1 and Vehicle 2 (Make, Model, Year, Trim, image placeholder).
    - **Key Metrics Comparison Graphs (Crucial Feature):**
        - Prominently display side-by-side bar charts for direct comparison of key metrics:
            - 'Horsepower (HP)' (Vehicle 1 bar vs. Vehicle 2 bar)
            - 'Torque (ft-lbs)' (Vehicle 1 bar vs. Vehicle 2 bar)
            - 'EPA Combined MPG (or MPGe for EVs)' (Vehicle 1 bar vs. Vehicle 2 bar)
            - 'Total Range (miles)' (Vehicle 1 bar vs. Vehicle 2 bar)
        - Ensure graphs are clearly labeled with vehicle identifiers and values.
    - **Detailed Specs Comparison Table:**
        - A table with rows for each relevant spec (Engine Size, Cylinders, HP, Torque, MPG, Range, etc.).
        - Columns: 'Specification', 'Vehicle 1 Value', 'Vehicle 2 Value'.
        - Highlight differences where significant (e.g., color coding or +/- indicators).
    - **Qualitative Summary (Comparison Context):**
        - 'Vehicle 1 offers [X]% more horsepower, while Vehicle 2 has better combined fuel economy.'
    - **Call to Action (Logged-in users):** 'Save Comparison to MyDDPC Garage'.

    **General UI Elements:**

    - Use clear typography for data. Graphs should be easy to read with clear labels and distinct colors for comparisons.
    - Buttons styled consistently.
    - A 'Reset/Clear Vehicles' button.

    ---
    ### Revised Prompt for AI Wireframe Generator ("MyDDPC Performance/Efficiency Tool Wireframe - V2")

    "Create an updated wireframe UI for the 'MyDDPC Performance/Efficiency Tool' page. This version should reflect a specific layout: a 20% width left sidebar for vehicle selection and an 80% width main body for displaying data and graphs. The design must be responsive for desktop, mobile, and tablet use, and maintain visual consistency (fonts, button styles, layout principles) with other MyDDPC tool wireframes.

    **Overall Page Structure:**

    - Standard MyDDPC Header.
    - A two-column layout below the header: Left Sidebar (20%) and Main Body Content (80%).
    - Standard MyDDPC Footer.

    **1. Left Sidebar (20% width - Vehicle Selection):**

    - **Vehicle 1 Selection Area:**
        - Clear label: 'Vehicle 1'.
        - Dropdowns for: 'Year', 'Make', 'Model', 'Trim'.
        - Dropdowns for: 'Drivetrain', 'Transmission'.
        - Button/Link: 'Load Saved Vehicle' (placeholder for functionality to select a vehicle previously saved by the user).
    - **Head-to-Head (H2H) Option:**
        - Checkbox or Toggle Switch: 'Enable Head-to-Head Comparison'.
    - **Vehicle 2 Selection Area (Appears if H2H is enabled):**
        - Clear label: 'Vehicle 2'.
        - Dropdowns for: 'Year', 'Make', 'Model', 'Trim'.
        - Dropdowns for: 'Drivetrain', 'Transmission'.
        - Button/Link: 'Load Saved Vehicle'.
    - Action Button: 'Analyze Performance' or 'Show Results' at the bottom of the sidebar.

    **2. Main Body Content (80% width - Data Display):**

    - **Vehicle Identification Display (Top of Body):**
        
        - Clearly display selected Year, Make, Model, Trim for Vehicle 1.
        - If H2H is enabled, display YMMT for Vehicle 1 and Vehicle 2, perhaps side-by-side or stacked.
    - **Vehicle Image(s):**
        
        - Placeholder for an image of Vehicle 1.
        - If H2H, placeholder for an image of Vehicle 2, displayed alongside or below Vehicle 1's image.
    - **Data Sections (Order: Power Specs, then Efficiency Specs, then Graph):**
        
        - **A. Power Specifications Section:**
            
            - **Single Vehicle View:** Clearly labeled data points:
                - 'Horsepower (HP)': Value (e.g., 300 HP)
                - 'Peak HP RPM': Value (e.g., @ 6500 RPM)
                - 'Torque (ft-lbs)': Value (e.g., 280 ft-lbs)
                - 'Peak Torque RPM': Value (e.g., @ 4000 RPM)
                - 'Engine Displacement (Liters)': Value
                - 'Cylinders': Value
                - 'Cam Type': Value (e.g., DOHC)
                - 'Valves': Value (e.g., 16)
                - 'Valve Timing': Value (e.g., Variable)
                - 'Curb Weight (lbs)': Value
                - '0-60 mph (est.)': Placeholder for calculated value (e.g., 5.5 seconds)
                - 'Power-to-Weight Ratio (est.)': Placeholder (e.g., XXX HP/Ton)
            - **H2H View:** This section splits into two equal columns (50:50) side-by-side, one for Vehicle 1 and one for Vehicle 2, displaying all the above power specs for each.
        - **B. Efficiency Specifications Section:**
            
            - Field labels in this section should adapt based on the selected vehicle's `Fuel type` (ICE vs. EV).
            - **Single Vehicle View:**
                - 'Fuel Type': Value (e.g., Gasoline, Electric)
                - _(If ICE/Hybrid):_
                    - 'EPA City MPG': Value
                    - 'EPA Highway MPG': Value
                    - 'EPA Combined MPG': Value
                    - 'Estimated Fuel Range (miles)': Value
                - _(If EV):_
                    - 'EPA City MPGe': Value
                    - 'EPA Highway MPGe': Value
                    - 'EPA Combined MPGe': Value
                    - 'EPA Electricity Range (miles)': Value
                    - 'EPA kWh/100 mi': Value
                    - 'Battery Capacity (kWh)': Value
            - **H2H View:** This section also splits 50:50 side-by-side for Vehicle 1 and Vehicle 2, displaying their respective (and potentially different types of) efficiency specs.
        - **C. Graphical Representation Section:**
            
            - **Single Vehicle View:**
                - Bar chart for 'Fuel Economy', showing 'City', 'Highway', and 'Combined' MPG (or MPGe).
                - Simple bar indicators for 'Max Horsepower' and 'Max Torque'.
            - **H2H View (Crucial Feature - Both vehicles on the same graph for comparison):**
                - **Shared Graph Area Title:** e.g., 'Performance & Efficiency Comparison'.
                - Prominently display grouped bar charts for direct comparison of key metrics:
                    - 'Horsepower (HP)' (Vehicle 1 bar vs. Vehicle 2 bar)
                    - 'Torque (ft-lbs)' (Vehicle 1 bar vs. Vehicle 2 bar)
                    - 'EPA Combined MPG (or MPGe)' (Vehicle 1 bar vs. Vehicle 2 bar)
                    - 'Total Estimated Range (miles)' (Vehicle 1 bar vs. Vehicle 2 bar)
                - Ensure graphs are clearly labeled with vehicle identifiers (e.g., color-coded legend for Vehicle 1 and Vehicle 2) and display actual values on or near the bars.
    - **Save Functionality (Visible when data is displayed, for logged-in users):**
        
        - Button: 'Save Vehicle 1 to Garage'.
        - If H2H, additional Button: 'Save Vehicle 2 to Garage'.
        - (Alternatively, a single 'Save Comparison to Garage' button if that makes more sense for H2H).

    **General UI Elements & Style Notes for AI:**

    - Maintain a clean, data-focused, modern aesthetic consistent with other MyDDPC tools.
    - Ensure clear typography, especially for numerical data and labels.
    - Interactive elements like dropdowns, toggles, and buttons should be distinct and intuitive.
    - The 20/80 split should be visually balanced. The sidebar should feel like a control panel, and the body like a results dashboard.
    - Graphs should be the visual highlight in H2H mode, designed for easy comparison.
    - Responsiveness: The layout should adapt gracefully to smaller screens. For mobile, the sidebar might stack above the main content or become a collapsible menu. H2H data tables might need to become scrollable or stack vertically. Graphs should resize appropriately.

5. [**User Account Page**](ddpc_site_user_account.md)
    ### Prompt for AI Wireframe Generator ("MyDDPC Free User Account Page Wireframe")

    "Create a wireframe UI for the 'My Account' page for **free users** of 'MyDDPC', an online platform for car enthusiasts. This page should allow users to manage information they've saved from the free tools and update their basic account settings. The design should be clean, intuitive, and visually consistent with the other MyDDPC tool pages (Discover, Dimensions, Performance/Efficiency, Homepage).

    **Overall Page Structure:**

    - A standard MyDDPC Header (Logo, Nav links: 'Discover', 'Dimensions', 'Performance/Efficiency', 'MyDDPC Garage', User Profile icon with 'My Account' & 'Logout' options).
    - A main content area for the account page.
    - A standard MyDDPC Footer.

    **Main Account Page Layout:**

    - **Page Title (Large, clear):** 'My Account'
    - **Sub-Navigation (Tabs or Left Vertical Menu):**
        - 'Saved Items'
        - 'Account Settings'
        - (Optionally, a dedicated 'Upgrade' tab, or integrate upgrade CTAs within other sections)

    **1. 'Saved Items' View (Default view when landing on 'My Account'):**

    - **Headline:** 'Your Saved Vehicles & Research'
    - **Layout:**
        - If items are saved: Display them as a list or a series of cards. Each item should clearly show:
            - **Icon/Type:** A small icon or text indicating the type of saved item (e.g., 'Saved Vehicle from Discover', 'Dimensions Comparison', 'Performance Search Result').
            - **Title/Description:** A concise title representing the saved item (e.g., '2022 BMW M3 - Dimensions', 'RWD Coupes with >400HP', 'Ford F-150 vs. Ram 1500 - Performance').
            - **Date Saved:** e.g., 'Saved on: May 27, 2025'.
            - **Actions per item:** Buttons or icons for 'View' (links back to the relevant tool with the saved data loaded) and 'Delete'.
        - If no items are saved:
            - Display a message like: 'You haven't saved any research yet. Explore our tools to discover, analyze, and save vehicles that catch your eye!'
            - Include prominent buttons linking to the 'Discover', 'Dimensions', and 'Performance/Efficiency' tools.
    - **Call to Action for Upgrade (Subtly placed within this section if appropriate, or as a banner):**
        - Text: 'Want to track your own vehicles, manage build lists, and input garage dimensions? Upgrade to MyDDPC Garage!'
        - Button: 'Learn More about MyDDPC Garage'

    **2. 'Account Settings' View:**

    - **Headline:** 'Account Settings'
    - **Layout:** Use a clean form layout for editing user details.
    - **Form Sections/Fields:**
        - **Email Address:**
            - Display current email address (read-only).
            - Button/Link: 'Change Email' (this might lead to a modal or separate step for verification).
        - **Password:**
            - Button/Link: 'Change Password' (leading to fields for 'Current Password', 'New Password', 'Confirm New Password').
        - **Display Name/Username (If applicable):**
            - Field to edit display name.
        - **(Optional V2) Notification Preferences:** If any email notifications are planned for free users (e.g., new feature announcements), include checkboxes here.
    - **Action Button:** A prominent 'Save Changes' button for the form.

    **3. Upgrade Promotion (If not a dedicated tab, ensure it's visible):**

    - This could be a persistent banner at the top or bottom of the 'My Account' page, or a well-defined section.
    - **Headline:** 'Unlock the Full Power of MyDDPC!' or 'Supercharge Your Projects with MyDDPC Garage!'
    - **Brief Benefit List (using icons if possible):**
        - 'Manage Your Own Vehicles & Modifications'
        - 'Create Detailed Build Lists'
        - 'Save Your Garage Dimensions'
        - 'Access Exclusive Resource Hub'
    - **Button:** 'Explore MyDDPC Garage Features' or 'Upgrade Now'.

    **General Style Notes for AI:**

    - The page should feel like a secure and personal space.
    - Emphasize clarity and ease of use for managing saved items and settings.
    - Upgrade prompts should be noticeable but not overly intrusive for the free user experience.
    - Maintain consistency with the overall MyDDPC site design (fonts, colors, button styles).
    - Ensure forms are well-structured and input fields are clearly labeled.

6. [**MyDDPC Garage Dashboard (Paid)**](ddpc_site_my_garage.md)
    The central hub for paid subscribers, managing their saved vehicles, garage dimensions, build lists, and modified vehicle data.
    [ddpc_garage_pages](ddpc_garage_pages.md)
    ### Prompt for AI Wireframe Generator ("MyDDPC Garage Tool Wireframe")

    "Create a wireframe UI for the 'MyDDPC Garage' – a premium dashboard for car enthusiasts. The overall design should be clean, organized, and user-friendly, maintaining visual consistency (fonts, button styles, layout principles) with the other MyDDPC tools (Discover, Dimensions, Performance/Efficiency).

    **Overall Structure: Dashboard-Centric Design**

    - A persistent left-hand navigation sidebar for main Garage sections: 'Dashboard', 'My Vehicles', 'My Garage Dimensions', 'Saved Research', 'Resource Hub', 'Account Settings'.
    - The main content area changes based on the selected navigation item.

    **1. Dashboard View (Default View):**

    - **Title:** 'MyDDPC Garage Dashboard'
    - **Layout:** Widget-based or card-based layout.
        - **'My Vehicles' Widget:** Shows a summary (e.g., small cards or list items) of 2-3 recently accessed/updated user vehicles, with names and a thumbnail. Link to the full 'My Vehicles' section. '+ Add New Vehicle' button.
        - **'My Garage Dimensions' Widget:** Displays key dimensions for a primary saved garage (e.g., Name, Length, Width). Link to the full 'My Garage Dimensions' section.
        - **'Recent Saved Research' Widget:** List of 3-5 most recently saved items from the free tools. Link to full 'Saved Research' section.
        - **Quick Link to 'Resource Hub'.**

    **2. 'My Vehicles' Section:**

    - **Title:** 'My Vehicles'
    - **Layout:**
        - A gallery/list view of all vehicles the user has 'claimed' or added. Each vehicle item should show a thumbnail (user-uploaded), Nickname, Make/Model/Year.
        - '+ Add Vehicle to Garage' button (this would likely trigger a search/selection from the main DB).
        - Clicking a vehicle opens its **Individual Vehicle Management Page**:
            - **Header:** Vehicle Nickname, Make/Model/Year, main user-uploaded photo. Tabs for 'Overview/Specs', 'Build List', 'Photos'.
            - **'Overview/Specs' Tab:**
                - Display stock specifications (from main DB) alongside user-editable fields for 'Modified Specifications' (e.g., HP, Torque, Weight). Show 'Stock' vs 'Modified' values clearly. 'Edit Specs' button.
                - Section for basic vehicle info: VIN (optional user input), Purchase Date, Purchase Price, Current Mileage.
            - **'Build List' Tab:**
                - A table to display parts: Part Name, Category, Brand, Status, Cost, Date.
                - '+ Add Part to Build List' button. Each row editable/deletable.
                - Filter/Sort options for the build list.
            - **'Photos' Tab:** Gallery of user-uploaded images for this vehicle. '+ Upload Photo' button.

    **3. 'My Garage Dimensions' Section:**

    - **Title:** 'My Garage Dimensions'
    - **Layout:**
        - Area to display saved garage profiles (e.g., cards for "Main Garage," "Storage Unit").
        - '+ Add New Garage Profile' button.
        - Form fields for inputting/editing: Garage Name, Length, Width, Height, Door Opening Width, Door Opening Height, Notes. 'Save Dimensions' button.

    **4. 'Saved Research' Section:**

    - **Title:** 'Saved Research'
    - **Layout:** A filterable list/table of all items (vehicles, comparisons, searches) saved from the Discover, Dimensions, and Performance/Efficiency tools. Display item type, name/summary, date saved. Options to view or delete.

    **5. 'Resource Hub' Section:**

    - **Title:** 'Resource Hub'
    - **Layout:**
        - Tabs or prominent filters for 'Shops', 'Part Suppliers', 'Tools', 'Guides'.
        - A search bar for keywords within resources.
        - Additional filters relevant to each category (e.g., for Shops: specialty; for Parts: make/model focus).
        - Results displayed as cards or a list with Name, brief Description, Category, and a 'View Details/Link' button.

    **General UI Elements:**

    - Use clear forms for data input.
    - Tables should be sortable and potentially filterable.
    - Consistent button styles for actions like 'Save', 'Edit', 'Add', 'Delete'.
    - Visual hierarchy to guide the user through the dense information.
    
7. [**Static Info Page**](ddpc_site_static_info.md)
    A static page for "housekeeping" items like:
    - About Us
    - Contact
    - Terms of Service
    - Privacy Policy

    ### Prompt for AI Wireframe Generator ("MyDDPC About-Contact Page Wireframe")

    "Create a wireframe UI for a static information page for 'MyDDPC', an online platform for car enthusiasts. This page will primarily serve as an 'About Us' and 'Contact' point. The design should be clean, professional, easy to read, and visually consistent with the other MyDDPC tool pages and homepage.

    **Overall Page Structure:**

    - A standard MyDDPC Header (Logo, Nav links: 'Discover', 'Dimensions', 'Performance/Efficiency', 'MyDDPC Garage', User Profile icon/Login/Sign Up).
    - A main content area divided into logical sections.
    - A standard MyDDPC Footer (which might also contain the Privacy/Terms links, but we'll specify them in a dedicated section on this page too for clarity).

    **Main Content Area:**

    **1. 'About MyDDPC' Section:**

    - **Headline (Prominent):** 'About MyDDPC' or 'Our Story'
    - **Layout:** A balanced layout, perhaps with a section for text and a placeholder for a relevant image alongside or above/below (e.g., an abstract image representing community, data, or a subtle automotive design element).
    - **Placeholder Text Content (to guide the AI on structure and length):**
        - **Paragraph 1 (MyDDPC - The Genesis):** 'MyDDPC (Daily Driven Project Car) was born from a passion for all things automotive and a desire to simplify how enthusiasts research, plan, and manage their vehicle projects. We saw a need for a centralized platform that brings together comprehensive data, practical tools, and a focused approach to the enthusiast journey.'
        - **Paragraph 2 (Purpose of the Initiative):** 'Our core mission is to empower car enthusiasts by providing powerful, intuitive tools that demystify complex vehicle specifications, offer practical insights for real-world fitment and performance, and streamline the often-chaotic process of building and modifying cars.'
        - **Paragraph 3 (Vision Teaser):** 'We envision MyDDPC evolving into the indispensable digital co-pilot for every auto enthusiast—a dynamic ecosystem that not only delivers data but also fosters deeper understanding, smarter decisions, and more successful outcomes for every daily driver and dedicated project car.'
        - **Paragraph 4 (Community Focus):** 'Built by enthusiasts, for enthusiasts, MyDDPC is fundamentally about serving the automotive community. We're committed to offering valuable free resources while building a platform that supports and amplifies the passion, creativity, and dedication that defines car culture.'
    - **Visual Element:** A placeholder for an image that could represent the brand, community, or the intersection of cars and data (e.g., 600x400px placeholder).

    **2. 'Contact Us' Section:**

    - **Headline (Clear):** 'Get In Touch' or 'Contact Us'
    - **Layout:** Clean and straightforward.
    - **Sub-section 1: Contact Information (Placeholder Content):**
        - 'Email: `contact@myddpc.example.com`'
        - 'Phone: `+1 (555) 123-4567`'
        - 'Location: `Fort Collins, CO, USA`' (General location is fine, specific address not needed unless intended).
    - **Sub-section 2: Contact Form (Placeholder):**
        - Simple form fields:
            - 'Your Name' (Text input)
            - 'Your Email' (Email input)
            - 'Subject' (Text input)
            - 'Your Message' (Textarea)
        - 'Send Message' button.
        - (Note to AI: This is a wireframe, so the form is for layout purposes, not functionality).

    **3. Legal & Information Links Section:**

    - **Layout:** A distinct, but unobtrusive, section. Could be centered with text links, or neatly aligned.
    - **Headline (Optional, small):** 'Important Information' or simply present the links.
    - **Links (Clearly styled as text links):**
        - 'Privacy Policy'
        - 'Terms of Service'
        - (These would eventually link to separate static pages for each policy).

    **General Style Notes for AI:**

    - The page should have a professional and trustworthy tone.
    - Ample white space to make text blocks easy to read.
    - Typography consistent with the rest of the MyDDPC site.
    - Any imagery used should be placeholders but suggest a theme of community, technology, or automotive passion.
    - The separation between 'About Us,' 'Contact Info,' 'Contact Form,' and 'Legal Links' should be clear.

### Phase 0: Immediate Actions & Foundation Setting (Now - June 1st)
_(Approximately 1 Week)_
1. [Finalize Detailed Requirements & Scope (Days 1-2)](99_ddpc_phase_0.1.md)
2. [Data Sourcing Strategy & Initial Acquisition (Days 1-7, CRITICAL & ONGOING)](99_ddpc_phase_0.2.md)
3. [UI/UX Wireframing & Review (Days 2-4)](99_ddpc_phase_0.3.md)
4. [Database Schema Design/Update (Days 3-5)](99_ddpc_phase_0.4.md)
5. [Tech Stack & Environment Check (Day 1)](99_ddpc_phase_0.5.md)

### Phase 1: Core Free Tools & User Authentication MVP (June 2nd - June 15th)
_(Approximately 2 Weeks)_
1. ["Discover" Tool Development (Week 1 of Phase)](ddpc_phase_1.1.md)
2. [Basic User Account System (Week 1-2 of Phase)](ddpc_phase_1.2.md)
3. ["Dimensions" Tool Development - Single Vehicle (Week 1-2 of Phase)](ddpc_phase_1.3.md)
4. ["Performance/Efficiency" Tool Development - Single Vehicle (Week 2 of Phase)](ddpc_phase_1.4.md)
5. [Initial Integration & Testing (End of Phase)](ddpc_phase_1.5.md)

### Phase 2: Enhancing Free Tools & Paid Tier Foundation (June 16th - June 22nd)
_(Approximately 1 Week)_
1. [Head-to-Head Comparison (Dimensions & Performance/Efficiency)](ddpc_phase_2.1.md)
2. ["Save" Functionality for Free Tools](ddpc_phase_2.2.md)
3. ["MyDDPC Garage" - Backend Foundation](ddpc_phase_2.3.md)
4. [Payment Gateway Selection & Initial Setup](ddpc_phase_2.4.md)

### Phase 3: "MyDDPC Garage" Features & Launch Prep (June 23rd - June 30th)
_(Approximately 1 Week)_
1. ["MyDDPC Garage" - Feature Development (Iterative: Function then Style for each sub-feature)](ddpc_phase_3.1.md)
2. [Payment Integration & Subscription Management](ddpc_phase_3.2.md)
3. [Comprehensive Testing & Bug Fixing](ddpc_phase_3.3.md)
4. [Deployment & Launch Preparations](ddpc_phase_3.4.md)

### Phase 4: Launch & Iteration (July 1st Onwards)
- TBD

### Critical Success Factors & Considerations
- **Data Acquisition:** Highest priority.
- **Scope Management:** Ruthless adherence to MVP for July 1st.
- **Existing Stack Leverage & Live Dev Discipline:** Maximize current stack; maintain strict backup and controlled update protocols for live development.
- **Phased Styling:** Ensure functionality is solid before investing heavily in pixel-perfect design for each component.
- **Testing (Including Informal):** Integrate testing throughout. Value feedback from trusted friends.
- **Clear Value Proposition:** Articulate benefits of free tools and the paid upgrade.