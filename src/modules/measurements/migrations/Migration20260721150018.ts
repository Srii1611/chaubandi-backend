import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260721150018 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "measurement" drop column if exists "shoulder", drop column if exists "length", drop column if exists "sleeve", drop column if exists "inseam";`);

    this.addSql(`alter table if exists "measurement" add column if not exists "height" real null, add column if not exists "above_waist" real null, add column if not exists "shoulder_width" real null, add column if not exists "armhole" real null, add column if not exists "bicep" real null, add column if not exists "sleeve_length" real null, add column if not exists "sleeve_style" text null, add column if not exists "front_neck_depth" real null, add column if not exists "back_neck_depth" real null, add column if not exists "top_length" real null, add column if not exists "bottom_length_skirt" real null, add column if not exists "bottom_length_pant" real null, add column if not exists "thigh" real null, add column if not exists "knee" real null, add column if not exists "ankle" real null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "measurement" drop column if exists "height", drop column if exists "above_waist", drop column if exists "shoulder_width", drop column if exists "armhole", drop column if exists "bicep", drop column if exists "sleeve_length", drop column if exists "sleeve_style", drop column if exists "front_neck_depth", drop column if exists "back_neck_depth", drop column if exists "top_length", drop column if exists "bottom_length_skirt", drop column if exists "bottom_length_pant", drop column if exists "thigh", drop column if exists "knee", drop column if exists "ankle";`);

    this.addSql(`alter table if exists "measurement" add column if not exists "shoulder" real null, add column if not exists "length" real null, add column if not exists "sleeve" real null, add column if not exists "inseam" real null;`);
  }

}
