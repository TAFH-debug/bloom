import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  statusPreset: text("status_preset"),
  statusNote: text("status_note"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const habits = pgTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  frequency: text("frequency").notNull().default("daily"),
  timesPerPeriod: integer("times_per_period").notNull().default(1),
  customEveryDays: integer("custom_every_days"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: text("id").primaryKey(),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    completedOn: date("completed_on", { mode: "string" }).notNull(),
    slot: integer("slot").notNull().default(0),
  },
  (table) => [
    uniqueIndex("habit_completions_habit_day_slot_idx").on(
      table.habitId,
      table.completedOn,
      table.slot,
    ),
  ],
);

export const gardenMembers = pgTable(
  "garden_members",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("garden_members_owner_member_idx").on(
      table.ownerId,
      table.memberId,
    ),
  ],
);

export const gardenInvitations = pgTable(
  "garden_invitations",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => [
    uniqueIndex("garden_invitations_from_to_pending_idx").on(
      table.fromUserId,
      table.toUserId,
    ),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  reminderWindowStart: integer("reminder_window_start").notNull().default(9),
  reminderWindowEnd: integer("reminder_window_end").notNull().default(0),
  activityTrackingEnabled: boolean("activity_tracking_enabled")
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activitySegments = pgTable(
  "activity_segments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
    kind: text("kind").notNull(),
    processName: text("process_name"),
    appName: text("app_name"),
    exePath: text("exe_path"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("activity_segments_user_started_idx").on(
      table.userId,
      table.startedAt,
    ),
    index("activity_segments_user_process_idx").on(
      table.userId,
      table.processName,
    ),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  habits: many(habits),
  habitCompletions: many(habitCompletions),
  gardenOwned: many(gardenMembers, { relationName: "garden_owner" }),
  gardenMemberships: many(gardenMembers, { relationName: "garden_member" }),
  invitationsSent: many(gardenInvitations, { relationName: "invite_from" }),
  invitationsReceived: many(gardenInvitations, {
    relationName: "invite_to",
  }),
  preferences: one(userPreferences, {
    fields: [user.id],
    references: [userPreferences.userId],
  }),
  activitySegments: many(activitySegments),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(user, {
    fields: [habits.userId],
    references: [user.id],
  }),
  completions: many(habitCompletions),
}));

export const habitCompletionsRelations = relations(
  habitCompletions,
  ({ one }) => ({
    habit: one(habits, {
      fields: [habitCompletions.habitId],
      references: [habits.id],
    }),
    user: one(user, {
      fields: [habitCompletions.userId],
      references: [user.id],
    }),
  }),
);

export const gardenMembersRelations = relations(gardenMembers, ({ one }) => ({
  owner: one(user, {
    fields: [gardenMembers.ownerId],
    references: [user.id],
    relationName: "garden_owner",
  }),
  member: one(user, {
    fields: [gardenMembers.memberId],
    references: [user.id],
    relationName: "garden_member",
  }),
}));

export const gardenInvitationsRelations = relations(
  gardenInvitations,
  ({ one }) => ({
    fromUser: one(user, {
      fields: [gardenInvitations.fromUserId],
      references: [user.id],
      relationName: "invite_from",
    }),
    toUser: one(user, {
      fields: [gardenInvitations.toUserId],
      references: [user.id],
      relationName: "invite_to",
    }),
  }),
);

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [userPreferences.userId],
      references: [user.id],
    }),
  }),
);

export const activitySegmentsRelations = relations(
  activitySegments,
  ({ one }) => ({
    user: one(user, {
      fields: [activitySegments.userId],
      references: [user.id],
    }),
  }),
);
