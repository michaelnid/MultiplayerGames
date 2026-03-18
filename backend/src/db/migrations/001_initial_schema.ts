import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('username', 32).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['admin', 'gamemaster', 'spieler']).notNullable().defaultTo('spieler');
    table.boolean('totp_enabled').notNullable().defaultTo(false);
    table.string('totp_secret', 255).nullable();
    table.text('backup_codes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sessions', (table) => {
    table.string('sid', 255).primary();
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('data').notNullable().defaultTo('{}');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('plugins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('slug', 64).notNullable().unique();
    table.string('name', 128).notNullable();
    table.string('version', 32).notNullable();
    table.string('author', 128).notNullable().defaultTo('');
    table.jsonb('manifest').notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table.timestamp('installed_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('plugin_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('plugin_id').notNullable().references('id').inTable('plugins').onDelete('CASCADE');
    table.string('key', 255).notNullable();
    table.jsonb('value').notNullable().defaultTo('null');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['plugin_id', 'key']);
  });

  await knex.schema.createTable('lobbies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('plugin_id').notNullable().references('id').inTable('plugins').onDelete('CASCADE');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code', 4).notNullable();
    table.enum('status', ['wartend', 'laeuft', 'beendet', 'geschlossen']).notNullable().defaultTo('wartend');
    table.integer('max_players').notNullable().defaultTo(8);
    table.integer('min_players').notNullable().defaultTo(2);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('closed_at').nullable();
  });

  // Unique-Constraint nur fuer aktive Lobbys (wartend/laeuft)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_lobbies_active_code
    ON lobbies (code)
    WHERE status IN ('wartend', 'laeuft')
  `);

  await knex.schema.createTable('lobby_players', (table) => {
    table.uuid('lobby_id').notNullable().references('id').inTable('lobbies').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    table.primary(['lobby_id', 'user_id']);
  });

  await knex.schema.createTable('game_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('lobby_id').notNullable().references('id').inTable('lobbies').onDelete('CASCADE');
    table.uuid('plugin_id').notNullable().references('id').inTable('plugins').onDelete('CASCADE');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at').nullable();
    table.jsonb('result_data').notNullable().defaultTo('{}');
  });

  await knex.schema.createTable('player_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('plugin_id').notNullable().references('id').inTable('plugins').onDelete('CASCADE');
    table.integer('wins').notNullable().defaultTo(0);
    table.integer('losses').notNullable().defaultTo(0);
    table.integer('draws').notNullable().defaultTo(0);
    table.integer('total_score').notNullable().defaultTo(0);
    table.integer('games_played').notNullable().defaultTo(0);
    table.timestamp('last_played').nullable();
    table.unique(['user_id', 'plugin_id']);
  });

  await knex.schema.createTable('audit_log', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 128).notNullable();
    table.jsonb('details').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('user_id');
    table.index('action');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('player_stats');
  await knex.schema.dropTableIfExists('game_sessions');
  await knex.schema.dropTableIfExists('lobby_players');
  await knex.schema.dropTableIfExists('lobbies');
  await knex.schema.dropTableIfExists('plugin_settings');
  await knex.schema.dropTableIfExists('plugins');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('users');
}
