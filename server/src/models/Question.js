import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false'],
    required: true
  },
  questionText: {
    type: String,
    required: true,
    maxLength: 2000
  },
  options: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxLength: 500
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: Boolean
  },
  explanation: {
    type: String,
    maxLength: 1000
  },
  isManuallyEdited: {
    type: Boolean,
    default: false
  },
  regenerationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

questionSchema.index({ assessment: 1, order: 1 });

const Question = mongoose.model('Question', questionSchema);

export default Question;
