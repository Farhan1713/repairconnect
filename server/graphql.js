const { ApolloServer } = require('@apollo/server');
const { GraphQLError } = require('graphql');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const major = require('express/package.json').version.split('.')[0];
const { expressMiddleware } = require(`@as-integrations/express${major}`);

const typeDefs = `#graphql
  type Review { id: ID! rating: Int! comment: String createdAt: String }

  type Technician {
    id: ID!
    shopName: String
    skills: String
    address: String
    latitude: Float
    longitude: Float
    avgRating: Float
    reviews: [Review!]!
  }

  type TechnicianPage {
    data: [Technician!]!
    total: Int!
    page: Int!
    totalPages: Int!
  }

  type Quotation {
    id: ID!
    price: Float!
    estimatedDays: Int
    note: String
    accepted: Boolean
    technician: Technician
  }

  type RepairRequest {
    id: ID!
    deviceCategory: String!
    brand: String
    model: String
    problem: String!
    budget: Float
    status: String
    quotations: [Quotation!]!
  }

  type Query {
    technicians(page: Int = 1, limit: Int = 6, search: String = ""): TechnicianPage!
    technician(id: ID!): Technician
    myRequests: [RepairRequest!]!
  }
`;

const TECH_COLS = `id, shop_name AS "shopName", skills, address, latitude, longitude,
                   avg_rating AS "avgRating"`;

const resolvers = {
  Query: {
    technicians: async (_, { page, limit, search }) => {
      const pg = Math.max(page, 1);
      const lim = Math.min(Math.max(limit, 1), 50);
      const like = `%${search}%`;
      const total = Number((await pool.query(
        'SELECT COUNT(*) FROM technicians WHERE shop_name ILIKE $1 OR skills ILIKE $1',
        [like])).rows[0].count);
      const { rows } = await pool.query(
        `SELECT ${TECH_COLS} FROM technicians
         WHERE shop_name ILIKE $1 OR skills ILIKE $1
         ORDER BY avg_rating DESC, id LIMIT $2 OFFSET $3`,
        [like, lim, (pg - 1) * lim]);
      return { data: rows, total, page: pg, totalPages: Math.ceil(total / lim) };
    },

    technician: async (_, { id }) => {
      const { rows } = await pool.query(
        `SELECT ${TECH_COLS} FROM technicians WHERE id = $1`, [id]);
      return rows[0] || null;
    },

    myRequests: async (_, __, { user }) => {
      if (!user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const { rows } = await pool.query(
        `SELECT id, device_category AS "deviceCategory", brand, model, problem,
                budget, status
         FROM repair_requests WHERE customer_id = $1 ORDER BY created_at DESC`,
        [user.id]);
      return rows;
    },
  },

  Technician: {
    reviews: async (t) => {
      const { rows } = await pool.query(
        `SELECT id, rating, comment, created_at::text AS "createdAt"
         FROM reviews WHERE technician_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [t.id]);
      return rows;
    },
  },

  RepairRequest: {
    quotations: async (r) => {
      const { rows } = await pool.query(
        `SELECT id, price, estimated_days AS "estimatedDays", note, accepted,
                technician_id AS "technicianId"
         FROM quotations WHERE request_id = $1 ORDER BY id`,
        [r.id]);
      return rows;
    },
  },

  Quotation: {
    technician: async (q) => {
      const { rows } = await pool.query(
        `SELECT ${TECH_COLS} FROM technicians WHERE id = $1`, [q.technicianId]);
      return rows[0] || null;
    },
  },
};

module.exports = async function mountGraphQL(app) {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        try {
          return { user: token ? jwt.verify(token, process.env.JWT_SECRET) : null };
        } catch {
          return { user: null };
        }
      },
    })
  );
};
