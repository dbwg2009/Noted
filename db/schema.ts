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
  index,
  check,
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

export const occasionKind = pgEnum("occasion_kind", [
  "anniversary",
  "christmas",
  "mothers_day",
  "fathers_day",
  "valentines",
  "easter",
  "custom",
]);

// --- Auth.js tables (Drizzle adapter shape) ---

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  passwordHash: text("password_hash"),
  timezone: text("timezone").default("Europe/London").notNull(),
  defaultCurrency: text("default_currency").default("GBP").notNull(),
  icalToken: uuid("ical_token").defaultRandom().unique(),
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
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

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

export const people = pgTable(
  "people",
  {
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
  },
  (t) => [index("people_user_id_idx").on(t.userId)],
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [index("tags_user_id_idx").on(t.userId)],
);

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

export const wishlistItems = pgTable(
  "wishlist_items",
  {
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
  },
  (t) => [index("wishlist_items_person_id_idx").on(t.personId)],
);

export const products = pgTable(
  "products",
  {
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
  },
  (t) => [
    index("products_person_id_idx").on(t.personId),
    index("products_wishlist_item_id_idx").on(t.wishlistItemId),
  ],
);

export const giftHistory = pgTable(
  "gift_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    wishlistItemId: uuid("wishlist_item_id").references(() => wishlistItems.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    pricePaid: integer("price_paid"),
    currency: text("currency").default("GBP").notNull(),
    givenOn: date("given_on").notNull(),
    reactionNotes: text("reaction_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("gift_history_person_id_idx").on(t.personId)],
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    rationale: text("rationale"),
    estimatedPriceMin: integer("estimated_price_min"),
    estimatedPriceMax: integer("estimated_price_max"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("suggestions_person_id_idx").on(t.personId)],
);

export const occasions = pgTable(
  "occasions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    kind: occasionKind("kind").notNull(),
    name: text("name"),
    date: date("date"),
    yearRecurring: boolean("year_recurring").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("occasions_user_id_idx").on(t.userId),
    index("occasions_person_id_idx").on(t.personId),
  ],
);

export const occasionPersonExclusions = pgTable(
  "occasion_person_exclusions",
  {
    occasionId: integer("occasion_id")
      .notNull()
      .references(() => occasions.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.occasionId, t.personId] })],
);


export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    occasionId: integer("occasion_id").references(() => occasions.id, { onDelete: "cascade" }),
    leadDays: integer("lead_days").notNull(),
    channel: text("channel").default("email").notNull(),
    lastSentAt: timestamp("last_sent_at"),
    lastSentForYear: integer("last_sent_for_year"),
  },
  (t) => [index("reminders_person_id_idx").on(t.personId), index("reminders_occasion_id_idx").on(t.occasionId)],
);

export const giftGroupStatus = pgEnum("gift_group_status", [
  "planning",
  "ordered",
  "received",
]);

export const giftGroups = pgTable(
  "gift_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    wishlistItemId: uuid("wishlist_item_id").references(() => wishlistItems.id, { onDelete: "set null" }),
    occasionId: integer("occasion_id").references(() => occasions.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    targetAmount: integer("target_amount"), // pence; null = no fixed target
    status: giftGroupStatus("status").notNull().default("planning"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("gift_groups_user_id_idx").on(t.userId),
    check("gift_groups_target_amount_non_negative", sql`${t.targetAmount} IS NULL OR ${t.targetAmount} >= 0`),
  ],
);

export const giftGroupContributors = pgTable(
  "gift_group_contributors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => giftGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    contributionAmount: integer("contribution_amount"), // pence; null = TBD
    paid: boolean("paid").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("gift_group_contributors_group_id_idx").on(t.groupId),
    check("gift_group_contributors_contribution_non_negative", sql`${t.contributionAmount} IS NULL OR ${t.contributionAmount} >= 0`),
  ],
);

export const wishlistShares = pgTable(
  "wishlist_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .unique()
      .references(() => people.id, { onDelete: "cascade" }),
    token: uuid("token").notNull().unique().defaultRandom(),
    expiresAt: timestamp("expires_at"),
    showPrices: boolean("show_prices").notNull().default(true),
    showIdea: boolean("show_idea").notNull().default(true),
    showResearching: boolean("show_researching").notNull().default(true),
    showChosen: boolean("show_chosen").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("wishlist_shares_person_id_idx").on(t.personId),
    index("wishlist_shares_token_idx").on(t.token),
  ],
);

export const aiRequestLog = pgTable(
  "ai_request_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: aiRequestKind("kind").notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    costEstimate: integer("cost_estimate"), // smallest unit
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ai_request_log_user_id_idx").on(t.userId)],
);

// --- Relations (helpful for query builder) ---

export const peopleRelations = relations(people, ({ many, one }) => ({
  wishlist: many(wishlistItems),
  products: many(products),
  history: many(giftHistory),
  reminders: many(reminders),
  tags: many(personTags),
  suggestions: many(suggestions),
  user: one(users, { fields: [people.userId], references: [users.id] }),
  wishlistShare: one(wishlistShares, { fields: [people.id], references: [wishlistShares.personId] }),
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

export const giftGroupsRelations = relations(giftGroups, ({ one, many }) => ({
  user: one(users, { fields: [giftGroups.userId], references: [users.id] }),
  person: one(people, { fields: [giftGroups.personId], references: [people.id] }),
  wishlistItem: one(wishlistItems, { fields: [giftGroups.wishlistItemId], references: [wishlistItems.id] }),
  contributors: many(giftGroupContributors),
}));

export const giftGroupContributorsRelations = relations(giftGroupContributors, ({ one }) => ({
  group: one(giftGroups, { fields: [giftGroupContributors.groupId], references: [giftGroups.id] }),
}));

// Silence unused-import warning for sql when migrations later need it.
export const _sql = sql;
