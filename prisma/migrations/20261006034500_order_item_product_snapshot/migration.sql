BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[OrderItems] DROP CONSTRAINT [OrderItems_productId_fkey];

-- AlterTable
ALTER TABLE [dbo].[OrderItems] ALTER COLUMN [productId] INT NULL;
ALTER TABLE [dbo].[OrderItems] ADD [productName] NVARCHAR(1000) NULL, [productImage] NVARCHAR(1000) NULL;

-- Backfill existing order items with product snapshots
UPDATE oi
SET oi.productName = p.name, oi.productImage = p.image
FROM [dbo].[OrderItems] oi
JOIN [dbo].[Products] p ON oi.productId = p.id;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItems] ADD CONSTRAINT [OrderItems_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Products]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
