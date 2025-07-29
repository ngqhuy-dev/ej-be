# Production Setup Guide (Frontend Local + Backend Production)

## Environment Variables cần thiết cho Render:

### 1. Database

```
MONGODB_URI=your_mongodb_connection_string
```

### 2. JWT Secrets

```
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
```

### 3. Session

```
SESSION_SECRET=your_session_secret_key
```

### 4. Client URLs (Frontend local)

```
CLIENT_URL_V1=http://localhost:5173
CLIENT_URL_V2=http://localhost:3000
```

### 5. Cookie Settings (Không cần thiết cho localhost)

```
# Để trống hoặc không set
# COOKIE_DOMAIN=
SECURE_COOKIES=false
```

### 6. Google OAuth

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 7. Environment

```
NODE_ENV=production
```

## Các bước setup trên Render:

1. **Thêm Environment Variables** trong Render dashboard
2. **Cập nhật Google OAuth Redirect URIs** trong Google Console:
   - `https://your-backend-domain.onrender.com/api/auth/google/callback`
3. **Đảm bảo frontend local** gọi API với `withCredentials: true`
4. **Kiểm tra logs** để debug nếu có lỗi

## Cấu hình Frontend (Local):

### 1. Cập nhật API URL trong frontend:

```javascript
// Trong file .env hoặc config
VITE_API_URL_V1=https://your-backend-domain.onrender.com/api
```

### 2. Đảm bảo axios calls có withCredentials:

```javascript
const res = await axios.get(`${API_URL}/auth/login/success`, {
  withCredentials: true,
});
```

## Debug tips:

1. **Kiểm tra CORS logs** trên Render console
2. **Test debug route**: `GET https://your-backend-domain.onrender.com/api/auth/debug`
3. **Kiểm tra cookies** trong browser dev tools (Application tab)
4. **Kiểm tra Network tab** trong browser để xem requests

## Troubleshooting:

### Lỗi "Không có thông tin đăng nhập":

1. Kiểm tra cookies có được gửi không
2. Kiểm tra CORS origin có được cho phép không
3. Kiểm tra `withCredentials: true` trong frontend

### Lỗi CORS:

1. Kiểm tra origin trong logs
2. Đảm bảo localhost ports được thêm vào allowedOrigins
3. Kiểm tra `credentials: true` trong CORS config

### Lỗi "Request header field token is not allowed":

1. **Kiểm tra logs trên Render** để xem preflight requests
2. **Đảm bảo header 'token' được cho phép** trong CORS config
3. **Kiểm tra frontend** có gửi đúng format: `token: Bearer ${accessToken}`
4. **Test với Postman** để xác nhận API hoạt động

### Debug CORS:

1. **Kiểm tra browser console** để xem lỗi chi tiết
2. **Kiểm tra Network tab** trong DevTools
3. **Xem logs trên Render** để thấy preflight requests
4. **Test debug route**: `GET https://your-backend-domain.onrender.com/api/auth/debug`

### Common CORS Headers được cho phép:

- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `token`
- `x-access-token`
- `x-refresh-token`
- `Accept`
- `Origin`
- `Cache-Control`
- `X-File-Name`
