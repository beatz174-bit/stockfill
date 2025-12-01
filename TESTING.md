# Testing

Run the unit and component test suite with:

```
npm test
```

For coverage reports:

```
npm run test:coverage
```

## Test utilities

- `src/testUtils/mockDb.ts` provides a lightweight `createMockDb` factory with `MockTable` helpers that mimic Dexie tables used in the app.
- `src/testUtils/stubDownloads.ts` stubs `document.createElement` and `URL.createObjectURL`/`revokeObjectURL` so download paths can be exercised in tests.
