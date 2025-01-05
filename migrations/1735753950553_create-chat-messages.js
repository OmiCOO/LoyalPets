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
  pgm.createTable('chat_messages', {
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
    message: {
      type: 'text',
      notNull: true,
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      check: "role IN ('user', 'assistant')",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Add an index for faster queries
  pgm.createIndex('chat_messages', ['pet_id', 'thread_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('chat_messages');
};
