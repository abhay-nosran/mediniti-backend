import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pool from '../db/connection';
import { sendGapAnalysisEmails } from '../services/emailService';
import { validate } from '../middleware/validate';
import { GapAnalysisFormData } from '../types';

const router = Router();

// ─── Rate limiter: 10 requests per 15 minutes per IP ─────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: false,
});

// ─── Validation rules ─────────────────────────────────────────────────────────
const gapAnalysisValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('hospitalName')
    .trim()
    .notEmpty().withMessage('Hospital / facility name is required.')
    .isLength({ max: 255 }).withMessage('Hospital name must be 255 characters or fewer.'),

  body('hospitalType')
    .trim()
    .notEmpty().withMessage('Hospital type is required.')
    .isLength({ max: 100 }).withMessage('Hospital type must be 100 characters or fewer.'),

  body('numberOfBeds')
    .notEmpty().withMessage('Number of beds is required.')
    .isInt({ min: 1 }).withMessage('Number of beds must be a positive integer.'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required.')
    .isLength({ max: 100 }).withMessage('City must be 100 characters or fewer.'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required.')
    .isLength({ max: 100 }).withMessage('State must be 100 characters or fewer.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits.'),

  body('accreditationStatus')
    .trim()
    .notEmpty().withMessage('Accreditation status is required.')
    .isLength({ max: 100 }).withMessage('Accreditation status must be 100 characters or fewer.'),

  body('preferredConsultationDate')
    .trim()
    .notEmpty().withMessage('Preferred consultation date is required.')
    .isISO8601().withMessage('Preferred consultation date must be a valid date (YYYY-MM-DD).')
    .custom((value: string) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Preferred consultation date must be today or a future date.');
      }
      return true;
    }),

  body('additionalNotes')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Additional notes must be 2 000 characters or fewer.'),
];

// ─── POST /api/gap-analysis ───────────────────────────────────────────────────
router.post('/', limiter, validate(gapAnalysisValidation), async (req: Request, res: Response): Promise<void> => {
  const data: GapAnalysisFormData = {
    name:                       req.body.name,
    hospitalName:               req.body.hospitalName,
    hospitalType:               req.body.hospitalType,
    numberOfBeds:               Number(req.body.numberOfBeds),
    city:                       req.body.city,
    state:                      req.body.state,
    email:                      req.body.email,
    phone:                      req.body.phone,
    accreditationStatus:        req.body.accreditationStatus,
    preferredConsultationDate:  req.body.preferredConsultationDate,
    additionalNotes:            req.body.additionalNotes ?? null,
  };

  // Extract the real client IP (behind proxies / load balancers)
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    null;

  try {
    // 1. Persist to database
    await pool.query(
      `INSERT INTO gap_analysis_bookings
         (name, hospital_name, hospital_type, number_of_beds, city, state,
          email, phone, accreditation_status, preferred_consultation_date,
          additional_notes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        data.name,
        data.hospitalName,
        data.hospitalType,
        data.numberOfBeds,
        data.city,
        data.state,
        data.email,
        data.phone,
        data.accreditationStatus,
        data.preferredConsultationDate,
        data.additionalNotes ?? null,
        ipAddress,
      ],
    );

    // 2. Send emails (user confirmation + admin notification)
    sendGapAnalysisEmails(data, ipAddress).catch((err) => {
      console.error('[Email] Failed to send gap analysis emails:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Your gap analysis booking has been received. Our team will contact you shortly to confirm your appointment.',
    });
  } catch (err) {
    console.error('[GapAnalysis] DB insert error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
});

export default router;
