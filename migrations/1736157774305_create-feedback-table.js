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
  pgm.createTable('chat_feedback', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    pet_id: {
      type: 'integer',
      notNull: true,
      references: 'pets(id)',
      onDelete: 'CASCADE',
    },
    thread_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    rating: {
      type: 'integer',
      notNull: true,
      check: 'rating >= 1 AND rating <= 5'
    },
    comment: {
      type: 'text',
      default: null
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });

  // Add index for faster queries
  pgm.createIndex('chat_feedback', ['pet_id', 'thread_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('chat_feedback');
};
