import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getTaskStats,
  getAllTasks
} from '../controllers/taskController.js';

const router = express.Router();

router.use(protect);

// Admin-only routes
router.get('/admin/all', authorize('admin'), getAllTasks);

router.get('/stats', getTaskStats);
router.route('/').post(createTask).get(getTasks);
router.route('/:id').patch(updateTask).delete(deleteTask);

export default router;
