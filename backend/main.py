from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from . import router_auth, router_admin, router_store

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SaaS Store Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_auth.router)
app.include_router(router_admin.router)
app.include_router(router_store.router)

@app.get("/")
def read_root():
    return {"message": "SaaS Store Management API is running"}
