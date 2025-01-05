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
    // Create users table
    pgm.createTable('users', {
        id: {
            type: 'serial',
            primaryKey: true,
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true,
        },
        password: {
            type: 'varchar(255)',
            notNull: true,
        },
        name: {
            type: 'varchar(100)',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        }
    });

    // Add user_id to pets table
    pgm.addColumn('pets', {
        user_id: {
            type: 'integer',
            references: '"users"',
            onDelete: 'CASCADE',
            notNull: false  // Initially false to allow existing pets
        }
    });

    // Create index for faster queries
    pgm.createIndex('pets', ['user_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Remove the foreign key and column from pets
    pgm.dropColumn('pets', 'user_id');
    
    // Drop the users table
    pgm.dropTable('users');
};
