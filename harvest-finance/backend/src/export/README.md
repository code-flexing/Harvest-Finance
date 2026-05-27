# Export Module

This module handles the aggregation and exporting of user and platform transaction data (deposits, withdrawals, and claimed rewards) in multiple formats.

## Supported Formats

The module supports exporting data into three formats:
- **CSV**: Uses the `fast-csv` library. Handled by `ExportService.generateCsv(data)`.
- **Excel**: Generates styled `.xlsx` spreadsheets using the `exceljs` library. Handled by `ExportService.generateExcel(data)`.
- **PDF**: Generates a formatted multi-page PDF transaction report using the `pdfkit` library. Handled by `ExportService.generatePdf(data)`.

## Usage

The `ExportController` exposes the following endpoints for exporting transaction data (with query parameter `format` as `csv`, `excel`, or `pdf`):

### User Endpoints
- `GET /api/v1/export/users/:userId/vault/export`: Exports vault transaction data for the specified user (user/admin authorized).
- `GET /api/v1/export/users/:userId/transactions`: Exports transaction history for the specified user (user/admin authorized).

### Admin Endpoints
- `GET /api/v1/export/admin/vault/export`: Exports aggregated vault data across all users (admin only).
- `GET /api/v1/export/admin/transactions`: Exports all platform transactions (admin only).

## How to Add New Formats

To add a new export format (e.g., `JSON` or `HTML`):

1. **Define the format generator in `ExportService`**:
   Create a method (e.g., `generateJson(data: TransactionExportData[]): string`) in [export.service.ts](file:///Users/backenddevopsdeveloper/Downloads/DRIPS/mode-Harvest-Finance/harvest-finance/backend/src/export/export.service.ts).

2. **Update the controller**:
   - Update the `@ApiQuery` metadata to include the new format options in [export.controller.ts](file:///Users/backenddevopsdeveloper/Downloads/DRIPS/mode-Harvest-Finance/harvest-finance/backend/src/export/export.controller.ts).
   - Update the controller endpoints to check for the new format, set the appropriate `Content-Type` and `Content-Disposition` headers on the Express `Response` object, and send the generated buffer/content.
