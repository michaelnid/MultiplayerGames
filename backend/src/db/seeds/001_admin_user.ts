import type { Knex } from 'knex';
import argon2 from 'argon2';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('users').where('username', 'admin').first();
  if (existing) return;

  const passwordHash = await argon2.hash('admin', {
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
