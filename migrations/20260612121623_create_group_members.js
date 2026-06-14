/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('group_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('group_id').notNullable()
    table.uuid('user_id').notNullable()
    table.string('role').notNullable()
    table.timestamp('joined_at').defaultTo(knex.fn.now())
    
    table.foreign('group_id').references('id').inTable('groups').onDelete('CASCADE')
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

    table.unique(['group_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('group_members');
};
