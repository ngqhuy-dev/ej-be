# JinStore API Documentation

## Base URL

```
https://api.jinstore.com/v1
```

## Authentication

### 1. Đăng ký tài khoản

```
POST /auth/register
```

**Body:**

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

### 2. Đăng nhập

```
POST /auth/login
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Lấy thông tin người dùng

```
GET /auth/me
```

**Headers:**

```
Authorization: Bearer <token>
```

---

## Products

### 1. Lấy danh sách sản phẩm

```
GET /products
```

### 2. Lấy thông tin chi tiết sản phẩm

```
GET /products/{id}
```

### 3. Tạo sản phẩm (Admin)

```
POST /products
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

**Body:**

```json
{
  "name": "Product Name",
  "price": 100,
  "category": "Category ID",
  "stock": 50
}
```

### 4. Cập nhật sản phẩm (Admin)

```
PUT /products/{id}
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

### 5. Xóa sản phẩm (Admin)

```
DELETE /products/{id}
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

---

## Orders

### 1. Tạo đơn hàng

```
POST /orders
```

**Headers:**

```
Authorization: Bearer <token>
```

**Body:**

```json
{
  "items": [{ "productId": "product_id", "quantity": 2 }],
  "paymentMethod": "credit_card"
}
```

### 2. Lấy danh sách đơn hàng của người dùng

```
GET /orders
```

**Headers:**

```
Authorization: Bearer <token>
```

### 3. Lấy chi tiết đơn hàng

```
GET /orders/{id}
```

**Headers:**

```
Authorization: Bearer <token>
```

---

## Wishlist

### 1. Thêm sản phẩm vào danh sách yêu thích

```
POST /wishlist
```

**Headers:**

```
Authorization: Bearer <token>
```

**Body:**

```json
{
  "productId": "product_id"
}
```

### 2. Lấy danh sách yêu thích của người dùng

```
GET /wishlist
```

**Headers:**

```
Authorization: Bearer <token>
```

### 3. Xóa sản phẩm khỏi danh sách yêu thích

```
DELETE /wishlist/{id}
```

**Headers:**

```
Authorization: Bearer <token>
```

---

## Payments

### 1. Thanh toán đơn hàng

```
POST /payments
```

**Headers:**

```
Authorization: Bearer <token>
```

**Body:**

```json
{
  "orderId": "order_id",
  "paymentMethod": "credit_card"
}
```

---

## Categories

### 1. Lấy danh sách danh mục sản phẩm

```
GET /categories
```

### 2. Lấy danh mục sản phẩm theo ID

```
GET /categories/{id}
```

### 3. Tạo danh mục mới (Admin)

```
POST /categories
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

**Body:**

```json
{
  "name": "Category Name"
}
```

### 4. Cập nhật danh mục (Admin)

```
PUT /categories/{id}
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

### 5. Xóa danh mục (Admin)

```
DELETE /categories/{id}
```

**Headers:**

```
Authorization: Bearer <admin-token>
```
