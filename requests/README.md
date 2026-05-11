# REST Client request files

These `.http` files exercise the API end-to-end without curl.

## Requirements

Install the **REST Client** extension (`humao.rest-client`) — it's in the workspace's recommended extensions, so VS Code should have offered it on first open.

## Usage

1. Open any `.http` file.
2. You'll see "Send Request" links above each HTTP block — click them.
3. The response opens in a side panel.

## Files

| File                  | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `health.http`         | Liveness + readiness checks                          |
| `auth.http`           | Login, refresh, me, logout                           |
| `orders.http`         | Create orders, list/filter, advance through states   |
| `admin.http`          | User management + pricing config                     |

## Typical flow for Phase 3

1. `auth.http` → **Login as admin** → copy `accessToken`
2. Paste into `@accessToken` at the top of `orders.http` and `admin.http`
3. `orders.http` → **Create pickup order** → copy `id` into `@orderId`
4. Run the state-machine transitions in order
5. `orders.http` → **Public tracking** to see the event timeline grow

## Tips

- Responses can be referenced between blocks in the same file via `{{requestName.response.body.field}}`. Look for `# @name foo` comments.
- Cross-file variable referencing isn't supported by REST Client — copy-paste tokens between files.
- To switch environments (e.g., staging), change the `@base` variable at the top.
