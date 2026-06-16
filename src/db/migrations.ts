import pool from './connection';

/**
 * Run all CREATE TABLE IF NOT EXISTS migrations on startup.
 * This is intentionally non-destructive — it will never drop or alter
 * existing tables, only create them if they are missing.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── contact_submissions ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id           SERIAL        PRIMARY KEY,
        name         VARCHAR(255)  NOT NULL,
        organization VARCHAR(255)  NOT NULL,
        designation  VARCHAR(255)  NOT NULL,
        email        VARCHAR(255)  NOT NULL,
        phone        VARCHAR(20)   NOT NULL,
        message      TEXT          NOT NULL,
        ip_address   VARCHAR(45),
        created_at   TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    // ── gap_analysis_bookings ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gap_analysis_bookings (
        id                         SERIAL       PRIMARY KEY,
        name                       VARCHAR(255) NOT NULL,
        hospital_name              VARCHAR(255) NOT NULL,
        hospital_type              VARCHAR(100) NOT NULL,
        number_of_beds             INTEGER      NOT NULL,
        city                       VARCHAR(100) NOT NULL,
        state                      VARCHAR(100) NOT NULL,
        email                      VARCHAR(255) NOT NULL,
        phone                      VARCHAR(20)  NOT NULL,
        accreditation_status       VARCHAR(100) NOT NULL,
        preferred_consultation_date DATE        NOT NULL,
        additional_notes           TEXT,
        ip_address                 VARCHAR(45),
        created_at                 TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('[DB] Migrations ran successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
