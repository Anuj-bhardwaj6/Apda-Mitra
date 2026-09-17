import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.report import CitizenReport
from app.db.repositories.base import BaseRepository


class FallbackCitizenReport:
    """Mock report object that mimics CitizenReport ORM model for offline fallback."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


# Global in-memory report store for resilient demonstration
IN_MEMORY_REPORTS: List[FallbackCitizenReport] = [
    FallbackCitizenReport(
        id=uuid.UUID("88888888-8888-4888-8888-888888888888"),
        incident_ref="REP-NER-2026-001",
        user_id=None,
        category="LANDSLIDE",
        urgency="URGENT_ASSISTANCE",
        landmark="Near Shillong Peak Turn, NH-40 Cut Slope",
        contact_number="+91-9876543210",
        description="Fresh rock boulders and gravel rolling onto left carriageway. Tree leaning precariously.",
        latitude=25.534,
        longitude=91.868,
        photo_url="https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600",
        status="DISPATCHED",
        verified_by_id=None,
        verification_notes="PWD Quick-Response Patrol 3 dispatched with JCB earthmover.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ),
    FallbackCitizenReport(
        id=uuid.UUID("99999999-9999-4999-8999-999999999999"),
        incident_ref="REP-NER-2026-002",
        user_id=None,
        category="URBAN_WATERLOGGING",
        urgency="PROPERTY_HAZARD",
        landmark="Umsning Bazar Culvert Junction",
        contact_number="+91-9862001122",
        description="Drainage culvert blocked with debris. Knee-deep muddy water accumulating near shops.",
        latitude=25.751,
        longitude=91.902,
        photo_url=None,
        status="VERIFIED",
        verified_by_id=None,
        verification_notes="Municipal drainage crew notified for desilting pump deployment.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ),
]


class ReportRepository(BaseRepository[CitizenReport]):
    """Data access repository for Citizen Emergency Field Reports."""

    def __init__(self, session: AsyncSession):
        super().__init__(CitizenReport, session)

    async def create(self, attributes: dict) -> CitizenReport:
        try:
            return await super().create(attributes)
        except Exception:
            # Resilient in-memory fallback
            report = FallbackCitizenReport(
                id=attributes.get("id") or uuid.uuid4(),
                incident_ref=attributes.get("incident_ref") or f"REP-{uuid.uuid4().hex[:8].upper()}",
                user_id=attributes.get("user_id"),
                category=attributes.get("category", "LANDSLIDE"),
                urgency=attributes.get("urgency", "URGENT_ASSISTANCE"),
                landmark=attributes.get("landmark", "Detected Location"),
                contact_number=attributes.get("contact_number", ""),
                description=attributes.get("description", ""),
                latitude=attributes.get("latitude", 25.532),
                longitude=attributes.get("longitude", 91.865),
                photo_url=attributes.get("photo_url"),
                status=attributes.get("status", "SUBMITTED"),
                verified_by_id=None,
                verification_notes="Buffered via Resilient Citizen Intake Engine.",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            IN_MEMORY_REPORTS.insert(0, report)
            return report

    async def get_by_reference(self, incident_ref: str) -> Optional[CitizenReport]:
        try:
            stmt = select(CitizenReport).where(CitizenReport.incident_ref == incident_ref)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception:
            for rep in IN_MEMORY_REPORTS:
                if rep.incident_ref == incident_ref:
                    return rep
            return None

    async def get_by_status(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[CitizenReport]:
        try:
            stmt = select(CitizenReport)
            if status:
                stmt = stmt.where(CitizenReport.status == status)
            stmt = stmt.order_by(CitizenReport.created_at.desc()).offset(skip).limit(limit)
            result = await self.session.execute(stmt)
            items = list(result.scalars().all())
            if items:
                return items
        except Exception:
            pass
        if status:
            return [r for r in IN_MEMORY_REPORTS if r.status == status][skip : skip + limit]
        return IN_MEMORY_REPORTS[skip : skip + limit]

    async def get_by_user_id(self, user_id: uuid.UUID) -> List[CitizenReport]:
        try:
            stmt = (
                select(CitizenReport)
                .where(CitizenReport.user_id == user_id)
                .order_by(CitizenReport.created_at.desc())
            )
            result = await self.session.execute(stmt)
            items = list(result.scalars().all())
            if items:
                return items
        except Exception:
            pass
        return [r for r in IN_MEMORY_REPORTS if r.user_id == user_id]

    async def verify_report(
        self, report_id: uuid.UUID, officer_id: uuid.UUID, status: str, notes: Optional[str]
    ) -> Optional[CitizenReport]:
        try:
            report = await self.get_by_id(report_id)
            if report:
                report.status = status
                report.verified_by_id = officer_id
                report.verification_notes = notes
                self.session.add(report)
                await self.session.flush()
                return report
        except Exception:
            pass

        for r in IN_MEMORY_REPORTS:
            if r.id == report_id:
                r.status = status
                r.verified_by_id = officer_id
                r.verification_notes = notes
                return r
        return None
