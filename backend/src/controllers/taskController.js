import { z } from 'zod';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import Task from '../models/Task.js';

const taskInputSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['Todo', 'In Progress', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  dueDate: z.string().min(1).optional()
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['Todo', 'In Progress', 'Done']).optional().default('Todo'),
  priority: z.enum(['Low', 'Medium', 'High']).optional().default('Medium'),
  dueDate: z.string().min(1)
});

const taskListQuerySchema = z.object({
  status: z.enum(['Todo', 'In Progress', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const allowedTransitions = {
  Todo: ['Todo', 'In Progress'],
  'In Progress': ['In Progress', 'Done'],
  Done: ['Done']
};

function normalizeTask(task) {
  return {
    ...task,
    isOverdue: task.isOverdue ?? (task.dueDate && task.status !== 'Done' && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)))
  };
}

function parseDueDate(value) {
  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    throw new AppError('Valid due date is required', 400);
  }

  return dueDate;
}

const createTask = asyncHandler(async (req, res) => {
  const payload = taskCreateSchema.parse(req.body);

  const task = await Task.create({
    title: payload.title,
    description: payload.description || '',
    status: payload.status,
    priority: payload.priority,
    dueDate: parseDueDate(payload.dueDate),
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, task: normalizeTask(task.toObject()) });
});

const getTasks = asyncHandler(async (req, res) => {
  const query = taskListQuerySchema.parse(req.query);
  const page = query.page || 1;
  const limit = query.limit || 10;
  const match = { createdBy: new mongoose.Types.ObjectId(req.user._id) };

  if (query.status) {
    match.status = query.status;
  }

  if (query.priority) {
    match.priority = query.priority;
  }

  if (query.search) {
    match.title = { $regex: query.search, $options: 'i' };
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        priorityRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'High'] }, then: 0 },
              { case: { $eq: ['$priority', 'Medium'] }, then: 1 },
              { case: { $eq: ['$priority', 'Low'] }, then: 2 }
            ],
            default: 3
          }
        }
      }
    },
    { $sort: { priorityRank: 1, createdAt: -1 } },
    {
      $facet: {
        meta: [{ $count: 'total' }],
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
      }
    }
  ];

  const [result] = await Task.aggregate(pipeline);
  const total = result.meta[0]?.total || 0;
  const tasks = (result.data || []).map((task) => normalizeTask(task));

  res.json({
    success: true,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    },
    tasks
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const payload = taskInputSchema.parse(req.body);
  const query = { _id: req.params.id };
  
  // Admins can update any task, members can only update their own
  if (req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }
  
  const task = await Task.findOne(query);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (payload.status && payload.status !== task.status) {
    const allowed = allowedTransitions[task.status] || [task.status];

    if (!allowed.includes(payload.status)) {
      throw new AppError(`Invalid status transition from ${task.status} to ${payload.status}`, 400);
    }

    task.status = payload.status;
  }

  if (payload.title !== undefined) {
    task.title = payload.title;
  }

  if (payload.description !== undefined) {
    task.description = payload.description;
  }

  if (payload.priority !== undefined) {
    task.priority = payload.priority;
  }

  if (payload.dueDate !== undefined) {
    task.dueDate = parseDueDate(payload.dueDate);
  }

  await task.save();
  res.json({ success: true, task: normalizeTask(task.toObject()) });
});

const deleteTask = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  
  // Admins can delete any task, members can only delete their own
  if (req.user.role !== 'admin') {
    query.createdBy = req.user._id;
  }
  
  const deletedTask = await Task.findOneAndDelete(query);

  if (!deletedTask) {
    throw new AppError('Task not found', 404);
  }

  res.json({ success: true, message: 'Task deleted successfully' });
});

const getTaskStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [stats] = await Task.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              { $and: [{ $lt: ['$dueDate', now] }, { $ne: ['$status', 'Done'] }] },
              1,
              0
            ]
          }
        },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } }
      }
    }
  ]);

  res.json({
    success: true,
    stats: {
      totalTasks: stats?.totalTasks || 0,
      completedTasks: stats?.completedTasks || 0,
      overdueTasks: stats?.overdueTasks || 0,
      byPriority: {
        High: stats?.high || 0,
        Medium: stats?.medium || 0,
        Low: stats?.low || 0
      }
    }
  });
});

const getAllTasks = asyncHandler(async (req, res) => {
  const query = taskListQuerySchema.parse(req.query);
  const page = query.page || 1;
  const limit = query.limit || 10;
  const match = {};

  if (query.status) {
    match.status = query.status;
  }

  if (query.priority) {
    match.priority = query.priority;
  }

  if (query.search) {
    match.title = { $regex: query.search, $options: 'i' };
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }
    },
    { $unwind: '$creator' },
    {
      $addFields: {
        priorityRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'High'] }, then: 0 },
              { case: { $eq: ['$priority', 'Medium'] }, then: 1 },
              { case: { $eq: ['$priority', 'Low'] }, then: 2 }
            ],
            default: 3
          }
        }
      }
    },
    { $sort: { priorityRank: 1, createdAt: -1 } },
    {
      $facet: {
        meta: [{ $count: 'total' }],
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              status: 1,
              priority: 1,
              dueDate: 1,
              createdAt: 1,
              'creator.name': 1,
              'creator.email': 1
            }
          }
        ]
      }
    }
  ];

  const [result] = await Task.aggregate(pipeline);
  const total = result.meta[0]?.total || 0;
  const tasks = (result.data || []).map((task) => normalizeTask(task));

  res.json({
    success: true,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    },
    tasks
  });
});

export {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getTaskStats,
  getAllTasks
};
