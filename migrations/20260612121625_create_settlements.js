/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('settlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('group_id').notNullable()
    table.uuid('payer_id').notNullable()
    table.uuid('payee_id').notNullable()
    table.decimal('amount', 10, 2).notNullable()
    table.string('currency', 3).notNullable()
    table.string('status').notNullable().defaultTo('pending')
    table.date('settled_at')
    table.timestamps(true, true)

    table.foreign('group_id').references('id').inTable('groups').onDelete('CASCADE')
    table.foreign('payer_id').references('id').inTable('users').onDelete('CASCADE')
    table.foreign('payee_id').references('id').inTable('users').onDelete('CASCADE')
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('settlements');
};
