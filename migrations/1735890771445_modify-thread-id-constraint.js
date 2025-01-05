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
    // First drop the existing unique constraint
    pgm.dropConstraint('pets', 'pets_thread_id_key');
    
    // Create a composite unique constraint with user_id and thread_id
    pgm.createConstraint('pets', 'unique_thread_per_user_pet', {
        unique: ['user_id', 'thread_id']
    });
};

exports.down = (pgm) => {
    // Revert changes
    pgm.dropConstraint('pets', 'unique_thread_per_user_pet');
    pgm.addConstraint('pets', 'pets_thread_id_key', {
        unique: ['thread_id']
    });
};