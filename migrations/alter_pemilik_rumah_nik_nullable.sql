-- Migration: Make NIK nullable in pemilik_rumah
-- Run this after create_pemilik_rumah.sql

ALTER TABLE `pemilik_rumah` MODIFY `nik` VARCHAR(16) NULL;