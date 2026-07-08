import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260706184105 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "appointment" ("id" text not null, "customer_id" text not null, "requested_date" timestamptz not null, "time_slot" text not null, "status" text check ("status" in ('requested', 'confirmed', 'completed', 'cancelled')) not null default 'requested', "fee_paid" boolean not null default false, "stripe_payment_intent_id" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "appointment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_appointment_deleted_at" ON "appointment" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "appointment" cascade;`);
  }

}
