import fs from 'fs/promises';
import ReferenceDocument from '../models/ReferenceDocument.js';
import { parseDocument, deleteFile } from '../services/documentParser.js';
import * as ragService from '../services/ragService.js';
import { RAG_ENABLED, PREVIEW_LENGTH } from '../config/constants.js';

/**
 * Process RAG upload and update document status
 * Unified function for both file and text uploads
 */
async function processRagUpload(documentId, uploadFn) {
  try {
    const uploadResult = await uploadFn();
    const ragFileId = uploadResult.id;

    console.log(`RAG upload started for document ${documentId}, ragFileId: ${ragFileId}`);

    await ReferenceDocument.findByIdAndUpdate(documentId, {
      ragFileId,
      ragStatus: 'processing',
    });

    await ragService.waitForProcessing(ragFileId);

    await ReferenceDocument.findByIdAndUpdate(documentId, {
      ragStatus: 'ready',
    });

    console.log(`RAG processing complete for document ${documentId}`);
  } catch (error) {
    console.error(`RAG upload failed for document ${documentId}:`, error);
    await ReferenceDocument.findByIdAndUpdate(documentId, {
      ragStatus: 'failed',
      ragError: error.message,
    });
  }
}

/**
 * Build preview text with consistent length
 */
const buildPreview = (text) => {
  return text.length > PREVIEW_LENGTH ? text.substring(0, PREVIEW_LENGTH) + '...' : text;
};

/**
 * Build response data for a reference document
 */
const buildDocumentResponse = (doc, textContent, fileName) => ({
  id: doc._id,
  sourceType: doc.sourceType,
  fileName,
  characterCount: doc.characterCount,
  wordCount: doc.wordCount,
  preview: buildPreview(textContent),
  ragStatus: doc.ragStatus,
});

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, path } = req.file;
    const textContent = await parseDocument(path, mimetype);

    const referenceDocument = await ReferenceDocument.create({
      sourceType: 'file_upload',
      file: { originalName: originalname, mimeType: mimetype, size, path },
      textContent,
      ragStatus: RAG_ENABLED ? 'pending' : null,
    });

    if (RAG_ENABLED) {
      const fileBuffer = await fs.readFile(path);
      processRagUpload(referenceDocument._id, () => ragService.uploadFileAsync(fileBuffer, originalname, mimetype));
    }

    res.status(201).json({
      success: true,
      data: buildDocumentResponse(referenceDocument, textContent, originalname),
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteFile(req.file.path);
    }
    next(error);
  }
};

export const uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const { originalname, mimetype, size, path } = file;
        const textContent = await parseDocument(path, mimetype);

        const referenceDocument = await ReferenceDocument.create({
          sourceType: 'file_upload',
          file: { originalName: originalname, mimeType: mimetype, size, path },
          textContent,
          ragStatus: RAG_ENABLED ? 'pending' : null,
        });

        if (RAG_ENABLED) {
          const fileBuffer = await fs.readFile(path);
          processRagUpload(referenceDocument._id, () => ragService.uploadFileAsync(fileBuffer, originalname, mimetype));
        }

        results.push(buildDocumentResponse(referenceDocument, textContent, originalname));
      } catch (fileError) {
        errors.push({ fileName: file.originalname, error: fileError.message });
        await deleteFile(file.path).catch(() => {});
      }
    }

    res.status(201).json({
      success: true,
      data: {
        documents: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    if (req.files) {
      await Promise.all(req.files.map((f) => deleteFile(f.path).catch(() => {})));
    }
    next(error);
  }
};

export const submitText = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    const trimmedText = text.trim();

    const referenceDocument = await ReferenceDocument.create({
      sourceType: 'text_paste',
      textContent: trimmedText,
      ragStatus: RAG_ENABLED ? 'pending' : null,
    });

    if (RAG_ENABLED) {
      processRagUpload(referenceDocument._id, () => ragService.uploadTextAsync(trimmedText, `text-${referenceDocument._id}.txt`));
    }

    res.status(201).json({
      success: true,
      data: buildDocumentResponse(referenceDocument, trimmedText, null),
    });
  } catch (error) {
    next(error);
  }
};

export const getPreview = async (req, res, next) => {
  try {
    const referenceDocument = await ReferenceDocument.findById(req.params.id);

    if (!referenceDocument) {
      return res.status(404).json({ success: false, error: 'Reference document not found' });
    }

    res.json({
      success: true,
      data: {
        id: referenceDocument._id,
        sourceType: referenceDocument.sourceType,
        fileName: referenceDocument.file?.originalName,
        characterCount: referenceDocument.characterCount,
        wordCount: referenceDocument.wordCount,
        textContent: referenceDocument.textContent,
        ragStatus: referenceDocument.ragStatus,
        ragError: referenceDocument.ragError,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRagStatus = async (req, res, next) => {
  try {
    const referenceDocument = await ReferenceDocument.findById(req.params.id);

    if (!referenceDocument) {
      return res.status(404).json({ success: false, error: 'Reference document not found' });
    }

    res.json({
      success: true,
      data: {
        id: referenceDocument._id,
        ragStatus: referenceDocument.ragStatus,
        ragFileId: referenceDocument.ragFileId,
        ragError: referenceDocument.ragError,
      },
    });
  } catch (error) {
    next(error);
  }
};
