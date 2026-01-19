import { boolean, integer, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from 'nanoid';

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
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
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const farmers = pgTable(
  "farmers",
  {
    id: text("id").notNull().$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    doc: text("doc").notNull(),
    inputFeed: real("input_feed").notNull(),
    intake: real("intake").notNull().default(0),
    status: text("status").notNull().default("active"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    // New Attributes
    mortality: integer("mortality").notNull().default(0),
    age: integer("age").notNull().default(0), // Age of cycle in days
  },
  // The extra configuration is now inside this object
  (table) => [
    primaryKey({ columns: [table.name, table.userId] }),
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
    // New Attributes
    mortality: integer("mortality").notNull().default(0),
    age: integer("age").notNull(), // Age of cycle in days
    
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull().defaultNow(),
});