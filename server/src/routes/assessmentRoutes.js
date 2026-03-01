import express from 'express';
import {
  getAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  archiveAssessment
} from '../controllers/assessmentController.js';

const router = express.Router();

router.get('/', getAssessments);
router.get('/:id', getAssessment);
router.post('/', createAssessment);
router.put('/:id', updateAssessment);
router.delete('/:id', deleteAssessment);
router.patch('/:id/publish', publishAssessment);
router.patch('/:id/archive', archiveAssessment);

export default router;
