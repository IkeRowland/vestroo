# 🛺⚡ Vestroo - Electric Vehicle Booking System

## 🚀 Project Introduction
Vestroo is a smart electric vehicle booking system designed to optimize internal transportation within large urban areas, especially at **VinHome Grand Park (VHGP), Ho Chi Minh City**. The application addresses the inconvenience and inefficiency of traditional transportation methods by providing a **centralized, user-friendly, and eco-friendly platform**.

### 🎯 Key Features:
- **Real-time Tracking**: Live updates on vehicle locations.
- **Route Optimization**: Suggests the most efficient routes.
- **Online Payment**: Supports multiple convenient payment methods.
- **User-Friendly Experience**: Intuitive and easy-to-use interface.

### 🚗 Web dành cho Khách Hàng  
[Vestroo - Customer](https://vestroo.vercel.app/)

### 🏢 Web dành cho Quản Lý  
[Vestroo - Manager](https://vestroo-manager.vercel.app/)

### 🛠️ Web dành cho Admin  
[Vestroo - Admin](https://vestroo-admin.vercel.app/)

---
## 📌 Main Features

### 🖥 Web Application for **Admin**
✅ User Management (add, edit, delete user information).
✅ Service Pricing Management (view, update pricing).
✅ Vehicle Category Management (add, edit, delete categories).
✅ Vehicle Information Management (add, edit, delete vehicle details).
✅ Route Management (add, edit, delete routes).
✅ Cash Flow Management (view, edit payment information).

### 🏢 Web Application for **Manager**
✅ Driver Management (view, add, edit, delete driver information).
✅ Booking Management (view booking details).
✅ Driver Schedule Management (edit schedules).
✅ Customer Feedback Management (view and respond to feedback).

### 📱 Mobile Application for **Driver**
✅ View booking information and accept bookings.
✅ View personal schedules and check-in/check-out.
✅ Chat with customers.

### 🌐 Web Application for **Customer**
✅ Book services (hourly rental, route rental, ride-sharing).
✅ Real-time Ride Tracking (view driver and vehicle information).
✅ Rate and provide feedback on services.
✅ Manage personal information and receive notifications.

---
## 🛠 Technologies Used
🚀 Below are the technologies used in the Vestroo system:

| 🚀 **Technology**  | 🔍 **Description** |
|----------------|--------------|
| ![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=white) **Frontend** | Next.js (Web), React Native (Mobile) |
| ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white) **Backend** | NestJS |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white) **Database** | MongoDB |
| ![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white) **Version Control** | Git/GitHub |
| ![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white) **Deployment** | Vercel |
| ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?logo=swagger&logoColor=black) **API Documentation** | Swagger |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) **Language** | TypeScript |

---
## 📖 Installation and Running Guide

### 🔧 1. Backend (Server API)
```bash
# Clone repository
git clone https://github.com/BenSkye/Vin_Shuttle_Capstone.git

# Move to the backend directory
cd backend

# Install dependencies
npm install

# Run the server
tsc && npm run start

# Run the server swagger
 npm  start --watch   
```
🔥 **Swagger API Documentation**: After starting, access `[http://localhost:3000/api](http://localhost:2028/api-docs)` to view the API documentation.

### 🌐 2. Frontend (Admin, Manager, Customer)
```bash
# Move to the respective frontend directory
cd frontend-admin  # or frontend-manager, frontend-customer

# Install dependencies
npm install

# Run the application
npm run dev
```

### 📱 3. Mobile (Driver)
```bash
# Move to the mobile directory
cd frontend-driver

# Install dependencies
npm install

# Run the application
npm start
```

---
## 📌 Swagger Documentation Guide
**Swagger UI** is used to document the API, allowing direct testing of API endpoints.

- Access Swagger UI at: **`http://localhost:3000/api`**
- API endpoints are automatically generated based on **NestJS** decorators.
- Data is returned in **JSON** format.

---
## 🚀 Contribution & Development
We welcome all contributions to improve the **Vestroo** system!

### 🌟 How to Contribute:
1. Fork this repo 🍴
2. Create a new branch (`git checkout -b feature-awesome`) ✨
3. Commit your changes (`git commit -m 'Add ABC feature'`) ✅
4. Push to the branch (`git push origin feature-awesome`) 🚀
5. Create a Pull Request 🛠

---
## 📄 License
This project is released under the **MIT License**. Please read the `LICENSE` file for more details.

---
## 🌟 Contact
📧 Email: nhatdm9a7@gmail.com  
🌐 Website: [Vestroo](https://vestroo.com)  
📌 Developed by **Vestroo Team** 🚀
