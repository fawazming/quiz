import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || process.env.IP || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.join(ROOT, 'data', 'quiz.db'),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-before-running-in-public',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'MSSN2026!',
  scorekeeperUsername: process.env.SCOREKEEPER_USERNAME || 'scorekeeper',
  scorekeeperPassword: process.env.SCOREKEEPER_PASSWORD || 'SCORE2026!',
  displayKey: process.env.DISPLAY_KEY || '',
  clientDist: path.join(ROOT, 'dist'),
  questionsFile: path.join(ROOT, 'data', 'questions.json')
};

export const SETTINGS_DEFAULTS = {
  event_name: 'MSSN Remo ICT Quiz 2026',
  event_theme: 'Anchored in Deen, Illuminated in Dunya and Digital',
  event_date: 'Thursday, 26th November 2026',
  sponsor_name: 'Rayyan Technologies',
  round1_enabled: 1,
  round2_enabled: 1,
  round3_enabled: 1,
  round1_label: 'CBT elimination',
  round2_label: 'Pick a number',
  round3_label: 'First to answer',
  theme_primary: '#0f5c4b',
  theme_accent: '#c39a2b',
  theme_ink: '#0c211d',
  sponsor_url: 'https://rayyantech.sgm.ng',
  round1_question_count: 50,
  round1_duration_minutes: 45,
  round1_points_per_correct: 2,
  qualify_top_n: 8,
  countdown_seconds: 5,
  round2_question_count: 22,
  round2_answer_seconds: 60,
  round2_base_points: 50,
  round2_speed_bonus: 25,
  round3_question_count: 22,
  round3_answer_seconds: 30,
  round3_base_points: 50,
  round3_speed_bonus: 25,
  round3_wrong_penalty: 0,
  round3_lock_on_first_answer: 1
};

export const NUMERIC_SETTINGS = new Set([
  'round1_question_count','round1_duration_minutes','round1_points_per_correct','qualify_top_n',
  'countdown_seconds','round2_question_count','round2_answer_seconds','round2_base_points',
  'round2_speed_bonus','round3_question_count','round3_answer_seconds','round3_base_points',
  'round3_speed_bonus','round3_wrong_penalty','round3_lock_on_first_answer',
  'round1_enabled','round2_enabled','round3_enabled'
]);
