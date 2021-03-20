import Knex from 'knex';
import * as knexConfig from '../knexfile';
import { Route as RouteSchema } from './route';

const knexClient: Knex = Knex(knexConfig[process.env.NODE_ENV || 'production'] as Knex.Config);

export const Route: RouteSchema = RouteSchema.connect(knexClient);
