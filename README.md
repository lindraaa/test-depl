<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->


# Vet Backend (vet-be)

NestJS + TypeScript backend following a simple Clean Architecture structure.

- **Framework:** NestJS 12
- **Language:** TypeScript (strict mode)
- **HTTP:** Express
- **Validation:** `class-validator` + `class-transformer` via a global `ValidationPipe` (whitelist + transform)
- **API docs:** `@nestjs/swagger` — interactive OpenAPI at `/api/docs`
- **Health:** `@nestjs/terminus` at `/api/v1/health`
- **Database:** PostgreSQL via TypeORM (`DATABASE_URL`). Supabase is hosted Postgres — use the connection URI (SSL on). Session pooler for the app; **direct** host for migrations.
- **Auth:** not implemented yet

## Getting started

```bash
cd backend
npm install

# quick start
npm run start        # compiles and runs on http://localhost:3000
npm run start:dev    # watch mode
npm run build        # compile to dist/
npm run lint         # ESLint + Prettier (autofix)

# database (TypeORM)
npm run migration:generate -- src/migrations/Name   # diff entities vs DB → migration file
npm run migration:run                               # apply pending migrations
npm run migration:revert                            # undo the last migration
```

Environment variables are read from `backend/.env` (see `backend/.env.example`).
Override any value with real environment variables — those take precedence.

## Setting up a new table

`synchronize` is disabled, so tables are created via migrations.

1. **Create the entity** — `src/modules/<feature>/entities/<name>.entity.ts`
   (a TypeORM `@Entity` class; it maps to a table and is the API model).
2. **Register it** with `TypeOrmModule.forFeature([...])` in the feature's module.
3. **Add business logic** — a service (and repository, if needed) in the feature module.
4. **Expose it over HTTP** — a controller with `@Controller('...')` routes.
5. **Generate the migration** (compares entities against the live DB schema):

   ```bash
   npm run migration:generate -- src/migrations/Create<Name>
   ```

6. **Review** the generated SQL in `src/migrations/`.
7. **Apply it**:

   ```bash
   npm run migration:run
   ```

The table then appears in the database (e.g. Supabase → Table Editor).

## Project layout

```
backend/src/
├── main.ts                      # bootstrap: global prefix /api/v1, Swagger, global pipes & filters
├── app.module.ts                # root module: env config + database + health + users
├── data-source.ts               # TypeORM DataSource for the migration CLI
│
├── config/
│   ├── env.config.ts            # ConfigModule (loads .env)
│   ├── database.config.ts       # TypeORM options + SSL for Supabase (migration CLI)
│   └── database.module.ts       # TypeOrmModule.forRoot (DATABASE_URL)
│
├── common/                      # shared building blocks
│   ├── decorators/              # response envelope + message decorators for Swagger
│   ├── filters/                 # AllExceptionsFilter → structured error responses
│   ├── interceptors/            # TransformInterceptor → standard response envelope
│   ├── pipes/                   # global ValidationPipe
│   ├── guards/  middleware/     # (reserved)
│   └── utils/                   # apiResponse() / paginated() helpers
│
├── modules/
│   ├── health/                  # @nestjs/terminus health check
│   ├── auth/                    # Supabase auth (guard, /auth/me, session)
│   ├── roles/                   # RBAC: roles, permissions, PermissionsGuard
│   │   ├── dto/                 # create/update role, replace permissions
│   │   ├── entities/            # role.entity.ts, permission.entity.ts
│   │   ├── guards/              # permissions.guard.ts (dynamic RBAC check)
│   │   ├── repositories/        # RolesRepository, PermissionsRepository
│   │   ├── services/            # RolesService, AuthorizationService
│   │   ├── controllers/         # /roles, /permissions
│   │   └── roles.module.ts
│   └── users/                   # users + role assignment
│       ├── dto/                 # update-user-role.dto.ts
│       ├── entities/            # TypeORM entity (user.entity.ts)
│       ├── repositories/        # UsersRepository (TypeORM Repository<T> wrapper)
│       ├── services/            # business logic
│       ├── controllers/         # HTTP layer
│       └── users.module.ts
│
├── migrations/                  # TypeORM schema migrations
│
└── shared/                      # constants / types / interfaces (reserved)
```

All code lives in `backend/`; `docs/PLAN.md` and `docs/DB.md` hold the full plan.

## Architecture rules

- Controllers handle HTTP requests and responses — no business logic.
- Services contain the business logic and query via the repository.
- Repositories wrap TypeORM `Repository<T>` via `InjectRepository`.
- Entities are TypeORM table mappings and the API models (no separate domain/ORM split).
- The Postgres connection lives in `DatabaseModule`, not in feature modules.
- Everything is wired through NestJS dependency injection.

## API & Swagger

Swagger UI: **http://localhost:3000/api/docs** (JSON spec at `/api/docs-json`).
OpenAPI tags: `users`, `health`.

### Endpoints

All endpoints are prefixed with `/api/v1`.

| Method | Path                     | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/api/v1/users`          | List all users                       |
| GET    | `/api/v1/users/:id`      | Get a single user by id (404 if n/a) |
| GET    | `/api/v1/health`         | Health check (liveness)              |

Example:

```bash
curl http://localhost:3000/api/v1/users
curl http://localhost:3000/api/v1/users/<uuid>   # 200 if present, 404 if not
curl http://localhost:3000/api/v1/health         # -> 200 { "status": "ok", ... }
```

### Roles & permissions (RBAC)

Authorization is data-driven: routes declare a permission with
`@RequirePermission(...)`, and `PermissionsGuard` checks that permission against
the caller's role on **every** request. There are no hard-coded role checks, so
granting or revoking a permission takes effect immediately without a redeploy.

- A user has exactly one role (`users.role_id`).
- A role has many permissions through the `role_permissions` join table.
- Roles named `admin` and `user` are seeded by the migrations and are marked
  `is_system_role`, so they cannot be renamed or deleted.
- `admin` is seeded with every permission. `user` is seeded with `users:read` only.
- The last role holding the administrative permission (`roles:assign_users`) cannot
  be deleted or stripped of that permission, which prevents locking yourself out.

Run the migrations before using users or roles:

```bash
npm run migration:run
```

To bootstrap the first administrator, set `ADMIN_SUPABASE_USER_ID` in `.env` to the
Supabase auth user UUID before running the migrations. The user must already have a
row in `users` (created by `/auth/register` or `/auth/me` provisioning); the
migration promotes that row to the `admin` role. The variable is optional and only
matters on the first run.

### Error responses

All exceptions go through `AllExceptionsFilter`, which returns a uniform shape:

```json
{
  "status": 404,
  "message": "User with id \"999\" was not found",
  "data": null,
  "meta": null
}
```