/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('quick_feedback', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    pet_id: {
      type: 'integer',
      references: 'pets(id)',
      onDelete: 'CASCADE',
    },
    thread_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    message: {
      type: 'text',
      notNull: true,
    },
    is_positive: {
      type: 'boolean',
      notNull: true,
    },
    session_id: {
      type: 'integer',
      references: 'chat_sessions(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });

  pgm.createTable('improvement_feedback', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    session_id: {
      type: 'integer',
      references: 'chat_sessions(id)',
      onDelete: 'CASCADE',
    },
    feedback: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('improvement_feedback');
  pgm.dropTable('quick_feedback');
};
