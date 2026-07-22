# PROJECT SPECIFICATION
# Tokyo Vegetarian/Vegan Restaurant Discovery Web App

You are an autonomous senior full-stack software engineer.

Build a complete working MVP of a Japanese-language web application for discovering vegetarian and vegan restaurants in Tokyo.

Do not only generate mockups or placeholder pages. Build the actual application architecture, frontend, backend, database schema, APIs, Docker environment, and documentation.

When a requirement is ambiguous:
1. Choose a sensible MVP implementation.
2. Keep the architecture simple and maintainable.
3. Document important assumptions.
4. Do not over-engineer.

==================================================
1. PROJECT CONCEPT
==================================================

Create a Tokyo-focused restaurant discovery website where users can:

- Explore vegetarian/vegan-friendly restaurants on a map
- Search restaurants using text
- Filter restaurants by useful criteria
- Browse restaurants in a list
- View detailed restaurant information
- Browse restaurants by type/category
- Create an account and log in
- Rate/review restaurants after logging in
- Submit/add restaurants

The entire user-facing website should be in Japanese.

The visual identity should feel:

- Green
- Natural
- Soft
- Cozy
- Friendly
- Slightly fluffy/rounded
- Modern but not corporate

Use rounded cards, comfortable spacing, subtle shadows, soft animations,
and a nature-inspired visual language.

Avoid making it look like a generic admin dashboard.

==================================================
2. TECHNOLOGY STACK
==================================================

Frontend:
- React
- TypeScript
- Vite

Styling:
- Tailwind CSS

Animation:
- Motion / Motion for React

Map:
- Leaflet

Map data:
- OpenStreetMap

Restaurant/geographic data sources:
- OpenStreetMap
- Overpass API

Backend:
- Java
- Spring Boot

ORM / Persistence:
- Spring Data JPA / Hibernate

Database:
- PostgreSQL

Geospatial support:
- PostGIS extension for PostgreSQL

API documentation:
- OpenAPI
- Swagger UI

Containerization:
- Docker
- Docker Compose

Version control:
- Git / GitHub-compatible repository structure

==================================================
3. ARCHITECTURE
==================================================

Use a standard frontend/backend architecture.

Suggested structure:

/frontend
/backend
/docker-compose.yml
/README.md
/.env.example

Frontend communicates with the Spring Boot backend through REST APIs.

The backend is responsible for:
- Restaurant data
- Search
- Filtering
- Geospatial queries
- Authentication
- Users
- Reviews/ratings
- Restaurant submissions

PostgreSQL/PostGIS stores persistent restaurant and geographic data.

Do NOT make the frontend directly dependent on Overpass API for core
application functionality.

If OpenStreetMap/Overpass data is imported, normalize/store relevant data
in our own database.

Design external data providers behind a service/provider abstraction so
that additional restaurant data sources could be added later.

==================================================
4. CORE SCREENS
==================================================

Implement the following screens.

------------------------------
4.1 ホーム
------------------------------

The homepage should introduce the service and provide obvious entry points.

Include:

- Main search area
- "マップから探す"
- "お店を探す"
- Restaurant type/category browsing
- Featured/recommended restaurants if data exists
- "レストラン追加"
- Login/account entry

Possible Japanese hero text:

「東京で、あなたにぴったりのベジタリアン・ヴィーガンのお店を見つけよう」

The homepage should immediately communicate what the website does.

------------------------------
4.2 マップから探す
------------------------------

Create an interactive Tokyo restaurant map.

Use:
- Leaflet
- OpenStreetMap tiles

Features:

- Display restaurant markers
- Pan and zoom
- Clicking a marker shows a compact restaurant preview
- Preview contains:
    - Restaurant name
    - Type/category
    - Rating if available
    - Short address
    - Link/button to restaurant details

Add an optional synchronized restaurant list beside/below the map depending
on screen size.

The initial map position should focus on Tokyo.

Map results should update based on visible map bounds where practical.

Backend should support geographic/bounding-box queries using PostGIS.

------------------------------
4.3 お店を探す
------------------------------

Create a restaurant search/discovery screen.

Include:

- Keyword search
- Filters
- Restaurant result list

Possible filters:

- ヴィーガン
- ベジタリアン
- ヴィーガン対応
- ベジタリアン対応
- 和食
- インド料理
- カフェ
- ラーメン
- 洋食
- その他
- エリア
- 価格帯
- 評価

Do not hard-code the architecture around only these categories.
Use extensible category/tag structures.

Each restaurant card should show:

- Name
- Image if available
- Category/type
- Vegetarian/vegan compatibility
- Area/address
- Rating
- Price range if known
- Short description if available

Clicking a restaurant opens its detail page.

------------------------------
4.4 店舗詳細
------------------------------

Create a detailed restaurant page.

Display available information such as:

- Restaurant name
- Images
- Description
- Address
- Map location
- Latitude/longitude internally
- Restaurant/cuisine category
- Vegetarian/vegan classification
- Tags
- Opening hours
- Price range
- Website if available
- Phone number if available
- Rating
- Reviews

Provide graceful handling for missing data.

Do not display fake information for fields that are unavailable.

Logged-in users should be able to submit a rating/review.

------------------------------
4.5 タイプから探す
------------------------------

Create a category/type browsing page.

Allow users to discover restaurants through categories such as:

- ヴィーガン専門
- ベジタリアン専門
- ヴィーガン対応
- ベジタリアン対応

Cuisine examples:

- 和食
- インド料理
- カフェ
- ラーメン
- 洋食
- 中華
- その他

Selecting a category should open filtered restaurant results.

------------------------------
4.6 レストラン追加
------------------------------

Create a restaurant submission form.

Fields:

- 店名
- 住所
- 店舗タイプ
- 料理ジャンル
- ヴィーガン・ベジタリアン対応情報
- 説明
- Webサイト
- 電話番号
- 営業時間
- Optional map location / coordinates

Validate inputs.

For the MVP, submissions may either:
A. become active immediately, or
B. have a SUBMITTED/PENDING status.

Prefer designing the database so moderation can easily be added later.

------------------------------
4.7 ログイン
------------------------------

Implement authentication.

Required:

- User registration
- Login
- Logout
- Secure password hashing
- Authentication/authorization
- Protected endpoints for reviews and restaurant submissions

Use a sensible Spring Security implementation.

JWT-based authentication is acceptable for the MVP.

Never store plaintext passwords.

------------------------------
4.8 レストランの評価
------------------------------

Logged-in users can:

- Give a restaurant a rating
- Write a review
- View existing reviews

Use a 1–5 rating system.

Prevent obviously invalid ratings.

Design the data model so one user can have one active review/rating per
restaurant, with the ability to update it.

Calculate aggregate restaurant ratings from review data rather than relying
only on a manually stored rating.

==================================================
5. DATABASE DESIGN
==================================================

Create proper database migrations.

Use PostgreSQL + PostGIS.

At minimum consider these entities:

User
Restaurant
Category
Tag
RestaurantCategory
RestaurantTag
Review

Restaurant should contain fields similar to:

- id
- name
- description
- address
- latitude
- longitude
- geographic location using PostGIS where appropriate
- vegetarianType
- cuisine/category relationships
- websiteUrl
- phone
- openingHours
- priceRange
- imageUrl or image metadata
- source
- sourceExternalId
- status
- createdAt
- updatedAt

User:

- id
- username/displayName
- email
- passwordHash
- role
- createdAt
- updatedAt

Review:

- id
- userId
- restaurantId
- rating
- comment
- createdAt
- updatedAt

Use database constraints and indexes appropriately.

Add geospatial indexes where useful.

Avoid storing everything as unstructured strings if a proper relationship
or enum/table is more appropriate.

==================================================
6. REST API
==================================================

Create REST APIs with clear versioning, for example:

/api/v1/...

Suggested endpoints:

GET    /api/v1/restaurants
GET    /api/v1/restaurants/{id}
GET    /api/v1/restaurants/search
GET    /api/v1/restaurants/map
POST   /api/v1/restaurants

GET    /api/v1/categories

GET    /api/v1/restaurants/{id}/reviews
POST   /api/v1/restaurants/{id}/reviews
PUT    /api/v1/restaurants/{id}/reviews/{reviewId}
DELETE /api/v1/restaurants/{id}/reviews/{reviewId}

POST   /api/v1/auth/register
POST   /api/v1/auth/login

Support:

- Pagination
- Filtering
- Search
- Sorting where appropriate
- Geographic queries

Use DTOs rather than exposing JPA entities directly.

Use:

- Request validation
- Global exception handling
- Correct HTTP status codes
- Consistent JSON error responses

Document APIs with Swagger/OpenAPI.

==================================================
7. RESTAURANT DATA
==================================================

For development, provide seed/sample restaurant data so the application
works immediately after startup.

Also create an architecture for obtaining restaurant/location data from:

- OpenStreetMap
- Overpass API

Potential relevant OSM tags may include:

diet:vegan=yes
diet:vegetarian=yes
amenity=restaurant
amenity=cafe
cuisine=*

Treat external data as potentially incomplete or unreliable.

Do not assume every restaurant has:

- Images
- Opening hours
- Website
- Phone
- Exact vegetarian classification

The UI must handle missing fields gracefully.

Do not depend on Google Maps APIs unless explicitly configured later.

Do not scrape Google Maps.

==================================================
8. SEARCH
==================================================

Implement useful restaurant search.

Search should support combinations of:

- Restaurant name
- Keyword
- Category
- Cuisine
- Vegetarian/vegan classification
- Area/location
- Rating where available

For the MVP, PostgreSQL search capabilities are sufficient.

Do not introduce Elasticsearch unless there is a demonstrated need.

==================================================
9. UI/UX DESIGN
==================================================

Design direction:

Green + fluffy + cozy + natural Japanese UI.

Use:

- Rounded corners
- Pill-shaped filter chips
- Soft cards
- Comfortable whitespace
- Friendly typography
- Subtle shadows
- Nature-inspired decorative elements
- Smooth transitions

Animations should use Motion.

Examples:

- Card hover animation
- Page entrance transitions
- Filter chip transitions
- Modal/drawer transitions
- Restaurant detail transitions

Animations should be subtle and should not hurt usability.

Responsive design is required.

Support:

- Desktop
- Tablet
- Mobile

Use Japanese text for all visible UI.

Code, variable names, APIs, database names, and technical documentation can
use English.

==================================================
10. SECURITY
==================================================

Implement basic production-conscious security.

Include:

- Password hashing
- Authentication
- Authorization
- Input validation
- CORS configuration
- Safe error handling
- Environment variables for secrets
- No secrets committed to Git
- .env.example

Validate and sanitize user-controlled inputs appropriately.

==================================================
11. DEVELOPMENT ENVIRONMENT
==================================================

Provide Docker Compose so the project can be started locally with minimal
setup.

At minimum containerize/configure:

- PostgreSQL + PostGIS
- Backend

Frontend may run through Docker or through npm during development.

Provide clear README commands.

Example desired developer experience:

docker compose up -d

Then:

Frontend:
npm install
npm run dev

Backend:
./mvnw spring-boot:run

Choose Maven unless there is a strong reason to use Gradle.

==================================================
12. TESTING
==================================================

Backend:

- Unit tests for important services
- Repository/integration tests where useful
- API/controller tests for critical flows

Frontend:

Add tests for important components/business logic where practical.

At minimum verify these flows:

1. User can open homepage
2. User can browse restaurants
3. User can search/filter restaurants
4. User can view restaurants on map
5. User can open restaurant details
6. User can register/login
7. Authenticated user can submit a review
8. Authenticated user can submit a restaurant

==================================================
13. INITIAL SEED DATA
==================================================

Create realistic development seed data for Tokyo.

Include restaurants across several Tokyo areas, for example:

- 新宿
- 渋谷
- 東京・丸の内
- 上野
- 秋葉原
- 浅草
- 池袋

Seed multiple categories/types so filtering and map visualization can be
tested.

Clearly mark fictional/mock data as development data.

==================================================
14. CODE QUALITY
==================================================

Follow clean architecture principles without over-engineering.

Frontend:

- Reusable React components
- Custom hooks where useful
- API service layer
- Type-safe TypeScript
- Avoid `any`
- Separate page and reusable UI components
- Proper loading/error/empty states

Backend:

Use conventional layers:

Controller
Service
Repository
Entity
DTO
Mapper
Configuration
Security
Exception

Use clean naming and reasonable comments.

Do not create unnecessary abstractions.

==================================================
15. IMPLEMENTATION PHASES
==================================================

Build the application incrementally.

PHASE 1:
- Repository/project structure
- React/Vite/TypeScript frontend
- Spring Boot backend
- PostgreSQL/PostGIS
- Docker Compose
- Environment configuration

PHASE 2:
- Database schema
- Migrations
- Restaurant/category entities
- Seed data

PHASE 3:
- Restaurant REST APIs
- Search
- Filtering
- Pagination
- Swagger/OpenAPI

PHASE 4:
- Main frontend layout/design system
- Homepage
- Navigation
- Restaurant cards

PHASE 5:
- Restaurant search/list page
- Filters
- Restaurant detail page

PHASE 6:
- Leaflet/OpenStreetMap integration
- Map search
- Markers
- Restaurant previews
- PostGIS geographic queries

PHASE 7:
- Authentication
- Registration/login
- Protected routes/endpoints

PHASE 8:
- Ratings/reviews

PHASE 9:
- Restaurant submission

PHASE 10:
- Overpass/OpenStreetMap data integration
- Error handling
- Testing
- Responsive polish
- Animation
- Documentation

==================================================
16. FIRST TASK
==================================================

Start by inspecting the current repository.

If the repository is empty:

1. Create the complete project directory structure.
2. Initialize the React + TypeScript + Vite frontend.
3. Configure Tailwind CSS and Motion.
4. Initialize the Java Spring Boot backend.
5. Configure PostgreSQL/PostGIS.
6. Create Docker Compose.
7. Configure environment variables.
8. Create initial database migrations.
9. Create the initial Restaurant domain model.
10. Add seed development data.
11. Create a basic restaurant GET API.
12. Create the initial Japanese homepage.
13. Add Leaflet/OpenStreetMap with a basic Tokyo map.
14. Create a README containing exact startup instructions.

After the foundation works, continue implementing the phases above in
logical order.

Do not spend the first iteration building every feature simultaneously.

At every stage:
- Keep the application runnable.
- Fix build/type errors before proceeding.
- Do not leave core functionality as TODO placeholders.
- Verify frontend/backend integration.
- Update README when setup changes.

Begin implementation now.