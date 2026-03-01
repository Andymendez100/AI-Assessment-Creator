import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  configuration: {
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    questionType: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'mixed'],
      required: true
    },
    answerOptionsCount: {
      type: Number,
      min: 2,
      max: 6,
      default: 4
    }
  },
  referenceDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferenceDocument'
  }],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  metadata: {
    generatedAt: Date,
    lastModifiedAt: Date,
    generationModel: String,
    totalRegenerations: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

assessmentSchema.index({ status: 1, createdAt: -1 });
assessmentSchema.index({ title: 'text', description: 'text' });

const Assessment = mongoose.model('Assessment', assessmentSchema);

export default Assessment;
