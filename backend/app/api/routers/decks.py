import uuid

from fastapi import APIRouter, Body, status
from fastapi.responses import JSONResponse

from app.api.deps import SessionDep
from app.schemas.deck import DeckCreate, DeckDetailOut, DeckOut, DeckUpdate
from app.services import decks as svc
from app.services import importer

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckOut])
async def list_decks(session: SessionDep):
    return await svc.list_decks(session)


@router.post("", response_model=DeckOut, status_code=status.HTTP_201_CREATED)
async def create_deck(data: DeckCreate, session: SessionDep):
    return await svc.create_deck(session, data)


@router.post("/import")
async def import_deck_route(session: SessionDep, payload: dict = Body(...)):
    try:
        deck = await importer.import_deck(session, payload)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "msg": str(exc)})
    return {
        "ok": True,
        "msg": f'Đã nhập "{deck.name}" · {deck.count} thẻ',
        "deck": deck.model_dump(mode="json"),
    }


@router.get("/{deck_id}", response_model=DeckDetailOut)
async def get_deck(deck_id: uuid.UUID, session: SessionDep):
    return await svc.get_deck_detail(session, deck_id)


@router.patch("/{deck_id}", response_model=DeckOut)
async def update_deck(deck_id: uuid.UUID, data: DeckUpdate, session: SessionDep):
    return await svc.update_deck(session, deck_id, data)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(deck_id: uuid.UUID, session: SessionDep):
    await svc.delete_deck(session, deck_id)
