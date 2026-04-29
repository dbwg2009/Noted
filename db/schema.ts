import {
  pgTable,
  text,
  timestamp,
  integer,
  date,
  boolean,
  jsonb,
  primaryKey,
  pgEnum,
  serial,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const wishlistStatus = pgEnum("wishlist_status", [
  "idea",
  "researching",
  "chosen",
  "purchased",
  "given",
]);

export const productSource = pgEnum("product_source", [
  "ai_search",
  "manual",
  "suggestion",
]);

export const aiRequestKind = pgEnum("ai_request_kind", [
  "product_search",
  "suggestion",
  "reminder_shortlist",
]);

// --- Auth.js tables (Drizzle adapter shape) ---

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  timezone: text("timezone").default("Europe/London").notNull(),
  defaultCurrency: text("default_currency").default("GBP").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Domain tables ---

export const people = pgTable("people", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthday: date("birthday").notNull(), // ISO yyyy-mm-dd; year may be a placeholder
  birthYearKnown: boolean("birth_year_known").default(true).notNull(),
  relationship: text("relationship"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  budgetMin: integer("budget_min"), // pence/cents — kept as smallest unit
  budgetMax: integer("budget_max"),
  currency: text("currency").default("GBP").notNull(),
  sizes: jsonb("sizes").$type<Record<string, string>>(),
  avoid: text("avoid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const personTags = pgTable(
  "person_tags",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.personId, t.tagId] })],
);

export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  sourceNote: text("source_note"),
  heardOn: date("heard_on"),
  status: wishlistStatus("status").default("idea").notNull(),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  wishlistItemId: uuid("wishlist_item_id").references(() => wishlistItems.id, {
    onDelete: "set null",
  }),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  retailer: text("retailer"),
  url: text("url").notNull(),
  price: integer("price"), // smallest unit (pence)
  currency: text("currency").default("GBP").notNull(),
  inStock: boolean("in_stock"),
  source: productSource("source").default("manual").notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const giftHistory = pgTable("gift_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  pricePaid: integer("price_paid"),
  currency: text("currency").default("GBP").notNull(),
  givenOn: date("given_on").notNull(),
  reactionNotes: text("reaction_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  leadDays: integer("lead_days").notNull(),
  channel: text("channel").default("email").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  lastSentForYear: integer("last_sent_for_year"),
});

export const aiRequestLog = pgTable("ai_request_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: aiRequestKind("kind").notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costEstimate: integer("cost_estimate"), // smallest unit
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations (helpful for query builder) ---

export const peopleRelations = relations(people, ({ many, one }) => ({
  wishlist: many(wishlistItems),
  products: many(products),
  history: many(giftHistory),
  reminders: many(reminders),
  tags: many(personTags),
  user: one(users, { fields: [people.userId], references: [users.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ many, one }) => ({
  person: one(people, { fields: [wishlistItems.personId], references: [people.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  person: one(people, { fields: [products.personId], references: [people.id] }),
  wishlistItem: one(wishlistItems, {
    fields: [products.wishlistItemId],
    references: [wishlistItems.id],
  }),
}));

export const giftHistoryRelations = relations(giftHistory, ({ one }) => ({
  person: one(people, { fields: [giftHistory.personId], references: [people.id] }),
  product: one(products, { fields: [giftHistory.productId], references: [products.id] }),
}));

export const personTagsRelations = relations(personTags, ({ one }) => ({
  person: one(people, { fields: [personTags.personId], references: [people.id] }),
  tag: one(tags, { fields: [personTags.tagId], references: [tags.id] }),
}));

// Silence unused-import warning for sql when migrations later need it.
export const _sql = sql;
