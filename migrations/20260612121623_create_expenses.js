/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('group_id').notNullable()
    table.uuid('paid_by').notNullable()
    table.uuid('created_by').notNullable()
    table.text('description')
    table.decimal('amount', 10, 2).notNullable()
    table.string('currency', 3).notNullable()
    table.string('split_type', 50).notNullable()
    table.date('expense_date').notNullable()
    table.timestamps(true, true)

    table.foreign('group_id').references('id').inTable('groups').onDelete('CASCADE')
    table.foreign('paid_by').references('id').inTable('users').onDelete('CASCADE')
    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE')
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense');
};
