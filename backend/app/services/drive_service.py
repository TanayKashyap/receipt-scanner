import io
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials

from app.config import settings

logger = logging.getLogger(__name__)

def get_drive_service(access_token: str):
    """Build Google Drive API client using user's OAuth access token"""
    credentials = Credentials(token=access_token)
    return build("drive", "v3", credentials=credentials)

def get_or_create_folder(drive_service, folder_name: str, parent_id: Optional[str] = None) -> str:
    """Find existing folder or create a new one"""
    query_parts = [
        "mimeType = 'application/vnd.google-apps.folder'",
        f"name = '{folder_name}'",
        "trashed = false"
    ]
    if parent_id:
        query_parts.append(f"'{parent_id}' in parents")
        
    query = " and ".join(query_parts)
    
    response = drive_service.files().list(
        q=query,
        spaces="drive",
        fields="files(id, name)",
        pageSize=5
    ).execute()
    
    files = response.get("files", [])
    if files:
        return files[0]["id"]
        
    # Create folder
    folder_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    if parent_id:
        folder_metadata["parents"] = [parent_id]
        
    created = drive_service.files().create(
        body=folder_metadata,
        fields="id"
    ).execute()
    
    logger.info(f"Created Google Drive folder '{folder_name}' with ID: {created.get('id')}")
    return created["id"]

def upload_receipt_image(
    access_token: str,
    image_bytes: bytes,
    filename: Optional[str] = None,
    mime_type: str = "image/jpeg",
    store: Optional[str] = None,
    date: Optional[str] = None,
    amount: Optional[float] = None
) -> Dict[str, Any]:
    """
    Uploads a receipt image to user's Google Drive in Receipt_Scanner_App/Images/
    """
    # Demo/Mock token detection
    if access_token.startswith("demo_") or access_token == "mock_token":
        logger.info("Using simulated Google Drive upload for demo token.")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_store = (store or "Receipt").replace(" ", "_")
        simulated_id = f"demo_drive_file_{timestamp}"
        return {
            "file_id": simulated_id,
            "name": filename or f"Receipt_{safe_store}_{timestamp}.jpg",
            "webViewLink": f"https://drive.google.com/file/d/{simulated_id}/view?usp=drivesdk",
            "webContentLink": f"https://drive.google.com/uc?id={simulated_id}&export=download",
            "folder_id": "demo_images_folder_id"
        }

    try:
        drive_service = get_drive_service(access_token)
        
        # 1. Ensure Root App Folder exists
        root_folder_id = get_or_create_folder(
            drive_service, 
            folder_name=settings.DRIVE_APP_FOLDER
        )
        
        # 2. Ensure Images subfolder exists
        images_folder_id = get_or_create_folder(
            drive_service,
            folder_name="Images",
            parent_id=root_folder_id
        )
        
        # 3. Prepare file metadata
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_store = "".join(c for c in (store or "Unknown") if c.isalnum() or c in ("-", "_")).strip()
        safe_date = (date or datetime.now().strftime("%Y-%m-%d")).replace("-", "")
        
        actual_filename = filename or f"Receipt_{safe_store}_{safe_date}_{timestamp}.jpg"
        
        description_parts = []
        if store:
            description_parts.append(f"Store: {store}")
        if date:
            description_parts.append(f"Date: {date}")
        if amount is not None:
            description_parts.append(f"Amount: ${amount:.2f}")
            
        file_metadata = {
            "name": actual_filename,
            "parents": [images_folder_id],
            "description": " | ".join(description_parts) or "Uploaded via Receipt Scanner PWA"
        }
        
        media = MediaIoBaseUpload(
            io.BytesIO(image_bytes),
            mimetype=mime_type or "image/jpeg",
            resumable=True
        )
        
        uploaded_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, name, webViewLink, webContentLink, parents"
        ).execute()
        
        logger.info(f"Receipt image uploaded successfully to Drive: {uploaded_file.get('name')}")
        
        return {
            "file_id": uploaded_file.get("id"),
            "name": uploaded_file.get("name"),
            "webViewLink": uploaded_file.get("webViewLink", f"https://drive.google.com/file/d/{uploaded_file.get('id')}/view"),
            "webContentLink": uploaded_file.get("webContentLink"),
            "folder_id": images_folder_id
        }
    except Exception as e:
        logger.error(f"Google Drive upload failed: {e}")
        raise RuntimeError(f"Google Drive upload failed: {str(e)}")
