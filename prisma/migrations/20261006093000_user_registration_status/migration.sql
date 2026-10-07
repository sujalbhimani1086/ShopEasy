BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Users] ADD [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Users_status_df] DEFAULT 'PENDING';

-- Backfill existing users to APPROVED so existing admins and customers are not locked out
UPDATE [dbo].[Users] SET [status] = 'APPROVED';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
