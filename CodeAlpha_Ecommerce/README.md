# CodeAlpha E-commerce Store

A full-stack e-commerce web application developed as **Task 1** of the **CodeAlpha Full Stack Development Internship**.

---

## Overview

The **CodeAlpha E-commerce Store** is a clean, modern, and reliable online retail application built with a responsive multi-page vanilla web frontend and a Node.js / Express.js RESTful API backed by SQLite. It provides end-to-end shopping workflows: browsing catalogs, filtering categories, keyword searches, inspecting detailed specifications, managing an interactive shopping cart, authenticating via JWT, placing orders with server-side stock and total verification, and viewing personal order history.

---

## CodeAlpha Task Requirements

This project fulfills all required capabilities specified for Task 1:

- [x] **Product Listings**: Responsive catalog grid displaying product image, title, category, price, stock status, and quick actions.
- [x] **Product Details**: Dedicated product page with high-resolution image, comprehensive description, stock indicator, and dynamic quantity selector.
- [x] **Shopping Cart**: Real-time shopping cart with localStorage persistence, quantity adjusters, stock bounds checking, line totals, and automatic navbar item badge synchronization.
- [x] **Order Processing**: Secure server-side order calculation, atomic transaction processing, stock verification, and stock decrementing upon order confirmation.
- [x] **User Registration & Login**: Account registration with validation, password hashing using `bcryptjs`, JWT token issuance, and protected routes.
- [x] **Database**: Local SQLite relational database with tables for users, products, orders, and order items.

---

## Features

### Product Catalog & Search
- Live search by product name and keywords.
- Dynamic category filter pills ("All Products", "Electronics", "Gaming", "Accessories", "Clothing", "Home").
- Empty-state fallbacks for non-matching queries.
- Automatic fallback handling for remote product images.

### Product Details
- Accessible via `/product-details.html?id=:id`.
- Dynamic quantity selector enforcing minimum 1 and maximum available stock.
- Real-time stock status badge ("In Stock" with quantity vs. "Out of Stock").
- Graceful 404 state if product ID is non-existent.

### Shopping Cart
- Client-side persistence using `localStorage`.
- Prevents adding out-of-stock items or exceeding stock limits.
- Real-time cart total, subtotal, and item count calculations.
- Live cart item counter badge in the navigation header across all pages.
- Remove individual items or clear entire cart.

### Secure Order Checkout
- Client cannot tamper with order pricing or totals; unit prices and totals are fetched and computed on the backend directly from database records.
- Atomic SQLite transactions (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`) ensure that stock deduction and order item creation never leave partial states.
- Rejects orders immediately if stock becomes insufficient before checkout.

### Authentication & Authorization
- Secure password hashing with salt rounds via `bcryptjs`.
- Stateless JWT authentication (`jsonwebtoken`) with expiration.
- User-specific order isolation: users can only view their own orders; attempting to view another user's order returns HTTP 403 Forbidden.

---

## Technology Stack

### Frontend
- **HTML5**: Semantic multi-page structure.
- **CSS3**: Custom modern styling system with clean responsive layout, flexbox, and CSS grid.
- **Vanilla JavaScript**: Fetch API, DOM manipulation, `localStorage` cart persistence, dynamic navigation rendering.

### Backend
- **Node.js**: Asynchronous JavaScript runtime environment.
- **Express.js**: RESTful HTTP API framework.
- **CORS & Dotenv**: Cross-origin resource sharing and environment management.

### Database
- **SQLite**: Local relational database engine utilizing Node's built-in `node:sqlite` for high performance, zero C++ compilation dependencies, and instant portability.

### Authentication & Security
- **JSON Web Tokens (JWT)**: Secure user session management.
- **bcryptjs**: One-way cryptographic password hashing.

---

## Project Structure

```
CodeAlpha_Ecommerce/
│
├── frontend/
│   ├── index.html               # Storefront & featured catalog
│   ├── products.html            # Full product catalog & filters
│   ├── product-details.html     # Single product details & quantity selector
│   ├── cart.html                # Interactive shopping cart
│   ├── checkout.html            # Secure checkout & order placement
│   ├── orders.html              # Authenticated user's order history
│   ├── order-details.html       # Itemized receipt for specific order
│   ├── login.html               # User login form
│   ├── register.html            # User account registration form
│   │
│   ├── css/
│   │   └── style.css            # Responsive modern design system
│   │
│   ├── js/
│   │   ├── api.js               # Centralized fetch wrapper & toast notifications
│   │   ├── auth.js              # Auth state manager & navigation header sync
│   │   ├── products.js          # Catalog rendering, search, and category filter
│   │   ├── cart.js              # Cart management & badge counter
│   │   ├── checkout.js          # Cart page & checkout submission logic
│   │   └── orders.js            # Order history & receipt rendering
│   │
│   └── assets/                  # Static assets & icons
│
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app, static server, and middleware
│   │   ├── database.js          # SQLite connection, schema DDL, and query helpers
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification middleware
│   │   │
│   │   └── routes/
│   │       ├── auth.js          # /api/auth/register, /login, /me
│   │       ├── products.js      # /api/products, /categories, /:id
│   │       └── orders.js        # /api/orders (POST, GET, GET /:id)
│   │
│   ├── seed.js                  # Database seed script (14 realistic products + demo user)
│   ├── test_api.js              # Automated test suite (11 endpoint & security tests)
│   ├── package.json             # Backend dependencies and scripts
│   └── .env.example             # Environment variable configuration template
│
└── README.md                    # Project documentation
```

---

## Database Design

The SQLite schema consists of four relational tables with foreign keys and cascade deletions:

```
[ users ]
  ├── id (INTEGER PRIMARY KEY AUTOINCREMENT)
  ├── name (TEXT NOT NULL)
  ├── email (TEXT UNIQUE NOT NULL)
  ├── password_hash (TEXT NOT NULL)
  └── created_at (DATETIME)
        │
        ▼ (1:N)
[ orders ]
  ├── id (INTEGER PRIMARY KEY AUTOINCREMENT)
  ├── user_id (INTEGER NOT NULL -> users.id)
  ├── total (REAL NOT NULL)
  ├── status (TEXT NOT NULL, default 'confirmed')
  └── created_at (DATETIME)
        │
        ▼ (1:N)
[ order_items ]
  ├── id (INTEGER PRIMARY KEY AUTOINCREMENT)
  ├── order_id (INTEGER NOT NULL -> orders.id)
  ├── product_id (INTEGER NOT NULL -> products.id)
  ├── quantity (INTEGER NOT NULL)
  └── price (REAL NOT NULL)
        │
        ▼ (N:1)
[ products ]
  ├── id (INTEGER PRIMARY KEY AUTOINCREMENT)
  ├── name (TEXT NOT NULL)
  ├── description (TEXT NOT NULL)
  ├── price (REAL NOT NULL)
  ├── image (TEXT NOT NULL)
  ├── category (TEXT NOT NULL)
  ├── stock (INTEGER NOT NULL)
  └── created_at (DATETIME)
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new account (`name`, `email`, `password`). Returns JWT and user profile.
- `POST /api/auth/login`: Authenticate existing user (`email`, `password`). Returns JWT and user profile.
- `GET /api/auth/me`: Retrieve current logged-in user profile (*Protected*).

### Products
- `GET /api/products`: Retrieve list of products. Supports optional query parameters:
  - `?category=<category_name>`
  - `?search=<search_term>`
- `GET /api/products/categories`: Retrieve all unique product categories.
- `GET /api/products/:id`: Retrieve individual product details. Returns 404 if not found.

### Orders
- `POST /api/orders`: Place a new order (*Protected*). Requires array of `{ product_id, quantity }`. Computes trusted price server-side, checks stock, decrements inventory, and commits transaction.
- `GET /api/orders`: Retrieve authenticated user's order history (*Protected*).
- `GET /api/orders/:id`: Retrieve itemized details for an order (*Protected*). Returns 403 Forbidden if accessed by another user.

### Health
- `GET /api/health`: Health status probe returning `{ status: "ok" }`.

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher; version 22 recommended).
- Modern web browser (Chrome, Edge, Firefox, Safari).

### 1. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd CodeAlpha_Ecommerce/backend
```

Install dependencies:

```bash
npm install
```

Create local environment configuration (optional):

```bash
cp .env.example .env
```

### 2. Database Initialization & Seeding

Initialize the SQLite database and seed 14 realistic products across 5 categories and a demo user:

```bash
npm run seed
```

*(Alternatively: `node seed.js`)*

### 3. Automated API & Security Verification

Run the automated test suite to verify all endpoints, security constraints, and order logic:

```bash
npm test
```

*(Alternatively: `node test_api.js`)*

---

## Running the Application

### Option A: Direct Express Full-Stack Server (Recommended)

The Express server is configured to serve both the REST API and the frontend static files simultaneously:

```bash
cd CodeAlpha_Ecommerce/backend
npm start
```

Now open your web browser and visit:
- **Web Storefront**: [http://localhost:5000/index.html](http://localhost:5000/index.html)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Option B: Development Mode with Live Frontend

1. Start backend:
   ```bash
   cd CodeAlpha_Ecommerce/backend
   npm run dev
   ```
2. Open `CodeAlpha_Ecommerce/frontend/index.html` in any browser or serve via VS Code Live Server. The frontend automatically detects and routes API calls to `http://localhost:5000/api`.

---

## Usage Guide (Reviewer Demo Flow)

Follow these steps to test the entire application:

1. **Browse Products**:
   - Open [http://localhost:5000/index.html](http://localhost:5000/index.html).
   - Use the search bar to search for `"Headphones"` or `"Keyboard"`.
   - Click category filter buttons (`Electronics`, `Gaming`, `Clothing`) to test instant filtering.

2. **Inspect Product Details**:
   - Click **Details** on any product card to view `product-details.html`.
   - Test the `+` and `-` quantity selectors. Notice that it is capped at the maximum available stock.

3. **Add to Cart**:
   - Click **Add to Shopping Cart**. Notice the cart counter badge in the header increments.
   - Click the **Cart** icon in the navigation bar to visit `cart.html`.
   - Adjust quantities or test removing an item. Notice line totals and subtotal update instantly.

4. **Checkout & Authentication**:
   - Click **Proceed to Checkout**.
   - Because you are not logged in, you will be redirected to `login.html`.
   - Click **Quick-Fill Seeded Demo Account** to automatically populate:
     - **Email**: `demo@codealpha.com`
     - **Password**: `password123`
   - Alternatively, visit `register.html` to create a new custom account.
   - Click **Log In**. You will see the navigation update with your user badge and a **My Orders** link.

5. **Place Order**:
   - You are redirected to `checkout.html`. Fill in a sample delivery address.
   - Click **Confirm & Place Order**.
   - The backend validates stock, recalculates the trusted total, decrements stock in the database, and registers the order.

6. **Review Order History**:
   - You are redirected to `order-details.html` displaying your itemized receipt and order ID.
   - Click **My Orders** in the header to view your complete order history.

---

## Screenshots

*(Screenshots can be placed in `CodeAlpha_Ecommerce/frontend/assets/` and linked here for submission)*

- **Home Page Catalog**: Storefront showcasing featured products, search, and category pills.
- **Product Details**: Individual product view with quantity controls and stock badges.
- **Shopping Cart**: Itemized cart summary with live quantity and price calculations.
- **Checkout**: Order summary with customer delivery form.
- **Order Confirmation & History**: Itemized order receipts with status tracking.

---

## Future Improvements

The current version fulfills all CodeAlpha Task 1 mandatory requirements. Future enhancements may include:
- **Payment Gateway Integration**: Integration with Stripe or PayPal for live card processing.
- **Admin Dashboard**: Web portal for store owners to add/edit products and manage inventory.
- **Customer Reviews & Ratings**: Star ratings and written reviews on product detail pages.
- **Wishlist**: Allowing customers to save favorite items for future shopping sessions.
- **Email Notifications**: Automated order confirmation and delivery status emails.

---

## Author

**Md. Tanjimul Islam**  
*CodeAlpha Full Stack Development Internship*
