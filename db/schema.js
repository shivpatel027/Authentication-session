import {uuid, pgTable, varchar, text} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar({length: 255}).notNull(),
    email: varchar({length: 255}).notNull().unique(),
    Password: text().notNull(),
    salt: text().notNull(),
});