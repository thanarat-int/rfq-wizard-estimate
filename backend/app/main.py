from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import rfq, quotation, master_data, chat, project
from app.models.base import Base
from app.api.deps import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="RFQ Wizard API",
    description="AI-Powered RFQ & Estimation System — Deep Estimate",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(master_data.router, prefix="/api/master-data", tags=["Master Data"])
app.include_router(rfq.router, prefix="/api/rfq", tags=["RFQ"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(project.router, prefix="/api/projects", tags=["Projects"])
app.include_router(quotation.router, prefix="/api/quotations", tags=["Quotations"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "RFQ Wizard API"}
