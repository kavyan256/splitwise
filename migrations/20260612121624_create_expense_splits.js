/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_splits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('expense_id').notNullable()
    table.uuid('user_id').notNullable()
    table.decimal('owed_amount', 10, 2).notNullable()
    table.decimal('paid_amount', 10, 2).notNullable()
    table.boolean('is_settled').notNullable().defaultTo(false)
    table.timestamps(true, true)

    table.foreign('expense_id').references('id').inTable('expenses').onDelete('CASCADE')
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_splits');
};
