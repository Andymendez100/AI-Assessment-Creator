import mongoose from 'mongoose';

const referenceDocumentSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['file_upload', 'text_paste'],
      required: true,
    },
    file: {
      originalName: String,
      mimeType: String,
      size: Number,
      path: String,
    },
    textContent: {
      type: String,
      required: true,
    },
    characterCount: {
      type: Number,
    },
    wordCount: {
      type: Number,
    },
    // RAG integration fields
    ragFileId: {
      type: String,
      default: null,
    },
    ragStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed', null],
      default: null,
    },
    ragError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Calculate counts before saving
referenceDocumentSchema.pre('save', function (next) {
  if (this.textContent) {
    this.characterCount = this.textContent.length;
    this.wordCount = this.textContent.trim().split(/\s+/).length;
  }
  next();
});

// Index for RAG status queries
referenceDocumentSchema.index({ ragStatus: 1 });

const ReferenceDocument = mongoose.model('ReferenceDocument', referenceDocumentSchema);

export default ReferenceDocument;
