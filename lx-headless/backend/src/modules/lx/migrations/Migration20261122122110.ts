import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261122122110 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_booking" add column if not exists "rating" integer null, add column if not exists "review_text" text null, add column if not exists "reviewed_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_booking" drop column if exists "rating", drop column if exists "review_text", drop column if exists "reviewed_at";`);
  }

}
