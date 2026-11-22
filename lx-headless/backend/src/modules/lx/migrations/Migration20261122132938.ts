import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261122132938 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "lx_setting" drop constraint if exists "lx_setting_key_unique";`);
    this.addSql(`alter table if exists "lx_payment" drop constraint if exists "lx_payment_ref_unique";`);
    this.addSql(`create table if not exists "lx_payment" ("id" text not null, "ref" text not null, "target_type" text check ("target_type" in ('order', 'service')) not null, "target_ref" text not null, "customer_phone" text not null, "method" text check ("method" in ('wave', 'orange_money', 'cash')) not null, "mode" text check ("mode" in ('manual', 'link', 'api', 'cash')) not null default 'manual', "kind" text check ("kind" in ('full', 'deposit', 'balance')) not null default 'full', "amount" integer not null, "fee" integer not null default 0, "charged" integer not null, "status" text check ("status" in ('pending', 'paid', 'failed', 'expired', 'refunded')) not null default 'pending', "reference" text null, "provider_id" text null, "checkout_url" text null, "note" text null, "paid_at" timestamptz null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lx_payment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lx_payment_ref_unique" ON "lx_payment" ("ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lx_payment_target_ref" ON "lx_payment" ("target_ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lx_payment_deleted_at" ON "lx_payment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "lx_setting" ("id" text not null, "key" text not null, "value" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lx_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lx_setting_key_unique" ON "lx_setting" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lx_setting_deleted_at" ON "lx_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "lx_payment" cascade;`);

    this.addSql(`drop table if exists "lx_setting" cascade;`);
  }

}
