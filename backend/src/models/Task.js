import mongoose from 'mongoose';

const priorityOrder = {
  High: 0,
  Medium: 1,
  Low: 2
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'Done'],
      default: 'Todo'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

taskSchema.virtual('isOverdue').get(function isOverdue() {
  if (!this.dueDate || this.status === 'Done') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(this.dueDate) < today;
});

taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdBy: 1, status: 1, priority: 1, createdAt: -1 });

taskSchema.statics.priorityOrder = priorityOrder;

export default mongoose.model('Task', taskSchema);
