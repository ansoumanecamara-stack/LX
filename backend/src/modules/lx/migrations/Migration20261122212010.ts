import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261122212010 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pos_sale" add column if not exists "commission" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pos_sale" drop column if exists "commission";`);
  }

}
