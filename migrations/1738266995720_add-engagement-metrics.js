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
  // Add session tracking
  pgm.createTable('chat_sessions', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    start_time: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    end_time: {
      type: 'timestamp',
    },
    device_type: {
      type: 'varchar(50)',
    },
    messages_count: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });

  // Add topic tracking
  pgm.createTable('chat_topics', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    message_id: {
      type: 'integer',
      references: '"chat_messages"',
      onDelete: 'CASCADE',
    },
    topic: {
      type: 'varchar(100)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });

  // Add columns to chat_messages
  pgm.addColumns('chat_messages', {
    session_id: {
      type: 'integer',
      references: '"chat_sessions"',
      onDelete: 'CASCADE',
    },
    response_time: {
      type: 'interval',
      comment: 'Time taken to generate response',
    },
    is_understood: {
      type: 'boolean',
      default: true,
    }
  });

  // Create indexes for better performance
  pgm.createIndex('chat_sessions', ['user_id']);
  pgm.createIndex('chat_topics', ['message_id']);
  pgm.createIndex('chat_messages', ['session_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Remove indexes
  pgm.dropIndex('chat_messages', ['session_id']);
  pgm.dropIndex('chat_topics', ['message_id']);
  pgm.dropIndex('chat_sessions', ['user_id']);

  // Remove columns from chat_messages
  pgm.dropColumns('chat_messages', ['session_id', 'response_time', 'is_understood']);

  // Drop tables
  pgm.dropTable('chat_topics');
  pgm.dropTable('chat_sessions');
};
