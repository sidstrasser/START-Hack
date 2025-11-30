"""
HubSpot API routes for CRM integration.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
from app.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

HUBSPOT_BASE_URL = "https://api.hubapi.com"


def get_hubspot_headers():
    """Get headers for HubSpot API requests."""
    # Get fresh settings each time (not cached at module level)
    from app.config import get_settings
    current_settings = get_settings()
    api_key = current_settings.hubspot_api_key
    
    logger.info(f"[HubSpot] Using API key: {api_key[:15]}... (length: {len(api_key)})")
    
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }


# ============================================================
# Request/Response Models
# ============================================================

class HubSpotContact(BaseModel):
    """HubSpot contact model."""
    id: str
    name: str
    email: Optional[str] = None
    company: Optional[str] = None


class HubSpotContactsResponse(BaseModel):
    """Response model for contacts list."""
    contacts: List[HubSpotContact]


class ExportRequest(BaseModel):
    """Request model for exporting to HubSpot."""
    contactId: str
    summary: str
    nextActions: List[str]
    completedActions: List[str]
    callDuration: int  # seconds
    metrics: Optional[dict] = None  # {value, risk, outcome}


class ExportResponse(BaseModel):
    """Response model for export."""
    success: bool
    noteId: Optional[str] = None
    taskIds: List[str] = []
    message: str


# ============================================================
# Endpoints
# ============================================================

@router.get("/hubspot/contacts", response_model=HubSpotContactsResponse)
async def get_hubspot_contacts(search: Optional[str] = None):
    """
    Fetch contacts from HubSpot.
    Uses GET /crm/v3/objects/contacts as per HubSpot API docs.
    """
    from app.config import get_settings
    settings = get_settings()
    
    logger.info(f"[HubSpot] Fetching contacts, search={search}")
    
    # Validate API key format
    api_key = settings.hubspot_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="HubSpot API key not configured")
    
    try:
        headers = get_hubspot_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            # List all contacts using GET /crm/v3/objects/contacts
            url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts"
            logger.info(f"[HubSpot] Making request to: {url}")
            
            response = await client.get(
                url,
                headers=headers,
                params={
                    "limit": 50,
                    "properties": "firstname,lastname,email,company"
                }
            )
            
            logger.info(f"[HubSpot] Response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"[HubSpot] API error: {response.status_code}")
                logger.error(f"[HubSpot] Response body: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"HubSpot API error: {response.text}")
            
            data = response.json()
            contacts = []
            
            for result in data.get("results", []):
                props = result.get("properties", {})
                firstname = props.get("firstname", "")
                lastname = props.get("lastname", "")
                name = f"{firstname} {lastname}".strip() or "Unknown"
                
                contacts.append(HubSpotContact(
                    id=result["id"],
                    name=name,
                    email=props.get("email"),
                    company=props.get("company")
                ))
            
            logger.info(f"[HubSpot] Found {len(contacts)} contacts")
            return HubSpotContactsResponse(contacts=contacts)
            
    except httpx.RequestError as e:
        logger.error(f"[HubSpot] Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to HubSpot: {str(e)}")


@router.post("/hubspot/export", response_model=ExportResponse)
async def export_to_hubspot(request: ExportRequest):
    """
    Export call summary and tasks to HubSpot.
    Creates a Note and Tasks associated with the selected contact.
    """
    logger.info(f"[HubSpot] Exporting to contact {request.contactId}")
    
    try:
        async with httpx.AsyncClient() as client:
            task_ids = []
            note_id = None
            
            # 1. Create a Note with the call summary
            duration_mins = request.callDuration // 60
            completed_items = "\n".join([f"✓ {item}" for item in request.completedActions]) if request.completedActions else "None"
            
            note_body = f"""📞 NEGOTIATION CALL SUMMARY
Duration: {duration_mins} minutes

{request.summary}

---
COMPLETED DURING CALL:
{completed_items}

---
NEXT STEPS:
{chr(10).join([f"• {action}" for action in request.nextActions])}
"""
            
            if request.metrics:
                note_body += f"""
---
METRICS:
• Value Score: {request.metrics.get('value', 'N/A')}%
• Risk Level: {request.metrics.get('risk', 'N/A')}%
• Goal Achievement: {request.metrics.get('outcome', 'N/A')}%
"""
            
            # Create the note
            note_response = await client.post(
                f"{HUBSPOT_BASE_URL}/crm/v3/objects/notes",
                headers=get_hubspot_headers(),
                json={
                    "properties": {
                        "hs_note_body": note_body,
                        "hs_timestamp": str(int(__import__('time').time() * 1000))
                    }
                }
            )
            
            if note_response.status_code == 201:
                note_data = note_response.json()
                note_id = note_data["id"]
                logger.info(f"[HubSpot] Created note {note_id}")
                
                # Associate note with contact
                await client.put(
                    f"{HUBSPOT_BASE_URL}/crm/v3/objects/notes/{note_id}/associations/contacts/{request.contactId}/202",
                    headers=get_hubspot_headers()
                )
                logger.info(f"[HubSpot] Associated note with contact")
            else:
                logger.error(f"[HubSpot] Failed to create note: {note_response.text}")
            
            # 2. Create Tasks for each next action
            for action in request.nextActions[:3]:  # Max 3 tasks
                # Due date = 7 days from now
                due_date = int((__import__('time').time() + 7 * 24 * 60 * 60) * 1000)
                
                task_response = await client.post(
                    f"{HUBSPOT_BASE_URL}/crm/v3/objects/tasks",
                    headers=get_hubspot_headers(),
                    json={
                        "properties": {
                            "hs_task_subject": action,
                            "hs_task_body": f"Follow-up from negotiation call",
                            "hs_task_status": "NOT_STARTED",
                            "hs_task_priority": "MEDIUM",
                            "hs_timestamp": str(due_date)
                        }
                    }
                )
                
                if task_response.status_code == 201:
                    task_data = task_response.json()
                    task_id = task_data["id"]
                    task_ids.append(task_id)
                    logger.info(f"[HubSpot] Created task {task_id}")
                    
                    # Associate task with contact
                    await client.put(
                        f"{HUBSPOT_BASE_URL}/crm/v3/objects/tasks/{task_id}/associations/contacts/{request.contactId}/204",
                        headers=get_hubspot_headers()
                    )
                else:
                    logger.error(f"[HubSpot] Failed to create task: {task_response.text}")
            
            return ExportResponse(
                success=True,
                noteId=note_id,
                taskIds=task_ids,
                message=f"Created 1 note and {len(task_ids)} tasks in HubSpot"
            )
            
    except httpx.RequestError as e:
        logger.error(f"[HubSpot] Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export to HubSpot: {str(e)}")
    except Exception as e:
        logger.error(f"[HubSpot] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

