import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pool from '../db/connection';
import { sendContactEmails } from '../services/emailService';
import { validate } from '../middleware/validate';
import { ContactFormData } from '../types';

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
const contactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('organization')
    .trim()
    .notEmpty().withMessage('Organisation is required.')
    .isLength({ max: 255 }).withMessage('Organisation must be 255 characters or fewer.'),

  body('designation')
    .trim()
    .notEmpty().withMessage('Designation is required.')
    .isLength({ max: 255 }).withMessage('Designation must be 255 characters or fewer.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits.'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters.')
    .isLength({ max: 5000 }).withMessage('Message must be 5 000 characters or fewer.'),
];

// ─── POST /api/contact ────────────────────────────────────────────────────────
router.post('/', limiter, validate(contactValidation), async (req: Request, res: Response): Promise<void> => {
  const data: ContactFormData = {
    name:         req.body.name,
    organization: req.body.organization,
    designation:  req.body.designation,
    email:        req.body.email,
    phone:        req.body.phone,
    message:      req.body.message,
  };

  // Extract the real client IP (behind proxies / load balancers)
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    null;

  try {
    // 1. Persist to database
    await pool.query(
      `INSERT INTO contact_submissions
         (name, organization, designation, email, phone, message, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.name, data.organization, data.designation, data.email, data.phone, data.message, ipAddress],
    );

    // 2. Send emails (user confirmation + admin notification)
    //    We don't block the success response on email failure — log it and move on.
    sendContactEmails(data, ipAddress).catch((err) => {
      console.error('[Email] Failed to send contact emails:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will respond within 24 hours.',
    });
  } catch (err) {
    console.error('[Contact] DB insert error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
});

export default router;
