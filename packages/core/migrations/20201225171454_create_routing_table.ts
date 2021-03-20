import * as Knex from "knex";

import {
  ROUTES_TABLE_NAME,
  MAX_ROUTE_NAME_LENGTH
} from '../src/constants';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(ROUTES_TABLE_NAME);
  if (!hasTable) {
    await knex.schema.createTable(ROUTES_TABLE_NAME, (table: Knex.TableBuilder) => {
      table.increments('id').notNullable();
      table.string('tunnel').notNullable(); // active tunnel instance
      table.string('name', MAX_ROUTE_NAME_LENGTH).unique().notNullable(); // queryable name
      table.string('origin').unique().notNullable(); // origin address (i.e localhost:8080)
      table.string('proxy').nullable(); // public address assigned (i.e https://some.cloudflared.url)
      table.boolean('persist').defaultTo(true).notNullable(); // persist across reboots
    });
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('routes');
}

