import fs from 'fs';
import path from 'path';
import { supabase } from '../db/supabaseClient';
import { logger } from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

/**
 * Run database migrations
 * This function checks for pending migrations and applies them in order
 */
export async function runMigrations() {
  // Skip migrations if using mock Supabase
  if (process.env.USE_REAL_SUPABASE !== 'true') {
    logger.info('Skipping migrations as mock Supabase is in use');
    return;
  }

  logger.info('Starting database migrations');

  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get list of applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('migrations')
      .select('id, name')
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch applied migrations: ${fetchError.message}`);
    }

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations/sql');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      logger.info(`Created migrations directory: ${migrationsDir}`);
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Convert to migration objects
    const migrations: Migration[] = migrationFiles.map((file, index) => {
      const id = index + 1;
      const name = file.replace('.sql', '');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      return { id, name, sql };
    });

    // Find migrations that need to be applied
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    const pendingMigrations = migrations.filter(m => !appliedIds.has(m.id));

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations to apply');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      logger.info(`Applying migration ${migration.id}: ${migration.name}`);

      try {
        // Execute the migration SQL
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: migration.sql
        });

        if (sqlError) {
          throw new Error(`Failed to execute migration: ${sqlError.message}`);
        }

        // Record the migration
        const { error: insertError } = await supabase
          .from('migrations')
          .insert({
            id: migration.id,
            name: migration.name,
            applied_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to record migration: ${insertError.message}`);
        }

        logger.info(`Successfully applied migration ${migration.id}: ${migration.name}`);
      } catch (error) {
        logger.error(`Migration ${migration.id} failed: ${error.message}`);
        throw error;
      }
    }

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration process failed', { error: error.message });
    throw error;
  }
}

/**
 * Create the migrations table if it doesn't exist
 */
async function createMigrationsTable() {
  const { error } = await supabase.rpc('create_migrations_table_if_not_exists');
  
  if (error) {
    // If the RPC doesn't exist, create the table directly
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `;
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql_query: createTableSQL
    });
    
    if (createError) {
      throw new Error(`Failed to create migrations table: ${createError.message}`);
    }
  }
  
  logger.info('Migrations table is ready');
}

/**
 * Create a new migration file
 * @param name Name of the migration
 * @param sql SQL content of the migration
 * @returns Path to the created migration file
 */
export function createMigration(name: string, sql: string): string {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const fileName = `${timestamp}_${name}.sql`;
  const migrationsDir = path.join(__dirname, '../migrations/sql');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const filePath = path.join(migrationsDir, fileName);
  fs.writeFileSync(filePath, sql);
  
  logger.info(`Created migration file: ${fileName}`);
  
  return filePath;
}
