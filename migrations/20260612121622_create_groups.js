/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name').notNullable()
    table.text('description')
    table.string('currency').notNullable().defaultTo('INR')
    table.uuid('created_by').notNullable()
    table.timestamps(true, true)

    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE')
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('groups');
};
