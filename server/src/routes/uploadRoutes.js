import express from 'express';
import upload from '../config/multer.js';
import { uploadFile, uploadFiles, submitText, getPreview, getRagStatus } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/file', upload.single('file'), uploadFile);
router.post('/files', upload.array('files', 10), uploadFiles); // Up to 10 files
router.post('/text', submitText);
router.get('/:id/preview', getPreview);
router.get('/:id/rag-status', getRagStatus);

export default router;
