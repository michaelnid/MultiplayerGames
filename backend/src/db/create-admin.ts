import argon2 from 'argon2';
import Knex from 'knex';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const password = process.argv[2];
if (!password) {
  console.error('Passwort als Argument erforderlich');
  process.exit(1);
}

const db = Knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mike_games',
    user: process.env.DB_USER || 'mike_games',
    password: process.env.DB_PASSWORD || '',
  },
});

try {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const existing = await db('users').where('username', 'admin').first();
  if (!existing) {
    await db('users').insert({
      username: 'admin',
      password_hash: hash,
      role: 'admin',
    });
  } else {
    await db('users').where('username', 'admin').update({ password_hash: hash });
  }
} finally {
  await db.destroy();
}
