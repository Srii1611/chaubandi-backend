import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260706184150 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "measurement" ("id" text not null, "customer_id" text not null, "bust" real null, "waist" real null, "hips" real null, "shoulder" real null, "length" real null, "sleeve" real null, "inseam" real null, "unit" text check ("unit" in ('in', 'cm')) not null default 'in', "source" text check ("source" in ('manual', 'ai')) not null default 'manual', "confirmed" boolean not null default false, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "measurement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_measurement_deleted_at" ON "measurement" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "measurement" cascade;`);
  }

}
