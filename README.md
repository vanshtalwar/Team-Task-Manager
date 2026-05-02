# Complete Role-Based Access Control Implementation Guide

## ✅ What's Been Implemented

### Backend
- ✅ User model with role field (admin/member)
- ✅ JWT includes role in token payload
- ✅ `authorize()` middleware for role-based route protection
- ✅ Admin endpoint `/tasks/admin/all` to view all tasks
- ✅ Tasks include creator information in admin view
- ✅ Script to create/promote admin users

### Frontend
- ✅ API integration for admin endpoint
- ✅ Admin badge display in header
- ✅ Toggle button "All Tasks" / "My Tasks" (admin only)
- ✅ Creator information display in tasks
- ✅ Responsive design

---

## 🚀 Quick Start

### 1. Create an Admin User

Choose one method:

**Method A: Using the provided script**
```bash
cd backend
node scripts/createAdmin.js admin@example.com Admin123 "Admin User"
```

**Method B: Direct database update**
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### 2. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm install  # if needed
npm start    # or npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install  # if needed
npm run dev
```

---

## 🧪 Testing the Implementation

### Test Scenario 1: Member User
```
1. Go to http://localhost:5173 (frontend)
2. Click "Register"
3. Create account: 
   - Name: John Member
   - Email: member@example.com
   - Password: Password123
4. ✅ You should see:
   - Your name in header
   - NO "Admin" badge
   - NO "All Tasks" button
   - Create a task and see only your tasks
5. Logout
```

### Test Scenario 2: Admin User
```
1. Go to http://localhost:5173
2. Click "Register" 
3. Create account:
   - Name: Jane Admin
   - Email: admin@example.com
   - Password: Password123
4. Database: Promote to admin
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
5. Logout and re-login
6. ✅ You should now see:
   - "Admin" badge in blue
   - "All Tasks" button in header
   - Create some tasks as admin
   - Click "All Tasks" button
   - ✅ See all tasks with creator names
   - Click "My Tasks" to go back
7. Test switching between views multiple times
8. Logout
```

### Test Scenario 3: Different Users' Tasks
```
1. Login as member@example.com
   - Create task: "Member Task 1"
   - Create task: "Member Task 2"
   - Logout

2. Login as admin@example.com
   - Create task: "Admin Task 1"
   - Click "All Tasks"
   - ✅ See all 3 tasks with creator info:
     - "Member Task 1" - Created by: John Member
     - "Member Task 2" - Created by: John Member
     - "Admin Task 1" - Created by: Jane Admin
   - Click "My Tasks"
   - ✅ See only "Admin Task 1"
   - Logout

3. Login as member@example.com
   - ✅ See only member's tasks
   - Edit/delete your tasks
   - NO "All Tasks" button visible
```

---

## 📊 API Endpoints Reference

### Authentication
```
POST /auth/register
POST /auth/login
Response: { token, user: { id, name, email, role } }
```

### Tasks - Member Access
```
GET /tasks - Get user's tasks
POST /tasks - Create task
PATCH /tasks/:id - Update task
DELETE /tasks/:id - Delete task
GET /tasks/stats - Get user's stats
```

### Tasks - Admin Only
```
GET /tasks/admin/all - Get all tasks with creator info
```

---

## 🔍 Expected Behavior

### Member User Flow
1. Login/Register ✅
2. Role stored in localStorage
3. No admin features visible
4. Can see only own tasks
5. Can filter, paginate, create, update, delete own tasks
6. Stats show only their metrics

### Admin User Flow
1. Login/Register ✅
2. Role stored in localStorage
3. "Admin" badge visible ✅
4. "All Tasks" / "My Tasks" toggle visible ✅
5. Default view: My Tasks (same as members)
6. Click "All Tasks" → See all system tasks with creator names
7. Filtering works in both views
8. Can create own tasks
9. Stats show their personal metrics

---

## 🛠️ Troubleshooting

### "Cannot find role in header"
- **Issue**: Role badge not showing after login
- **Fix**: Make sure backend returns role in login response
- **Check**: `backend/src/controllers/authController.js` - verify `user.role` is included

### "All Tasks button not showing"
- **Issue**: Admin user but no toggle button
- **Fix**: Logout and login again (token needs to be refreshed with new role)
- **Alternative**: Check localStorage - delete `task-user` and re-login

### "Tasks show wrong creator"
- **Issue**: Creator names not displaying
- **Fix**: Verify backend is returning `creator` object with name
- **Check**: API response from `/tasks/admin/all` includes `creator: { name, email }`

### CORS errors
- **Issue**: Frontend can't reach backend
- **Fix**: Check VITE_API_URL in `.env`
- **Default**: `VITE_API_URL=http://localhost:5000`
- **Update if backend runs on different port**

---

## 📝 File Locations

### Backend Files
```
backend/
├── src/
│   ├── models/User.js (role field)
│   ├── controllers/authController.js (role in JWT)
│   ├── middleware/authMiddleware.js (authorize function)
│   ├── routes/taskRoutes.js (admin routes)
│   └── controllers/taskController.js (getAllTasks)
└── scripts/
    └── createAdmin.js (admin creation script)
```

### Frontend Files
```
frontend/
└── src/
    ├── api.js (fetchAllTasks function)
    ├── App.jsx (adminView state, conditional rendering)
    └── styles.css (role badge & admin UI styles)
```

### Documentation
```
RBAC-SETUP.md - Backend role setup guide
FRONTEND-RBAC.md - Frontend integration guide
COMPLETE-SETUP.md - This file
```

---

## ✨ Next Steps (Optional Enhancements)

1. **Add Task Assignment**: Allow admins to assign tasks to members
2. **Admin Dashboard**: Show system-wide statistics
3. **User Management**: Admin page to manage users and roles
4. **Activity Logs**: Track who did what and when
5. **Permissions Matrix**: More granular permissions (editor, viewer, etc.)
6. **Email Notifications**: Notify users when tasks are assigned
7. **Audit Trail**: Log all important actions by admins

---

## 💡 Key Concepts

### JWT Token Structure
```javascript
{
  sub: "userId",
  role: "admin" | "member",
  iat: timestamp,
  exp: timestamp
}
```

### Role Checks
- **Frontend**: `auth.user?.role === 'admin'` to show/hide features
- **Backend**: `authorize('admin')` middleware to protect routes

### Task Visibility
- **Member**: Sees only tasks where `createdBy === req.user._id`
- **Admin**: Sees all tasks (no filter restriction)

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the API responses in browser DevTools
3. Check server logs for errors
4. Verify database connections
5. Ensure both backend and frontend are running

---

**Last Updated**: 1 May 2026  
**Status**: ✅ Complete Implementation
