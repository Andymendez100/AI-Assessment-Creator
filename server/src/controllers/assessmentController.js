import Assessment from '../models/Assessment.js';
import Question from '../models/Question.js';
import ReferenceDocument from '../models/ReferenceDocument.js';
import * as ragService from '../services/ragService.js';

export const getAssessments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [assessments, total] = await Promise.all([
      Assessment.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-questions'),
      Assessment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: assessments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate('referenceDocuments').populate('questions');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
};

export const createAssessment = async (req, res, next) => {
  try {
    const { title, description, configuration, referenceDocumentId, referenceDocumentIds, tags } = req.body;

    // Support both single ID (legacy) and array of IDs
    let docIds = referenceDocumentIds || (referenceDocumentId ? [referenceDocumentId] : []);

    // Verify all reference documents exist
    if (docIds.length > 0) {
      const refDocs = await ReferenceDocument.find({ _id: { $in: docIds } });
      if (refDocs.length !== docIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more reference documents not found',
        });
      }
    }

    const assessment = await Assessment.create({
      title,
      description,
      configuration,
      referenceDocuments: docIds,
      tags,
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssessment = async (req, res, next) => {
  try {
    const { title, description, configuration, tags } = req.body;

    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    if (assessment.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify a published assessment',
      });
    }

    assessment.title = title || assessment.title;
    assessment.description = description !== undefined ? description : assessment.description;
    assessment.configuration = configuration || assessment.configuration;
    assessment.tags = tags || assessment.tags;
    assessment.metadata.lastModifiedAt = new Date();

    await assessment.save();

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    // Delete associated questions
    await Question.deleteMany({ assessment: assessment._id });

    // Delete reference documents and their RAG files if exist
    if (assessment.referenceDocuments?.length > 0) {
      const refDocs = await ReferenceDocument.find({ _id: { $in: assessment.referenceDocuments } });

      // Clean up RAG files (don't await - fire and forget)
      for (const doc of refDocs) {
        if (doc.ragFileId) {
          ragService.deleteFile(doc.ragFileId).catch((err) => console.warn(`Failed to delete RAG file ${doc.ragFileId}:`, err.message));
        }
      }

      await ReferenceDocument.deleteMany({ _id: { $in: assessment.referenceDocuments } });
    }

    await assessment.deleteOne();

    res.json({
      success: true,
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const publishAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate('questions');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    if (assessment.questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish assessment without questions',
      });
    }

    assessment.status = 'published';
    assessment.publishedAt = new Date();

    await assessment.save();

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
      });
    }

    assessment.status = 'archived';
    await assessment.save();

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
};
