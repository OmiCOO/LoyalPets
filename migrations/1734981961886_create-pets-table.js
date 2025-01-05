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
  pgm.createTable('pets', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    pet_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    breed: {
      type: 'varchar(100)',
      notNull: true,
    },
    age: {
      type: 'integer',
      notNull: true,
    },
    disease: {
      type: 'varchar(200)',
      notNull: true,
    },
    symptoms: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('pets');
};
