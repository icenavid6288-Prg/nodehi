-- AlterTable
-- نکته: `paidAt` از مهاجرت اولیه (`20260927154246_init`) روی جدول Order هست و
-- اینجا **نباید** دوباره ساخته شود؛ افزودن دوباره‌اش باعث می‌شد بازپخش
-- مهاجرت‌ها روی دیتابیس تازه (shadow/نصب جدید) با خطای
-- «duplicate column name: paidAt» شکست بخورد.
ALTER TABLE "Order" ADD COLUMN "paymentAuthority" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentRefId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentCardPan" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentAuthority_key" ON "Order"("paymentAuthority");
