import type { Knex } from 'knex';
import argon2 from 'argon2';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('users').where('username', 'admin').first();
  if (existing) return;

  const seedPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!seedPassword) {
    console.warn('[seed] DEFAULT_ADMIN_PASSWORD nicht gesetzt - Admin-Seed wird uebersprungen.');
    return;
  }

  if (seedPassword.length < 8) {
    throw new Error('DEFAULT_ADMIN_PASSWORD muss mindestens 8 Zeichen lang sein.');
  }

  const passwordHash = await argon2.hash(seedPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await knex('users').insert({
    username: 'admin',
    password_hash: passwordHash,
    role: 'admin',
  });
}
