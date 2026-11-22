import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261122000943 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "worker" drop constraint if exists "worker_code_unique";`);
    this.addSql(`alter table if exists "service_booking" drop constraint if exists "service_booking_ref_unique";`);
    this.addSql(`alter table if exists "prestation" drop constraint if exists "prestation_slug_unique";`);
    this.addSql(`create table if not exists "prestation" ("id" text not null, "slug" text not null, "name" text not null, "group" text not null default 'Maison', "summary" text not null, "description" text null, "image_url" text null, "icon" text not null default 'wrench', "price_from" integer null, "price_note" text null, "active" boolean not null default true, "sort" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "prestation_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_prestation_slug_unique" ON "prestation" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_prestation_deleted_at" ON "prestation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_booking" ("id" text not null, "ref" text not null, "prestation_id" text not null, "service_slug" text not null, "service_name" text not null, "customer_name" text not null, "customer_phone" text not null, "address" text not null, "area" text null, "preferred_date" text not null, "time_slot" text check ("time_slot" in ('morning', 'afternoon', 'evening', 'any')) not null default 'any', "details" text not null, "status" text check ("status" in ('new', 'quoted', 'confirmed', 'in_progress', 'done', 'cancelled')) not null default 'new', "quote_amount" integer null, "worker_id" text null, "worker_code" text null, "admin_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_service_booking_ref_unique" ON "service_booking" ("ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_booking_deleted_at" ON "service_booking" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "worker" ("id" text not null, "code" text not null, "name" text not null, "phone" text not null, "trades" text not null default '', "zone" text null, "active" boolean not null default true, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "worker_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_worker_code_unique" ON "worker" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_worker_deleted_at" ON "worker" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "prestation" cascade;`);

    this.addSql(`drop table if exists "service_booking" cascade;`);

    this.addSql(`drop table if exists "worker" cascade;`);
  }

}
