from __future__ import annotations

from uuid import UUID

from httpx import AsyncClient

CREATED_LOG = "Request created"
EXPECTED_LOGS = [
    CREATED_LOG,
    "Starting processing...",
    "Validating data...",
    "Calculating sum...",
    "Finished successfully.",
]


async def test_create_answers_with_a_pending_id(client: AsyncClient) -> None:
    response = await client.post("/requests", json={"numbers": [10, 20, 5]})

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending"
    UUID(body["id"])  # the id is a real uuid


async def test_request_completes_with_the_sum(client: AsyncClient) -> None:
    created = await client.post("/requests", json={"numbers": [10, 20, 5]})
    request_id = created.json()["id"]

    detail = (await client.get(f"/requests/{request_id}")).json()

    assert detail["status"] == "completed"
    assert detail["progress"] == 100
    assert detail["result"] == 35
    assert detail["logs"] == EXPECTED_LOGS


async def test_list_returns_every_request_newest_first(client: AsyncClient) -> None:
    first = (await client.post("/requests", json={"numbers": [1]})).json()["id"]
    second = (await client.post("/requests", json={"numbers": [2]})).json()["id"]

    response = await client.get("/requests")

    assert response.status_code == 200
    rows = response.json()
    assert [row["id"] for row in rows] == [second, first]
    # The list screen gets the basics, not the whole log history.
    assert set(rows[0]) == {
        "id",
        "status",
        "progress",
        "numbers",
        "result",
        "created_at",
        "updated_at",
    }


async def test_list_is_empty_before_anything_is_created(client: AsyncClient) -> None:
    assert (await client.get("/requests")).json() == []


async def test_unknown_request_is_not_found(client: AsyncClient) -> None:
    response = await client.get("/requests/does-not-exist")

    assert response.status_code == 404


async def test_cancelling_an_unknown_request_is_not_found(client: AsyncClient) -> None:
    response = await client.post("/requests/does-not-exist/cancel")

    assert response.status_code == 404


async def test_cancelling_a_finished_request_is_a_conflict(client: AsyncClient) -> None:
    request_id = (await client.post("/requests", json={"numbers": [1, 2]})).json()["id"]

    response = await client.post(f"/requests/{request_id}/cancel")

    assert response.status_code == 409
    assert "completed" in response.json()["detail"]
    # The completed request was left exactly as it was.
    detail = (await client.get(f"/requests/{request_id}")).json()
    assert detail["status"] == "completed"
    assert detail["result"] == 3


async def test_empty_list_of_numbers_is_rejected(client: AsyncClient) -> None:
    response = await client.post("/requests", json={"numbers": []})

    assert response.status_code == 422


async def test_non_numeric_input_is_rejected(client: AsyncClient) -> None:
    response = await client.post("/requests", json={"numbers": ["abc"]})

    assert response.status_code == 422


async def test_health(client: AsyncClient) -> None:
    assert (await client.get("/health")).json() == {"status": "ok"}
