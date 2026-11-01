import logging
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any, Optional

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app.config import settings
from app.models import ReceiptRecord
from app.services.drive_service import get_or_create_folder, get_drive_service

logger = logging.getLogger(__name__)

def get_sheets_service(access_token: str):
    """Build Google Sheets API client using user's OAuth access token"""
    credentials = Credentials(token=access_token)
    return build("sheets", "v4", credentials=credentials)

def export_receipts_to_sheet(
    access_token: str,
    records: List[ReceiptRecord],
    sheet_title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Groups receipt records by Store, sorts by Date within each group,
    creates a formatted Google Sheet in Receipt_Scanner_App folder,
    applies professional formatting (frozen header, bold headers, currency formats, subtotals, grand total),
    and returns spreadsheet details with direct link.
    """
    total_amount = sum(r.Amount for r in records)
    today_str = datetime.now().strftime("%Y-%m-%d")
    actual_title = sheet_title or f"Receipts_Export_{today_str}"
    
    # 1. Group records by Store and sort chronologically by Date
    grouped_by_store: Dict[str, List[ReceiptRecord]] = defaultdict(list)
    for record in records:
        store_name = record.Store.strip() if record.Store else "Uncategorized"
        grouped_by_store[store_name].append(record)
        
    for store_name in grouped_by_store:
        grouped_by_store[store_name].sort(key=lambda r: r.Date or "")

    sorted_store_names = sorted(grouped_by_store.keys(), key=lambda s: s.lower())

    # Demo / Mock check
    if access_token.startswith("demo_") or access_token == "mock_token":
        logger.info("Using simulated Google Sheets export for demo token.")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        simulated_id = f"demo_sheets_id_{timestamp}"
        return {
            "spreadsheet_id": simulated_id,
            "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{simulated_id}/edit",
            "title": actual_title,
            "records_count": len(records),
            "stores_count": len(sorted_store_names),
            "total_amount": round(total_amount, 2),
            "folder_id": "demo_root_folder_id"
        }

    try:
        drive_service = get_drive_service(access_token)
        sheets_service = get_sheets_service(access_token)
        
        # 2. Get or create parent folder in user's Drive
        root_folder_id = get_or_create_folder(drive_service, folder_name=settings.DRIVE_APP_FOLDER)
        
        # 3. Create the Google Spreadsheet directly inside the folder
        file_metadata = {
            "name": actual_title,
            "mimeType": "application/vnd.google-apps.spreadsheet",
            "parents": [root_folder_id]
        }
        created_file = drive_service.files().create(
            body=file_metadata,
            fields="id, name, webViewLink"
        ).execute()
        
        spreadsheet_id = created_file["id"]
        spreadsheet_url = created_file.get("webViewLink", f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit")
        
        # 4. Prepare structured row data
        # Row 1: Title Banner
        # Row 2: Subtitle / Export Info
        # Row 3: Blank
        # Row 4: Column Headers: Store | Date | Amount | Receipt Image Link | Notes
        rows: List[List[Any]] = [
            [f"Receipts Expense Report — {today_str}", "", "", "", ""],
            [f"Exported via Receipt Scanner PWA | Total Entries: {len(records)} | Total Spent: ${total_amount:,.2f}", "", "", "", ""],
            ["", "", "", "", ""],
            ["Store / Merchant", "Transaction Date", "Amount (USD)", "Image Link", "Notes"]
        ]
        
        format_requests = []
        current_row_idx = 4  # 0-indexed: row 4 is line 5 in sheets
        
        for store in sorted_store_names:
            store_records = grouped_by_store[store]
            store_subtotal = sum(r.Amount for r in store_records)
            
            # Store Group Header Row
            rows.append([f"🏬 {store}", "", "", "", f"{len(store_records)} receipts"])
            
            # Formatting for store section header
            format_requests.append({
                "repeatCell": {
                    "range": {
                        "sheetId": 0,
                        "startRowIndex": current_row_idx,
                        "endRowIndex": current_row_idx + 1,
                        "startColumnIndex": 0,
                        "endColumnIndex": 5
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "backgroundColor": {"red": 0.93, "green": 0.95, "blue": 1.0}, # Soft indigo
                            "textFormat": {"bold": True, "foregroundColor": {"red": 0.15, "green": 0.23, "blue": 0.36}}
                        }
                    },
                    "fields": "userEnteredFormat(backgroundColor,textFormat)"
                }
            })
            current_row_idx += 1
            
            # Receipt Rows
            for item in store_records:
                img_link = item.Drive_Image_URL or "N/A"
                rows.append([
                    store,
                    item.Date or "Unknown",
                    item.Amount,
                    img_link,
                    item.notes or ""
                ])
                current_row_idx += 1
                
            # Store Subtotal Row
            rows.append(["", f"Subtotal ({store})", store_subtotal, "", ""])
            format_requests.append({
                "repeatCell": {
                    "range": {
                        "sheetId": 0,
                        "startRowIndex": current_row_idx,
                        "endRowIndex": current_row_idx + 1,
                        "startColumnIndex": 1,
                        "endColumnIndex": 3
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "textFormat": {"italic": True, "bold": True},
                            "borders": {
                                "top": {"style": "SOLID", "color": {"red": 0.8, "green": 0.8, "blue": 0.8}},
                                "bottom": {"style": "SOLID", "color": {"red": 0.8, "green": 0.8, "blue": 0.8}}
                            }
                        }
                    },
                    "fields": "userEnteredFormat(textFormat,borders)"
                }
            })
            current_row_idx += 1
            
            # Spacer row
            rows.append(["", "", "", "", ""])
            current_row_idx += 1
            
        # Grand Total Row
        grand_total_row_idx = current_row_idx
        rows.append(["GRAND TOTAL", "", total_amount, "", f"All {len(records)} entries"])
        
        # 5. Push row values to Sheet
        value_range = {
            "range": "Sheet1!A1",
            "majorDimension": "ROWS",
            "values": rows
        }
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range="Sheet1!A1",
            valueInputOption="USER_ENTERED",
            body=value_range
        ).execute()
        
        # 6. Apply professional styling requests
        # Title styling (Row 1)
        format_requests.append({
            "repeatCell": {
                "range": {"sheetId": 0, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 5},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.06, "green": 0.09, "blue": 0.16}, # Dark slate #0f172a
                        "textFormat": {"bold": True, "fontSize": 14, "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}}
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }
        })
        
        # Table Header styling (Row 4 - index 3)
        format_requests.append({
            "repeatCell": {
                "range": {"sheetId": 0, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 5},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.12, "green": 0.16, "blue": 0.25}, # #1f2937
                        "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}},
                        "horizontalAlignment": "LEFT"
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
            }
        })
        
        # Grand Total Row styling
        format_requests.append({
            "repeatCell": {
                "range": {"sheetId": 0, "startRowIndex": grand_total_row_idx, "endRowIndex": grand_total_row_idx + 1, "startColumnIndex": 0, "endColumnIndex": 5},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.95, "green": 0.96, "blue": 0.98},
                        "textFormat": {"bold": True, "fontSize": 12, "foregroundColor": {"red": 0.06, "green": 0.09, "blue": 0.16}},
                        "borders": {
                            "top": {"style": "SOLID", "color": {"red": 0.2, "green": 0.2, "blue": 0.2}},
                            "bottom": {"style": "DOUBLE", "color": {"red": 0.0, "green": 0.0, "blue": 0.0}}
                        }
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,borders)"
            }
        })
        
        # Currency formatting for Amount column (Column C / Index 2)
        format_requests.append({
            "repeatCell": {
                "range": {"sheetId": 0, "startRowIndex": 4, "endRowIndex": len(rows), "startColumnIndex": 2, "endColumnIndex": 3},
                "cell": {
                    "userEnteredFormat": {
                        "numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"},
                        "horizontalAlignment": "RIGHT"
                    }
                },
                "fields": "userEnteredFormat(numberFormat,horizontalAlignment)"
            }
        })
        
        # Freeze top 4 rows
        format_requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": 0,
                    "gridProperties": {
                        "frozenRowCount": 4
                    }
                },
                "fields": "gridProperties.frozenRowCount"
            }
        })
        
        # Auto-resize column widths
        format_requests.append({
            "autoResizeDimensions": {
                "dimensions": {
                    "sheetId": 0,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": 5
                }
            }
        })
        
        # Execute batch format update
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"requests": format_requests}
        ).execute()
        
        logger.info(f"Successfully generated formatted Google Sheet: {spreadsheet_id}")
        
        return {
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_url": spreadsheet_url,
            "title": actual_title,
            "records_count": len(records),
            "stores_count": len(sorted_store_names),
            "total_amount": round(total_amount, 2),
            "folder_id": root_folder_id
        }
        
    except Exception as e:
        logger.error(f"Google Sheets export failed: {e}")
        raise RuntimeError(f"Google Sheets export failed: {str(e)}")
