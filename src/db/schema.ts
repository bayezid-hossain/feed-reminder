import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { nanoid } from 'nanoid';

// --- Auth Tables (Unchanged) ---
export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull()
});

export const session = pgTable("session", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date())
});

// --- Application Tables ---

// 1. Farmers (Main Stock Holder)
export const farmers = pgTable(
  "farmers",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

    // Main Stock Data
    mainStockInput: real("main_stock_input").notNull().default(0), // Total Added
    mainStockRemaining: real("main_stock_remaining").notNull().default(0), // Current Available

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_farmer_user").on(table.name, table.userId),
  ]
);

// 2. Cycles (Individual Growing Cycles)
export const cycles = pgTable(
  "cycles",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    farmerId: text("farmer_id").notNull().references(() => farmers.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    
    status: text("status").notNull().default("active"), // 'active' or 'archived'

    doc: integer("doc").notNull(),
    intake: real("intake").notNull().default(0), // Feed consumed by this cycle
    mortality: integer("mortality").notNull().default(0),
    age: integer("age").notNull().default(0),
    
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"), // Set when archived

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const logTypeEnum = pgEnum("log_type", ["FEED", "MORTALITY", "NOTE", "STOCK_ADD"]);

export const farmerLogs = pgTable("farmer_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Link to Cycle (for consumption/mortality)
  cycleId: text("cycle_id").references(() => cycles.id, { onDelete: "set null" }),

  // Link to Farmer (for Stock Additions)
  farmerId: text("farmer_id").references(() => farmers.id, { onDelete: "cascade" }),
  
  // We remove historyId as we use cycles table for history now
  
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  
  type: logTypeEnum("type").notNull(),
  valueChange: doublePrecision("value_change").notNull(),
  previousValue: doublePrecision("previous_value"),
  newValue: doublePrecision("new_value"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const farmerRelations = relations(farmers, ({ many }) => ({
  cycles: many(cycles),
  logs: many(farmerLogs), // Logs related to stock addition
}));

export const cycleRelations = relations(cycles, ({ one, many }) => ({
  farmer: one(farmers, {
    fields: [cycles.farmerId],
    references: [farmers.id],
  }),
  logs: many(farmerLogs), // Logs related to this cycle
}));

export const logRelations = relations(farmerLogs, ({ one }) => ({
  farmer: one(farmers, {
    fields: [farmerLogs.farmerId],
    references: [farmers.id],
  }),
  cycle: one(cycles, {
    fields: [farmerLogs.cycleId],
    references: [cycles.id],
  }),
}));
