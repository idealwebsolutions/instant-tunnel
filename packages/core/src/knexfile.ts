// Update with your config settings.
import Knex from 'knex';

interface KnexEnvConfig {
  [env: string]: Knex.Config
}

const knexEnvConfig: KnexEnvConfig = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./it.sqlite3"
    },
    useNullAsDefault: true
  },
  staging: {
    client: "pg",
    connection: {
      host: process.env.DATABASE_HOST || "localhost",
      database: process.env.DATABASE_NAME || "instant_tunnel",
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "../migrations"
    }
  },
  production: {
    client: "pg",
    connection: {
      host: process.env.DATABASE_HOST || "localhost",
      database: process.env.DATABASE_NAME || "instant_tunnel",
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "../migrations"
    }
  }
};

export = knexEnvConfig
