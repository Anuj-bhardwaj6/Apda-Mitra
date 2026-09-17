from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic asynchronous repository implementing CRUD operations,
    query composition, and pagination for SQLAlchemy 2.0 models.
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        """Retrieves a single record by primary key."""
        stmt = select(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Retrieves paginated records ordered by creation date descending if available."""
        stmt = select(self.model)
        if hasattr(self.model, "created_at"):
            stmt = stmt.order_by(self.model.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ModelType:
        """Instantiates, persists, and refreshes a new model entity."""
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, db_obj: ModelType, **kwargs) -> ModelType:
        """Updates attributes on an existing entity and flushes changes."""
        for key, value in kwargs.items():
            if hasattr(db_obj, key) and value is not None:
                setattr(db_obj, key, value)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, id: Any) -> bool:
        """Removes an entity by primary key."""
        obj = await self.get_by_id(id)
        if obj:
            await self.session.delete(obj)
            await self.session.flush()
            return True
        return False

    async def count(self) -> int:
        """Returns total row count for the model."""
        stmt = select(func.count()).select_from(self.model)
        result = await self.session.execute(stmt)
        return result.scalar() or 0
