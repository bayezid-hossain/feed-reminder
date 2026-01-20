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

export const farmers = pgTable(
  "farmers",
  {
    // FIX 1: Make 'id' the true primary key for easy linking
    id: text("id").primaryKey().$defaultFn(() => nanoid()), 
    name: text("name").notNull(),
    doc: text("doc").notNull(),
    inputFeed: real("input_feed").notNull(),
    intake: real("intake").notNull().default(0),
    status: text("status").notNull().default("active"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    mortality: integer("mortality").notNull().default(0),
    age: integer("age").notNull().default(0),
  },
  (table) => [
    // FIX 2: Use uniqueIndex instead of composite primaryKey
    // This allows linking by 'id' while still preventing duplicate names for the same user
    uniqueIndex("unique_farmer_user").on(table.name, table.userId),
  ]
);

export const farmerHistory = pgTable("farmer_history", {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    farmerName: text("farmer_name").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    
    // Captured Snapshots
    doc: text("doc").notNull(),
    finalInputFeed: real("final_input_feed").notNull(),
    finalIntake: real("final_intake").notNull(),
    finalRemaining: real("final_remaining").notNull(),
    mortality: integer("mortality").notNull().default(0),
    age: integer("age").notNull(),
    
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull().defaultNow(),
});

export const logTypeEnum = pgEnum("log_type", ["FEED", "MORTALITY", "NOTE"]);

export const farmerLogs = pgTable("farmer_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // FIX 3: Correct column name & make nullable (it becomes null when farmer is archived)
  farmerId: text("farmer_id").references(() => farmers.id, { onDelete: "set null" }), 
  
  // FIX 4: Add historyId to link logs to archived cycles
  historyId: text("history_id").references(() => farmerHistory.id, { onDelete: "cascade" }),
  
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  
  type: logTypeEnum("type").notNull(),
  valueChange: doublePrecision("value_change").notNull(),
  previousValue: doublePrecision("previous_value"),
  newValue: doublePrecision("new_value"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

// 1. Farmer Relations (One active farmer -> Many logs)
export const farmerRelations = relations(farmers, ({ many }) => ({
  logs: many(farmerLogs),
}));

// 2. History Relations (One history record -> Many logs)
export const historyRelations = relations(farmerHistory, ({ many }) => ({
  logs: many(farmerLogs),
}));

// 3. Log Relations (Log -> belongs to EITHER Farmer OR History)
export const logRelations = relations(farmerLogs, ({ one }) => ({
  farmer: one(farmers, {
    fields: [farmerLogs.farmerId],
    references: [farmers.id],
  }),
  history: one(farmerHistory, {
    fields: [farmerLogs.historyId],
    references: [farmerHistory.id],
  }),
}));