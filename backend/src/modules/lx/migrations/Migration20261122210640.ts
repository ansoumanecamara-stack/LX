import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261122210640 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "lx_payout" drop constraint if exists "lx_payout_ref_unique";`);
    this.addSql(`create table if not exists "lx_payout" ("id" text not null, "ref" text not null, "shop_id" text not null, "direction" text check ("direction" in ('to_shop', 'from_shop')) not null default 'to_shop', "amount" integer not null, "method" text not null, "reference" text null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lx_payout_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lx_payout_ref_unique" ON "lx_payout" ("ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lx_payout_shop_id" ON "lx_payout" ("shop_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lx_payout_deleted_at" ON "lx_payout" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "shop_order" add column if not exists "commission" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "lx_payout" cascade;`);

    this.addSql(`alter table if exists "shop_order" drop column if exists "commission";`);
  }

}
